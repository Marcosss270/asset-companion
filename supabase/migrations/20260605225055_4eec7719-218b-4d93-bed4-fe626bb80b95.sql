
-- ============ ENUMS ============
ALTER TYPE alerta_tipo ADD VALUE IF NOT EXISTS 'licenca_90d';
ALTER TYPE alerta_tipo ADD VALUE IF NOT EXISTS 'licenca_60d';
ALTER TYPE alerta_tipo ADD VALUE IF NOT EXISTS 'licenca_30d';
ALTER TYPE alerta_tipo ADD VALUE IF NOT EXISTS 'licenca_expirada';
ALTER TYPE alerta_tipo ADD VALUE IF NOT EXISTS 'licenca_excedida';
ALTER TYPE alerta_tipo ADD VALUE IF NOT EXISTS 'contrato_90d';
ALTER TYPE alerta_tipo ADD VALUE IF NOT EXISTS 'contrato_60d';
ALTER TYPE alerta_tipo ADD VALUE IF NOT EXISTS 'contrato_30d';
ALTER TYPE alerta_tipo ADD VALUE IF NOT EXISTS 'contrato_expirado';
ALTER TYPE movimentacao_tipo ADD VALUE IF NOT EXISTS 'diagnostico';

CREATE TYPE licenca_tipo AS ENUM ('perpetua','subscricao','oem','volume','freeware','outra');
CREATE TYPE contrato_categoria AS ENUM ('internet','impressoras','manutencao','software','seguranca','outros');
CREATE TYPE contrato_periodicidade AS ENUM ('mensal','trimestral','semestral','anual','unico');
CREATE TYPE licenca_alvo AS ENUM ('utilizador','ativo','empresa');

