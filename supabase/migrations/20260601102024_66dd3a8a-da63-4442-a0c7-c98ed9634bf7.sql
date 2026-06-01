-- 1) profiles.ativo
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- 2) configuracoes table
CREATE TABLE IF NOT EXISTS public.configuracoes (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view configuracoes"
  ON public.configuracoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage configuracoes"
  ON public.configuracoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER configuracoes_touch_updated_at
  BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed default keys (idempotent)
INSERT INTO public.configuracoes (chave, valor) VALUES
  ('organizacao', '{"nome":"GRUPO A3"}'::jsonb),
  ('alertas', '{"toner_critico":20,"toner_baixo":40,"papel_baixo":25}'::jsonb),
  ('impressoras', '{"intervalo_snmp_min":15,"comunidade_padrao":"public"}'::jsonb),
  ('inventario', '{"estoque_minimo_padrao":5}'::jsonb)
ON CONFLICT (chave) DO NOTHING;
