
-- 1. Empresas
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ativa',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view empresas" ON public.empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage empresas" ON public.empresas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.empresas (nome, sigla) VALUES
 ('PROREAL','PR'),
 ('ARQUITECURA - A3','ARQA3'),
 ('ACADEMIA - A3','ACADA3'),
 ('LIQUIDEZ','LQ'),
 ('PSICOLOGIA VERDE','PV'),
 ('MAGNÉTICO','MG');

-- 2. Add empresa_id and custo
ALTER TABLE public.ativos ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.ativos ADD COLUMN custo numeric;
ALTER TABLE public.estoque_consumiveis ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

-- backfill existing ativos with PROREAL (default)
UPDATE public.ativos SET empresa_id = (SELECT id FROM public.empresas WHERE sigla='PR') WHERE empresa_id IS NULL;
ALTER TABLE public.ativos ALTER COLUMN empresa_id SET NOT NULL;

-- 3. codigo_sequencias: include empresa_sigla
ALTER TABLE public.codigo_sequencias ADD COLUMN empresa_sigla text NOT NULL DEFAULT '';
ALTER TABLE public.codigo_sequencias DROP CONSTRAINT codigo_sequencias_pkey;
ALTER TABLE public.codigo_sequencias ADD PRIMARY KEY (empresa_sigla, prefixo, ano);

-- 4. Update gerar_codigo_unico - new signature
DROP FUNCTION IF EXISTS public.gerar_codigo_unico(uuid);
CREATE OR REPLACE FUNCTION public.gerar_codigo_unico(_categoria_id uuid, _empresa_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _prefixo text; _sigla text; _ano int := EXTRACT(YEAR FROM now()); _numero int;
BEGIN
  SELECT codigo_prefixo INTO _prefixo FROM public.categorias WHERE id = _categoria_id;
  IF _prefixo IS NULL THEN RAISE EXCEPTION 'Categoria não encontrada'; END IF;
  SELECT sigla INTO _sigla FROM public.empresas WHERE id = _empresa_id;
  IF _sigla IS NULL THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;

  INSERT INTO public.codigo_sequencias (empresa_sigla, prefixo, ano, ultimo_numero)
  VALUES (_sigla, _prefixo, _ano, 1)
  ON CONFLICT (empresa_sigla, prefixo, ano) DO UPDATE SET ultimo_numero = codigo_sequencias.ultimo_numero + 1
  RETURNING ultimo_numero INTO _numero;

  RETURN _sigla || '-' || _prefixo || '-' || _ano || '-' || LPAD(_numero::text, 4, '0');
END;$$;

CREATE OR REPLACE FUNCTION public.set_ativo_codigo_unico() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.codigo_unico IS NULL OR NEW.codigo_unico = '' THEN
    NEW.codigo_unico := public.gerar_codigo_unico(NEW.categoria_id, NEW.empresa_id);
  END IF;
  RETURN NEW;
END;$$;

-- 5. Movimentacao tipo - add 'edicao' to enum
ALTER TYPE public.movimentacao_tipo ADD VALUE IF NOT EXISTS 'edicao';

-- 6. Update log_ativo_alteracao to also log name + empresa changes
CREATE OR REPLACE FUNCTION public.log_ativo_alteracao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.movimentacoes (ativo_id, tipo, status_anterior, status_novo, descricao, usuario_id)
    VALUES (NEW.id, 'mudanca_status', OLD.status, NEW.status, 'Status alterado', auth.uid());
  END IF;
  IF NEW.responsavel IS DISTINCT FROM OLD.responsavel THEN
    INSERT INTO public.movimentacoes (ativo_id, tipo, responsavel_anterior, responsavel_novo, descricao, usuario_id)
    VALUES (NEW.id, 'transferencia', OLD.responsavel, NEW.responsavel, 'Responsável alterado', auth.uid());
  END IF;
  IF NEW.localizacao IS DISTINCT FROM OLD.localizacao THEN
    INSERT INTO public.movimentacoes (ativo_id, tipo, localizacao_anterior, localizacao_nova, descricao, usuario_id)
    VALUES (NEW.id, 'localizacao', OLD.localizacao, NEW.localizacao, 'Localização alterada', auth.uid());
  END IF;
  RETURN NEW;
END;$$;

-- Separate trigger for nome change (uses new enum value 'edicao' which must be committed first)
CREATE OR REPLACE FUNCTION public.log_ativo_nome_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.nome IS DISTINCT FROM OLD.nome THEN
    INSERT INTO public.movimentacoes (ativo_id, tipo, descricao, usuario_id)
    VALUES (NEW.id, 'edicao'::movimentacao_tipo, 'Nome alterado: "' || OLD.nome || '" → "' || NEW.nome || '"', auth.uid());
  END IF;
  RETURN NEW;
END;$$;

-- Drop existing trigger (if any) and recreate
DROP TRIGGER IF EXISTS trg_log_ativo_alteracao ON public.ativos;
DROP TRIGGER IF EXISTS trg_log_ativo_nome ON public.ativos;
DROP TRIGGER IF EXISTS trg_log_ativo_cadastro ON public.ativos;
DROP TRIGGER IF EXISTS trg_set_ativo_codigo ON public.ativos;

CREATE TRIGGER trg_set_ativo_codigo BEFORE INSERT ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.set_ativo_codigo_unico();
CREATE TRIGGER trg_log_ativo_cadastro AFTER INSERT ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.log_ativo_cadastro();
CREATE TRIGGER trg_log_ativo_alteracao AFTER UPDATE ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.log_ativo_alteracao();
CREATE TRIGGER trg_log_ativo_nome AFTER UPDATE OF nome ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.log_ativo_nome_change();

-- 7. Remove 'baixado' from ativo_status enum
UPDATE public.ativos SET status = 'obsoleto' WHERE status = 'baixado';
ALTER TYPE public.ativo_status RENAME TO ativo_status_old;
CREATE TYPE public.ativo_status AS ENUM ('disponivel','em_uso','em_manutencao','danificado','obsoleto');
ALTER TABLE public.ativos ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.ativos ALTER COLUMN status TYPE public.ativo_status USING status::text::public.ativo_status;
ALTER TABLE public.ativos ALTER COLUMN status SET DEFAULT 'disponivel'::public.ativo_status;
ALTER TABLE public.movimentacoes ALTER COLUMN status_anterior TYPE public.ativo_status USING status_anterior::text::public.ativo_status;
ALTER TABLE public.movimentacoes ALTER COLUMN status_novo TYPE public.ativo_status USING status_novo::text::public.ativo_status;
DROP TYPE public.ativo_status_old;

-- 8. Update consumiveis manage policy to also allow nullable empresa
-- (already permissive, no change needed)

-- 9. Realtime for empresas
ALTER PUBLICATION supabase_realtime ADD TABLE public.empresas;