-- ============ LICENÇAS ============
CREATE TABLE public.licencas_software (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  fabricante text,
  tipo licenca_tipo NOT NULL DEFAULT 'subscricao',
  chave text,
  quantidade_total integer NOT NULL DEFAULT 1 CHECK (quantidade_total >= 0),
  data_aquisicao date,
  data_validade date,
  valor numeric(14,2),
  moeda text NOT NULL DEFAULT 'AOA',
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  notas text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licencas_software TO authenticated;
GRANT ALL ON public.licencas_software TO service_role;
ALTER TABLE public.licencas_software ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view licencas" ON public.licencas_software FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage licencas" ON public.licencas_software FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_licencas_updated_at BEFORE UPDATE ON public.licencas_software FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.licenca_atribuicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licenca_id uuid NOT NULL REFERENCES public.licencas_software(id) ON DELETE CASCADE,
  tipo_alvo licenca_alvo NOT NULL,
  alvo_id uuid NOT NULL,
  alvo_label text,
  atribuido_em timestamptz NOT NULL DEFAULT now(),
  atribuido_por uuid REFERENCES auth.users(id),
  revogado_em timestamptz,
  revogado_por uuid REFERENCES auth.users(id),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_licenca_atrib_licenca ON public.licenca_atribuicoes(licenca_id);
CREATE INDEX idx_licenca_atrib_ativas ON public.licenca_atribuicoes(licenca_id) WHERE revogado_em IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenca_atribuicoes TO authenticated;
GRANT ALL ON public.licenca_atribuicoes TO service_role;
ALTER TABLE public.licenca_atribuicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view atrib" ON public.licenca_atribuicoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage atrib" ON public.licenca_atribuicoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE OR REPLACE FUNCTION public.licenca_utilizadas(_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.licenca_atribuicoes WHERE licenca_id = _id AND revogado_em IS NULL
$$;

CREATE OR REPLACE FUNCTION public.check_licenca_capacidade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _total int; _ativas int;
BEGIN
  IF NEW.revogado_em IS NOT NULL THEN RETURN NEW; END IF;
  SELECT quantidade_total INTO _total FROM public.licencas_software WHERE id = NEW.licenca_id;
  SELECT COUNT(*) INTO _ativas FROM public.licenca_atribuicoes
    WHERE licenca_id = NEW.licenca_id AND revogado_em IS NULL AND id <> COALESCE(NEW.id,'00000000-0000-0000-0000-000000000000'::uuid);
  IF (_ativas + 1) > _total THEN
    RAISE EXCEPTION 'Capacidade da licença excedida (% de %)', _ativas+1, _total;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_licenca_capacidade BEFORE INSERT OR UPDATE ON public.licenca_atribuicoes
  FOR EACH ROW EXECUTE FUNCTION public.check_licenca_capacidade();

-- ============ CONTRATOS ============
CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  categoria contrato_categoria NOT NULL DEFAULT 'outros',
  tipo_servico text,
  valor numeric(14,2) NOT NULL DEFAULT 0,
  moeda text NOT NULL DEFAULT 'AOA',
  periodicidade contrato_periodicidade NOT NULL DEFAULT 'mensal',
  data_inicio date,
  data_vencimento date,
  renovacao_automatica boolean NOT NULL DEFAULT false,
  notas text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view contratos" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage contratos" ON public.contratos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.contrato_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  path text NOT NULL,
  nome_ficheiro text NOT NULL,
  tamanho bigint,
  mime text,
  enviado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contrato_id, versao)
);
CREATE INDEX idx_contrato_doc_contrato ON public.contrato_documentos(contrato_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_documentos TO authenticated;
GRANT ALL ON public.contrato_documentos TO service_role;
ALTER TABLE public.contrato_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view doc" ON public.contrato_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage doc" ON public.contrato_documentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- ============ IMPRESSORAS ============
ALTER TABLE public.impressoras
  ADD COLUMN IF NOT EXISTS ultimo_erro text,
  ADD COLUMN IF NOT EXISTS ultimo_erro_em timestamptz;

-- ============ Função geradora de alertas (licenças + contratos) ============
CREATE OR REPLACE FUNCTION public.gerar_alertas_licencas_contratos()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int := 0; r record;
BEGIN
  -- Licenças
  FOR r IN
    SELECT id, nome, data_validade, quantidade_total, public.licenca_utilizadas(id) AS usadas
    FROM public.licencas_software
  LOOP
    IF r.data_validade IS NOT NULL THEN
      IF r.data_validade < CURRENT_DATE THEN
        INSERT INTO public.alertas (tipo, titulo, mensagem)
        SELECT 'licenca_expirada','Licença expirada — '||r.nome,'Validade: '||r.data_validade
        WHERE NOT EXISTS (SELECT 1 FROM public.alertas WHERE titulo='Licença expirada — '||r.nome AND status='ativo');
        _n := _n+1;
      ELSIF r.data_validade <= CURRENT_DATE + 30 THEN
        INSERT INTO public.alertas (tipo, titulo, mensagem)
        SELECT 'licenca_30d','Licença vence em 30 dias — '||r.nome,'Validade: '||r.data_validade
        WHERE NOT EXISTS (SELECT 1 FROM public.alertas WHERE titulo='Licença vence em 30 dias — '||r.nome AND status='ativo');
        _n := _n+1;
      ELSIF r.data_validade <= CURRENT_DATE + 60 THEN
        INSERT INTO public.alertas (tipo, titulo, mensagem)
        SELECT 'licenca_60d','Licença vence em 60 dias — '||r.nome,'Validade: '||r.data_validade
        WHERE NOT EXISTS (SELECT 1 FROM public.alertas WHERE titulo='Licença vence em 60 dias — '||r.nome AND status='ativo');
        _n := _n+1;
      ELSIF r.data_validade <= CURRENT_DATE + 90 THEN
        INSERT INTO public.alertas (tipo, titulo, mensagem)
        SELECT 'licenca_90d','Licença vence em 90 dias — '||r.nome,'Validade: '||r.data_validade
        WHERE NOT EXISTS (SELECT 1 FROM public.alertas WHERE titulo='Licença vence em 90 dias — '||r.nome AND status='ativo');
        _n := _n+1;
      END IF;
    END IF;
    IF r.usadas > r.quantidade_total THEN
      INSERT INTO public.alertas (tipo, titulo, mensagem)
      SELECT 'licenca_excedida','Licença excedida — '||r.nome, r.usadas||' usos para '||r.quantidade_total||' adquiridos'
      WHERE NOT EXISTS (SELECT 1 FROM public.alertas WHERE titulo='Licença excedida — '||r.nome AND status='ativo');
      _n := _n+1;
    END IF;
  END LOOP;

  -- Contratos
  FOR r IN SELECT id, nome, data_vencimento FROM public.contratos WHERE data_vencimento IS NOT NULL LOOP
    IF r.data_vencimento < CURRENT_DATE THEN
      INSERT INTO public.alertas (tipo, titulo, mensagem)
      SELECT 'contrato_expirado','Contrato expirado — '||r.nome,'Venceu em '||r.data_vencimento
      WHERE NOT EXISTS (SELECT 1 FROM public.alertas WHERE titulo='Contrato expirado — '||r.nome AND status='ativo');
      _n := _n+1;
    ELSIF r.data_vencimento <= CURRENT_DATE + 30 THEN
      INSERT INTO public.alertas (tipo, titulo, mensagem)
      SELECT 'contrato_30d','Contrato vence em 30 dias — '||r.nome,'Vencimento: '||r.data_vencimento
      WHERE NOT EXISTS (SELECT 1 FROM public.alertas WHERE titulo='Contrato vence em 30 dias — '||r.nome AND status='ativo');
      _n := _n+1;
    ELSIF r.data_vencimento <= CURRENT_DATE + 60 THEN
      INSERT INTO public.alertas (tipo, titulo, mensagem)
      SELECT 'contrato_60d','Contrato vence em 60 dias — '||r.nome,'Vencimento: '||r.data_vencimento
      WHERE NOT EXISTS (SELECT 1 FROM public.alertas WHERE titulo='Contrato vence em 60 dias — '||r.nome AND status='ativo');
      _n := _n+1;
    ELSIF r.data_vencimento <= CURRENT_DATE + 90 THEN
      INSERT INTO public.alertas (tipo, titulo, mensagem)
      SELECT 'contrato_90d','Contrato vence em 90 dias — '||r.nome,'Vencimento: '||r.data_vencimento
      WHERE NOT EXISTS (SELECT 1 FROM public.alertas WHERE titulo='Contrato vence em 90 dias — '||r.nome AND status='ativo');
      _n := _n+1;
    END IF;
  END LOOP;

  RETURN _n;
END $$;
