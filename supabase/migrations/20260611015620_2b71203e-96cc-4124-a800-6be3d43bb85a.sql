
-- ENUMS
DO $$ BEGIN CREATE TYPE org_estado AS ENUM ('ativa','inativa','suspensa'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE assinatura_estado AS ENUM ('trial','ativa','suspensa','cancelada','expirada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE assinatura_ciclo AS ENUM ('mensal','anual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pagamento_estado AS ENUM ('pendente','pago','falhou','estornado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PLANOS
CREATE TABLE public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, slug text NOT NULL UNIQUE,
  preco_mensal numeric(10,2) NOT NULL DEFAULT 0,
  preco_anual numeric(10,2) NOT NULL DEFAULT 0,
  limite_ativos int, limite_usuarios int,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true, ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.planos TO authenticated, anon;
GRANT ALL ON public.planos TO service_role;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos_select" ON public.planos FOR SELECT USING (true);

INSERT INTO public.planos (nome, slug, preco_mensal, preco_anual, limite_ativos, limite_usuarios, features, ordem) VALUES
('Starter','starter',29,290,100,2,'{"snmp":false,"agent":false,"descoberta":false,"contratos":false,"garantias":true,"licencas":false,"relatorios_avancados":false,"suporte_prioritario":false}'::jsonb,1),
('Pro','pro',99,990,1000,20,'{"snmp":true,"agent":false,"descoberta":false,"contratos":true,"garantias":true,"licencas":true,"relatorios_avancados":true,"suporte_prioritario":false}'::jsonb,2),
('Enterprise','enterprise',299,2990,NULL,NULL,'{"snmp":true,"agent":true,"descoberta":true,"contratos":true,"garantias":true,"licencas":true,"relatorios_avancados":true,"suporte_prioritario":true}'::jsonb,3);

-- ORGANIZACOES
CREATE TABLE public.organizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, sigla text NOT NULL UNIQUE,
  logo_url text, estado org_estado NOT NULL DEFAULT 'ativa',
  plano_id uuid REFERENCES public.planos(id),
  is_tenant_master boolean NOT NULL DEFAULT false,
  moeda text NOT NULL DEFAULT 'EUR', pais text, setor text,
  onboarding_completo boolean NOT NULL DEFAULT false,
  onboarding_passos jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizacoes TO authenticated;
GRANT ALL ON public.organizacoes TO service_role;
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;

INSERT INTO public.organizacoes (nome, sigla, estado, is_tenant_master, plano_id, onboarding_completo, pais, moeda)
SELECT 'Grupo A3', 'A3', 'ativa', true, p.id, true, 'PT', 'EUR'
FROM public.planos p WHERE p.slug='enterprise';

-- profiles + user_roles primeiro (para que as funções helper compilem)
ALTER TABLE public.profiles ADD COLUMN organizacao_id uuid REFERENCES public.organizacoes(id);
UPDATE public.profiles SET organizacao_id = (SELECT id FROM public.organizacoes WHERE sigla='A3');
ALTER TABLE public.profiles ALTER COLUMN organizacao_id SET NOT NULL;

ALTER TABLE public.user_roles ADD COLUMN organizacao_id uuid REFERENCES public.organizacoes(id);
UPDATE public.user_roles SET organizacao_id = (SELECT id FROM public.organizacoes WHERE sigla='A3');
ALTER TABLE public.user_roles ALTER COLUMN organizacao_id SET NOT NULL;

INSERT INTO public.user_roles (user_id, role, organizacao_id)
SELECT DISTINCT ur.user_id, 'tenant_master'::app_role, (SELECT id FROM public.organizacoes WHERE sigla='A3')
FROM public.user_roles ur WHERE ur.role = 'admin'
ON CONFLICT DO NOTHING;

-- HELPERS
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT organizacao_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_master(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.organizacoes o ON o.id = ur.organizacao_id
    WHERE ur.user_id = _uid AND ur.role = 'tenant_master' AND o.is_tenant_master
  )
$$;

CREATE OR REPLACE FUNCTION public.has_org_access(_uid uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_tenant_master(_uid)
      OR _org = (SELECT organizacao_id FROM public.profiles WHERE id = _uid)
$$;

CREATE POLICY "organizacoes_select" ON public.organizacoes FOR SELECT
USING (public.is_tenant_master(auth.uid()) OR id = public.current_org_id());
CREATE POLICY "organizacoes_insert" ON public.organizacoes FOR INSERT
WITH CHECK (public.is_tenant_master(auth.uid()));
CREATE POLICY "organizacoes_update" ON public.organizacoes FOR UPDATE
USING (public.is_tenant_master(auth.uid()) OR id = public.current_org_id())
WITH CHECK (public.is_tenant_master(auth.uid()) OR id = public.current_org_id());
CREATE POLICY "organizacoes_delete" ON public.organizacoes FOR DELETE
USING (public.is_tenant_master(auth.uid()));

-- Adiciona organizacao_id às 23 tabelas
DO $$
DECLARE t text;
DECLARE tbls text[] := ARRAY[
  'ativos','empresas','fornecedores','fornecedor_produtos','categorias','estoque_consumiveis',
  'impressoras','impressora_leituras','contratos','contrato_documentos','licencas_software',
  'licenca_atribuicoes','ativo_garantias','manutencoes','movimentacoes','alertas','sugestoes_compra',
  'agentes','agente_inventarios','agente_eventos','dispositivos_descobertos','audit_log','configuracoes'
];
DECLARE _org uuid;
BEGIN
  SELECT id INTO _org FROM public.organizacoes WHERE sigla='A3';
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organizacao_id uuid REFERENCES public.organizacoes(id)', t);
    EXECUTE format('UPDATE public.%I SET organizacao_id = %L WHERE organizacao_id IS NULL', t, _org);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organizacao_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_org ON public.%I (organizacao_id)', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.set_organizacao_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.organizacao_id IS NULL THEN NEW.organizacao_id := public.current_org_id(); END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
DECLARE tbls text[] := ARRAY[
  'ativos','empresas','fornecedores','fornecedor_produtos','categorias','estoque_consumiveis',
  'impressoras','impressora_leituras','contratos','contrato_documentos','licencas_software',
  'licenca_atribuicoes','ativo_garantias','manutencoes','movimentacoes','alertas','sugestoes_compra',
  'agentes','agente_inventarios','agente_eventos','dispositivos_descobertos','audit_log','configuracoes'
];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_org_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_org_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_organizacao_id()', t);
  END LOOP;
END $$;

-- Reescreve RLS multi-tenant
DO $$
DECLARE r record;
DECLARE tbls text[] := ARRAY[
  'ativos','empresas','fornecedores','fornecedor_produtos','categorias','estoque_consumiveis',
  'impressoras','impressora_leituras','contratos','contrato_documentos','licencas_software',
  'licenca_atribuicoes','ativo_garantias','manutencoes','movimentacoes','alertas','sugestoes_compra',
  'agentes','agente_inventarios','agente_eventos','dispositivos_descobertos','audit_log','configuracoes'
];
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "org_select" ON public.%I FOR SELECT USING (public.has_org_access(auth.uid(), organizacao_id))', t);
    EXECUTE format('CREATE POLICY "org_insert" ON public.%I FOR INSERT WITH CHECK (public.has_org_access(auth.uid(), organizacao_id))', t);
    EXECUTE format('CREATE POLICY "org_update" ON public.%I FOR UPDATE USING (public.has_org_access(auth.uid(), organizacao_id))', t);
    EXECUTE format($f$CREATE POLICY "org_delete" ON public.%I FOR DELETE USING (public.has_org_access(auth.uid(), organizacao_id) AND (public.has_role(auth.uid(),'admin'::app_role) OR public.is_tenant_master(auth.uid())))$f$, t);
  END LOOP;
END $$;

-- ORG ACCESS LOG
CREATE TABLE public.org_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organizacao_id uuid REFERENCES public.organizacoes(id),
  acao text NOT NULL, ip text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.org_access_log TO authenticated;
GRANT ALL ON public.org_access_log TO service_role;
ALTER TABLE public.org_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_tenant_master" ON public.org_access_log FOR SELECT USING (public.is_tenant_master(auth.uid()));
CREATE POLICY "logs_insert_self" ON public.org_access_log FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE OR REPLACE FUNCTION public.switch_organization(_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_tenant_master(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas tenant master pode trocar de organização';
  END IF;
  UPDATE public.profiles SET organizacao_id = _org_id WHERE id = auth.uid();
  INSERT INTO public.org_access_log (usuario_id, organizacao_id, acao) VALUES (auth.uid(), _org_id, 'switch');
END $$;

-- ASSINATURAS
CREATE TABLE public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos(id),
  ciclo assinatura_ciclo NOT NULL DEFAULT 'mensal',
  estado assinatura_estado NOT NULL DEFAULT 'trial',
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_renovacao date, valor numeric(10,2) NOT NULL DEFAULT 0, trial_fim date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_assinatura_ativa_por_org ON public.assinaturas (organizacao_id) WHERE estado IN ('trial','ativa','suspensa');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinaturas TO authenticated;
GRANT ALL ON public.assinaturas TO service_role;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ass_select" ON public.assinaturas FOR SELECT USING (public.has_org_access(auth.uid(), organizacao_id));
CREATE POLICY "ass_master_all" ON public.assinaturas FOR ALL USING (public.is_tenant_master(auth.uid())) WITH CHECK (public.is_tenant_master(auth.uid()));

INSERT INTO public.assinaturas (organizacao_id, plano_id, ciclo, estado, valor, data_renovacao)
SELECT o.id, o.plano_id, 'anual', 'ativa', 2990, CURRENT_DATE + INTERVAL '1 year'
FROM public.organizacoes o WHERE o.sigla='A3';

CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id uuid NOT NULL REFERENCES public.assinaturas(id) ON DELETE CASCADE,
  valor numeric(10,2) NOT NULL,
  estado pagamento_estado NOT NULL DEFAULT 'pendente',
  metodo text NOT NULL DEFAULT 'manual',
  pago_em timestamptz, referencia text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pag_select" ON public.pagamentos FOR SELECT
USING (EXISTS (SELECT 1 FROM public.assinaturas a WHERE a.id = assinatura_id AND public.has_org_access(auth.uid(), a.organizacao_id)));
CREATE POLICY "pag_master_all" ON public.pagamentos FOR ALL USING (public.is_tenant_master(auth.uid())) WITH CHECK (public.is_tenant_master(auth.uid()));

CREATE TABLE public.departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome text NOT NULL, codigo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departamentos TO authenticated;
GRANT ALL ON public.departamentos TO service_role;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dep_all" ON public.departamentos FOR ALL
USING (public.has_org_access(auth.uid(), organizacao_id))
WITH CHECK (public.has_org_access(auth.uid(), organizacao_id));
CREATE TRIGGER set_org_id BEFORE INSERT ON public.departamentos FOR EACH ROW EXECUTE FUNCTION public.set_organizacao_id();

CREATE TABLE public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome text NOT NULL, codigo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centros_custo TO authenticated;
GRANT ALL ON public.centros_custo TO service_role;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_all" ON public.centros_custo FOR ALL
USING (public.has_org_access(auth.uid(), organizacao_id))
WITH CHECK (public.has_org_access(auth.uid(), organizacao_id));
CREATE TRIGGER set_org_id BEFORE INSERT ON public.centros_custo FOR EACH ROW EXECUTE FUNCTION public.set_organizacao_id();

CREATE OR REPLACE FUNCTION public.org_pode_recurso(_org uuid, _feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE((p.features ->> _feature)::boolean, false)
  FROM public.organizacoes o JOIN public.planos p ON p.id = o.plano_id WHERE o.id = _org
$$;

CREATE OR REPLACE FUNCTION public.check_limite_ativos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _limite int; _atual int;
BEGIN
  SELECT p.limite_ativos INTO _limite
  FROM public.organizacoes o JOIN public.planos p ON p.id = o.plano_id WHERE o.id = NEW.organizacao_id;
  IF _limite IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO _atual FROM public.ativos WHERE organizacao_id = NEW.organizacao_id;
  IF _atual >= _limite THEN
    RAISE EXCEPTION 'Limite de ativos do plano atingido (%/%)', _atual, _limite;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tr_limite_ativos BEFORE INSERT ON public.ativos FOR EACH ROW EXECUTE FUNCTION public.check_limite_ativos();

CREATE OR REPLACE FUNCTION public.criar_assinatura_trial(_org uuid, _plano uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.assinaturas (organizacao_id, plano_id, ciclo, estado, trial_fim, data_renovacao, valor)
  VALUES (_org, _plano, 'mensal', 'trial', CURRENT_DATE + 14, CURRENT_DATE + 14,
    (SELECT preco_mensal FROM public.planos WHERE id = _plano))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.org_checklist(_org uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object(
    'empresa', (SELECT onboarding_completo FROM public.organizacoes WHERE id = _org),
    'usuarios', (SELECT COUNT(*) > 1 FROM public.profiles WHERE organizacao_id = _org),
    'ativos', (SELECT COUNT(*) > 0 FROM public.ativos WHERE organizacao_id = _org),
    'fornecedores', (SELECT COUNT(*) > 0 FROM public.fornecedores WHERE organizacao_id = _org),
    'relatorio', false
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _is_first BOOLEAN; _org_id uuid;
BEGIN
  SELECT id INTO _org_id FROM public.organizacoes WHERE sigla='A3' LIMIT 1;
  INSERT INTO public.profiles (id, nome, email, organizacao_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email, _org_id);
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first;
  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role, organizacao_id) VALUES (NEW.id, 'tenant_master', _org_id);
    INSERT INTO public.user_roles (user_id, role, organizacao_id) VALUES (NEW.id, 'admin', _org_id);
  ELSE
    INSERT INTO public.user_roles (user_id, role, organizacao_id) VALUES (NEW.id, 'viewer', _org_id);
  END IF;
  RETURN NEW;
END $$;
