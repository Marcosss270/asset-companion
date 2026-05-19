
-- ============ ENUMS ============
ALTER TYPE public.movimentacao_tipo ADD VALUE IF NOT EXISTS 'alerta';
ALTER TYPE public.movimentacao_tipo ADD VALUE IF NOT EXISTS 'leitura_snmp';
ALTER TYPE public.alerta_tipo ADD VALUE IF NOT EXISTS 'toner_baixo';
ALTER TYPE public.alerta_tipo ADD VALUE IF NOT EXISTS 'toner_critico';
ALTER TYPE public.alerta_tipo ADD VALUE IF NOT EXISTS 'papel_baixo';
ALTER TYPE public.alerta_tipo ADD VALUE IF NOT EXISTS 'impressora_offline';
ALTER TYPE public.alerta_tipo ADD VALUE IF NOT EXISTS 'consumo_anomalo';

-- ============ MOVIMENTACOES metadata ============
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS metadata jsonb;

-- ============ IMPRESSORAS ============
CREATE TABLE IF NOT EXISTS public.impressoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo_id uuid NOT NULL UNIQUE,
  ip text NOT NULL,
  porta_snmp integer NOT NULL DEFAULT 161,
  comunidade_snmp text NOT NULL DEFAULT 'public',
  modelo text,
  status_online boolean NOT NULL DEFAULT false,
  ultima_leitura_em timestamptz,
  contador_inicial integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.impressoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view impressoras" ON public.impressoras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert impressoras" ON public.impressoras FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update impressoras" ON public.impressoras FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete impressoras" ON public.impressoras FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_impressoras_updated_at BEFORE UPDATE ON public.impressoras FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ LEITURAS ============
CREATE TABLE IF NOT EXISTS public.impressora_leituras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  impressora_id uuid NOT NULL REFERENCES public.impressoras(id) ON DELETE CASCADE,
  toner_preto integer,
  toner_ciano integer,
  toner_magenta integer,
  toner_amarelo integer,
  papel_pct integer,
  online boolean NOT NULL DEFAULT true,
  erros_hw text,
  contador_impressoes integer,
  capturado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leituras_impressora_data ON public.impressora_leituras(impressora_id, capturado_em DESC);
ALTER TABLE public.impressora_leituras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view leituras" ON public.impressora_leituras FOR SELECT TO authenticated USING (true);
-- INSERT via service role do endpoint público (sem policy authenticated)

-- ============ SUGESTOES COMPRA ============
CREATE TABLE IF NOT EXISTS public.sugestoes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  ativo_id uuid REFERENCES public.ativos(id) ON DELETE SET NULL,
  item text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  urgencia text NOT NULL DEFAULT 'media',
  motivo text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sugestoes_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view sugestoes" ON public.sugestoes_compra FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert sugestoes" ON public.sugestoes_compra FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update sugestoes" ON public.sugestoes_compra FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete sugestoes" ON public.sugestoes_compra FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_sugestoes_updated_at BEFORE UPDATE ON public.sugestoes_compra FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ TRIGGER DE AUTOMAÇÃO ============
CREATE OR REPLACE FUNCTION public.process_leitura_snmp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ativo_id uuid;
  _empresa_id uuid;
  _nome text;
  _min_toner integer;
  _cor text;
BEGIN
  -- Atualiza impressora
  UPDATE public.impressoras
  SET status_online = NEW.online,
      ultima_leitura_em = NEW.capturado_em,
      updated_at = now()
  WHERE id = NEW.impressora_id
  RETURNING ativo_id INTO _ativo_id;

  IF _ativo_id IS NULL THEN RETURN NEW; END IF;

  SELECT a.empresa_id, a.nome INTO _empresa_id, _nome
  FROM public.ativos a WHERE a.id = _ativo_id;

  -- log de leitura no histórico do ativo
  INSERT INTO public.movimentacoes (ativo_id, tipo, descricao, metadata)
  VALUES (_ativo_id, 'leitura_snmp',
    'Leitura SNMP capturada' || CASE WHEN NEW.online THEN '' ELSE ' — OFFLINE' END,
    jsonb_build_object(
      'toner_preto', NEW.toner_preto,
      'toner_ciano', NEW.toner_ciano,
      'toner_magenta', NEW.toner_magenta,
      'toner_amarelo', NEW.toner_amarelo,
      'papel_pct', NEW.papel_pct,
      'online', NEW.online,
      'contador', NEW.contador_impressoes
    )
  );

  -- Toner: menor valor entre cores
  _min_toner := LEAST(
    COALESCE(NEW.toner_preto, 100),
    COALESCE(NEW.toner_ciano, 100),
    COALESCE(NEW.toner_magenta, 100),
    COALESCE(NEW.toner_amarelo, 100)
  );

  IF _min_toner < 20 THEN
    INSERT INTO public.alertas (tipo, titulo, mensagem, ativo_id)
    VALUES ('toner_critico', 'Toner crítico — ' || _nome,
      'Toner em ' || _min_toner || '%. Substituição urgente.', _ativo_id);
    INSERT INTO public.sugestoes_compra (empresa_id, ativo_id, item, quantidade, urgencia, motivo)
    VALUES (_empresa_id, _ativo_id, 'Toner para ' || COALESCE(_nome, 'impressora'),
      1, 'critica', 'Toner crítico (' || _min_toner || '%) detectado via SNMP');
  ELSIF _min_toner < 40 THEN
    INSERT INTO public.alertas (tipo, titulo, mensagem, ativo_id)
    VALUES ('toner_baixo', 'Toner baixo — ' || _nome,
      'Toner em ' || _min_toner || '%. Considere repor.', _ativo_id);
    INSERT INTO public.sugestoes_compra (empresa_id, ativo_id, item, quantidade, urgencia, motivo)
    VALUES (_empresa_id, _ativo_id, 'Toner para ' || COALESCE(_nome, 'impressora'),
      1, 'media', 'Toner em ' || _min_toner || '% via SNMP');
  END IF;

  IF NEW.papel_pct IS NOT NULL AND NEW.papel_pct < 25 THEN
    INSERT INTO public.alertas (tipo, titulo, mensagem, ativo_id)
    VALUES ('papel_baixo', 'Papel baixo — ' || _nome,
      'Bandeja com ' || NEW.papel_pct || '% de papel.', _ativo_id);
  END IF;

  IF NOT NEW.online THEN
    INSERT INTO public.alertas (tipo, titulo, mensagem, ativo_id)
    VALUES ('impressora_offline', 'Impressora offline — ' || _nome,
      COALESCE('Erros: ' || NEW.erros_hw, 'Sem resposta na rede.'), _ativo_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_leitura_snmp ON public.impressora_leituras;
CREATE TRIGGER trg_process_leitura_snmp
AFTER INSERT ON public.impressora_leituras
FOR EACH ROW EXECUTE FUNCTION public.process_leitura_snmp();
