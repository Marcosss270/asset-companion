-- Tabela de manutenções
CREATE TABLE public.manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'corretiva',
  descricao TEXT NOT NULL,
  tecnico TEXT,
  fornecedor TEXT,
  custo NUMERIC(10,2),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao DATE,
  status TEXT NOT NULL DEFAULT 'aberta',
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view manutencoes" ON public.manutencoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert manutencoes" ON public.manutencoes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update manutencoes" ON public.manutencoes
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete manutencoes" ON public.manutencoes
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_manutencoes_updated
  BEFORE UPDATE ON public.manutencoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_manutencoes_ativo ON public.manutencoes(ativo_id);
CREATE INDEX idx_manutencoes_status ON public.manutencoes(status);

-- Trigger: ao abrir manutenção, registrar movimentação
CREATE OR REPLACE FUNCTION public.log_manutencao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.movimentacoes (ativo_id, tipo, descricao, usuario_id)
  VALUES (NEW.ativo_id, 'manutencao',
    'Manutenção ' || NEW.status || ': ' || NEW.descricao,
    NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_manutencao_log
  AFTER INSERT ON public.manutencoes
  FOR EACH ROW EXECUTE FUNCTION public.log_manutencao();