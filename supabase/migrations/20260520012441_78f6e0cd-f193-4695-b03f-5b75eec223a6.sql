-- Fornecedores
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa text NOT NULL,
  nif text,
  pessoa_contacto text,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  website text,
  observacoes text,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fornecedores_nome ON public.fornecedores(nome_empresa);
CREATE INDEX idx_fornecedores_status ON public.fornecedores(status);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert fornecedores" ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update fornecedores" ON public.fornecedores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete fornecedores" ON public.fornecedores FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Relação fornecedor x produto (consumível ou ativo)
CREATE TABLE public.fornecedor_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  consumivel_id uuid REFERENCES public.estoque_consumiveis(id) ON DELETE CASCADE,
  ativo_id uuid REFERENCES public.ativos(id) ON DELETE CASCADE,
  preco_medio numeric(14,2),
  prazo_entrega_dias integer,
  fornecedor_preferencial boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fp_one_target CHECK (
    (consumivel_id IS NOT NULL AND ativo_id IS NULL) OR
    (consumivel_id IS NULL AND ativo_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_fp_consumivel ON public.fornecedor_produtos(fornecedor_id, consumivel_id) WHERE consumivel_id IS NOT NULL;
CREATE UNIQUE INDEX uq_fp_ativo ON public.fornecedor_produtos(fornecedor_id, ativo_id) WHERE ativo_id IS NOT NULL;
CREATE UNIQUE INDEX uq_fp_pref_consumivel ON public.fornecedor_produtos(consumivel_id) WHERE fornecedor_preferencial AND consumivel_id IS NOT NULL;
CREATE UNIQUE INDEX uq_fp_pref_ativo ON public.fornecedor_produtos(ativo_id) WHERE fornecedor_preferencial AND ativo_id IS NOT NULL;

ALTER TABLE public.fornecedor_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view fp" ON public.fornecedor_produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert fp" ON public.fornecedor_produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update fp" ON public.fornecedor_produtos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete fp" ON public.fornecedor_produtos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_fp_updated_at BEFORE UPDATE ON public.fornecedor_produtos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();