
-- ===================== SPRINT 9: AUDITORIA =====================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade text NOT NULL,
  entidade_id uuid,
  acao text NOT NULL CHECK (acao IN ('create','update','delete','restore')),
  usuario_id uuid,
  descricao text,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entidade ON public.audit_log(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario ON public.audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_read_managers" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Trigger function genérico
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _entidade text := TG_TABLE_NAME;
  _id uuid;
  _acao text;
  _desc text;
  _diff jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _id := (row_to_json(NEW)->>'id')::uuid;
    _acao := 'create';
    _desc := _entidade || ' criado';
    _diff := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    _id := (row_to_json(NEW)->>'id')::uuid;
    _acao := 'update';
    _desc := _entidade || ' atualizado';
    _diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    _id := (row_to_json(OLD)->>'id')::uuid;
    _acao := 'delete';
    _desc := _entidade || ' removido';
    _diff := to_jsonb(OLD);
  END IF;

  INSERT INTO public.audit_log (entidade, entidade_id, acao, usuario_id, descricao, diff)
  VALUES (_entidade, _id, _acao, auth.uid(), _desc, _diff);

  RETURN COALESCE(NEW, OLD);
END $$;

-- Aplica em entidades chave
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['licencas_software','licenca_atribuicoes','contratos','contrato_documentos','empresas','fornecedores','categorias','estoque_consumiveis','ativo_garantias']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger()', t, t);
  END LOOP;
END $$;

-- Movimentações de consumíveis (entrada/saída/ajuste)
CREATE OR REPLACE FUNCTION public.log_consumivel_movimento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _delta int; _tipo text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _delta := NEW.quantidade;
    _tipo := 'consumivel_entrada';
  ELSIF TG_OP = 'UPDATE' THEN
    _delta := NEW.quantidade - OLD.quantidade;
    IF _delta = 0 THEN RETURN NEW; END IF;
    _tipo := CASE WHEN _delta > 0 THEN 'consumivel_entrada' ELSE 'consumivel_saida' END;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.audit_log (entidade, entidade_id, acao, usuario_id, descricao, diff)
  VALUES ('estoque_consumiveis', NEW.id, 'update', auth.uid(),
    _tipo || ' (' || _delta || ') — ' || COALESCE(NEW.item, ''),
    jsonb_build_object('delta', _delta, 'item', NEW.item, 'quantidade', NEW.quantidade));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS log_consumivel_mov ON public.estoque_consumiveis;
CREATE TRIGGER log_consumivel_mov AFTER INSERT OR UPDATE OF quantidade ON public.estoque_consumiveis
  FOR EACH ROW EXECUTE FUNCTION public.log_consumivel_movimento();

-- ===================== SPRINT 10: A3 AGENT =====================

CREATE TABLE IF NOT EXISTS public.agentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  hostname text,
  token_hash text NOT NULL UNIQUE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  ativo_id uuid REFERENCES public.ativos(id) ON DELETE SET NULL,
  ultimo_contato timestamptz,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentes TO authenticated;
GRANT ALL ON public.agentes TO service_role;
ALTER TABLE public.agentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agentes_read" ON public.agentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "agentes_write_admin" ON public.agentes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TABLE IF NOT EXISTS public.agente_inventarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id uuid NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  hostname text,
  usuario_atual text,
  ip text,
  mac text,
  so text,
  so_versao text,
  cpu text,
  ram_mb int,
  disco_total_gb numeric,
  disco_livre_gb numeric,
  coletado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agente_inv_agente ON public.agente_inventarios(agente_id, coletado_em DESC);

GRANT SELECT ON public.agente_inventarios TO authenticated;
GRANT ALL ON public.agente_inventarios TO service_role;
ALTER TABLE public.agente_inventarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agente_inv_read" ON public.agente_inventarios FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.agente_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id uuid NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  payload jsonb,
  ip_origem text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agente_ev_agente ON public.agente_eventos(agente_id, created_at DESC);

GRANT SELECT ON public.agente_eventos TO authenticated;
GRANT ALL ON public.agente_eventos TO service_role;
ALTER TABLE public.agente_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agente_ev_read" ON public.agente_eventos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE OR REPLACE FUNCTION public.agente_online(_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.agentes WHERE id = _id AND ultimo_contato > now() - interval '5 minutes')
$$;

CREATE TRIGGER touch_agentes BEFORE UPDATE ON public.agentes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===================== SPRINT 11: DESCOBERTA =====================

CREATE TABLE IF NOT EXISTS public.dispositivos_descobertos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id uuid REFERENCES public.agentes(id) ON DELETE SET NULL,
  ip text,
  mac text,
  hostname text,
  fabricante text,
  modelo text,
  tipo_sugerido text CHECK (tipo_sugerido IN ('printer','computer','switch','router','ap','unknown')),
  portas_abertas int[],
  estado text NOT NULL DEFAULT 'novo' CHECK (estado IN ('novo','ignorado','aprovado')),
  ativo_id uuid REFERENCES public.ativos(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  descoberto_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_disp_mac ON public.dispositivos_descobertos(mac) WHERE mac IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disp_estado ON public.dispositivos_descobertos(estado);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispositivos_descobertos TO authenticated;
GRANT ALL ON public.dispositivos_descobertos TO service_role;
ALTER TABLE public.dispositivos_descobertos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disp_read" ON public.dispositivos_descobertos FOR SELECT TO authenticated USING (true);
CREATE POLICY "disp_write_managers" ON public.dispositivos_descobertos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER touch_disp BEFORE UPDATE ON public.dispositivos_descobertos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
