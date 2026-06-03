
-- Sprint 3: empresas.padrao + seeds + branding policies
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS padrao boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS empresas_padrao_unica ON public.empresas (padrao) WHERE padrao = true;

INSERT INTO public.empresas (nome, sigla, status) VALUES
  ('PROREAL', 'PR', 'ativa'),
  ('ARQUITETURA A3', 'ARQA3', 'ativa'),
  ('ACADEMIA A3', 'ACADA3', 'ativa'),
  ('LIQUIDEZ', 'LQ', 'ativa'),
  ('PSICOLOGIA VERDE', 'PV', 'ativa'),
  ('MAGNÉTICO', 'MG', 'ativa')
ON CONFLICT DO NOTHING;

-- Storage policies for branding bucket (admins write, all authenticated read)
CREATE POLICY "Admins manage branding"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read branding"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'branding');

-- Sprint 5: ativo_garantias table
CREATE TABLE public.ativo_garantias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo_id uuid NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  fornecedor_id uuid,
  nota text,
  tipo text NOT NULL DEFAULT 'original',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ativo_garantias TO authenticated;
GRANT ALL ON public.ativo_garantias TO service_role;

ALTER TABLE public.ativo_garantias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view garantias" ON public.ativo_garantias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert garantias" ON public.ativo_garantias
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update garantias" ON public.ativo_garantias
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete garantias" ON public.ativo_garantias
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_garantias_ativo ON public.ativo_garantias(ativo_id);
CREATE INDEX idx_garantias_fim ON public.ativo_garantias(data_fim);

-- Saúde do ativo (novo/bom/regular/critico)
CREATE OR REPLACE FUNCTION public.saude_ativo(_ativo_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _idade_meses int;
  _manut_count int;
  _status text;
  _garantia_ativa boolean;
BEGIN
  SELECT
    GREATEST(0, EXTRACT(YEAR FROM age(now(), COALESCE(data_compra, created_at)))*12 + EXTRACT(MONTH FROM age(now(), COALESCE(data_compra, created_at))))::int,
    status::text
  INTO _idade_meses, _status
  FROM public.ativos WHERE id = _ativo_id;

  IF _idade_meses IS NULL THEN RETURN 'bom'; END IF;

  SELECT COUNT(*) INTO _manut_count FROM public.manutencoes WHERE ativo_id = _ativo_id;
  SELECT EXISTS(SELECT 1 FROM public.ativo_garantias WHERE ativo_id = _ativo_id AND data_fim >= CURRENT_DATE)
    OR EXISTS(SELECT 1 FROM public.ativos WHERE id = _ativo_id AND garantia_ate >= CURRENT_DATE)
    INTO _garantia_ativa;

  IF _status IN ('manutencao','baixado') OR _manut_count >= 5 OR _idade_meses >= 84 THEN
    RETURN 'critico';
  ELSIF _manut_count >= 3 OR _idade_meses >= 60 THEN
    RETURN 'regular';
  ELSIF _idade_meses <= 6 AND _garantia_ativa THEN
    RETURN 'novo';
  ELSE
    RETURN 'bom';
  END IF;
END;
$$;

-- Migra coluna existente ativos.garantia_ate para ativo_garantias quando houver
INSERT INTO public.ativo_garantias (ativo_id, data_inicio, data_fim, tipo, nota)
SELECT id, COALESCE(data_compra, created_at::date), garantia_ate, 'original', 'Migrado de ativos.garantia_ate'
FROM public.ativos
WHERE garantia_ate IS NOT NULL
ON CONFLICT DO NOTHING;
