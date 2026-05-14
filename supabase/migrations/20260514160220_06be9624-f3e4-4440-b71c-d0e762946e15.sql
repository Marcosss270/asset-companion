
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'viewer');
CREATE TYPE public.ativo_status AS ENUM ('disponivel', 'em_uso', 'em_manutencao', 'danificado', 'obsoleto', 'baixado');
CREATE TYPE public.movimentacao_tipo AS ENUM ('cadastro', 'transferencia', 'mudanca_status', 'manutencao', 'baixa', 'localizacao');
CREATE TYPE public.alerta_tipo AS ENUM ('estoque_baixo', 'garantia_vencendo', 'manutencao_pendente', 'obsoleto');
CREATE TYPE public.alerta_status AS ENUM ('ativo', 'resolvido', 'ignorado');

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============= CATEGORIAS =============
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  codigo_prefixo TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

INSERT INTO public.categorias (nome, codigo_prefixo, descricao) VALUES
  ('Laptops', 'LAP', 'Notebooks e laptops corporativos'),
  ('Desktops', 'DSK', 'Computadores de mesa'),
  ('Switches', 'SWT', 'Equipamentos de rede - switches'),
  ('Routers', 'RTR', 'Roteadores e equipamentos de roteamento'),
  ('Impressoras', 'IMP', 'Impressoras e multifuncionais'),
  ('Telefones', 'TEL', 'Telefones IP e celulares'),
  ('Monitores', 'MON', 'Monitores e displays'),
  ('Periféricos', 'PER', 'Mouse, teclado, headset, pendrive etc.'),
  ('Servidores', 'SRV', 'Servidores físicos'),
  ('Consumíveis', 'CON', 'Tinteiros, cabos, papel etc.');

-- ============= ATIVOS =============
CREATE TABLE public.ativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_unico TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  categoria_id UUID NOT NULL REFERENCES public.categorias(id),
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  status ativo_status NOT NULL DEFAULT 'disponivel',
  localizacao TEXT,
  responsavel TEXT,
  data_compra DATE,
  garantia_ate DATE,
  observacoes TEXT,
  foto_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ativos_categoria ON public.ativos(categoria_id);
CREATE INDEX idx_ativos_status ON public.ativos(status);

-- Sequencia de codigo unico por categoria/ano
CREATE TABLE public.codigo_sequencias (
  prefixo TEXT NOT NULL,
  ano INT NOT NULL,
  ultimo_numero INT NOT NULL DEFAULT 0,
  PRIMARY KEY (prefixo, ano)
);
ALTER TABLE public.codigo_sequencias ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.gerar_codigo_unico(_categoria_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _prefixo TEXT;
  _ano INT := EXTRACT(YEAR FROM now());
  _numero INT;
BEGIN
  SELECT codigo_prefixo INTO _prefixo FROM public.categorias WHERE id = _categoria_id;
  IF _prefixo IS NULL THEN RAISE EXCEPTION 'Categoria não encontrada'; END IF;

  INSERT INTO public.codigo_sequencias (prefixo, ano, ultimo_numero)
  VALUES (_prefixo, _ano, 1)
  ON CONFLICT (prefixo, ano) DO UPDATE SET ultimo_numero = codigo_sequencias.ultimo_numero + 1
  RETURNING ultimo_numero INTO _numero;

  RETURN _prefixo || '-' || _ano || '-' || LPAD(_numero::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ativo_codigo_unico()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.codigo_unico IS NULL OR NEW.codigo_unico = '' THEN
    NEW.codigo_unico := public.gerar_codigo_unico(NEW.categoria_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_ativo_codigo_unico
  BEFORE INSERT ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.set_ativo_codigo_unico();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_ativos_updated_at BEFORE UPDATE ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= MOVIMENTAÇÕES =============
CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
  tipo movimentacao_tipo NOT NULL,
  status_anterior ativo_status,
  status_novo ativo_status,
  responsavel_anterior TEXT,
  responsavel_novo TEXT,
  localizacao_anterior TEXT,
  localizacao_nova TEXT,
  descricao TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_movimentacoes_ativo ON public.movimentacoes(ativo_id);

-- Auto registro de movimentação no cadastro
CREATE OR REPLACE FUNCTION public.log_ativo_cadastro()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.movimentacoes (ativo_id, tipo, status_novo, responsavel_novo, localizacao_nova, descricao, usuario_id)
  VALUES (NEW.id, 'cadastro', NEW.status, NEW.responsavel, NEW.localizacao, 'Ativo cadastrado no sistema', NEW.created_by);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_ativo_log_cadastro AFTER INSERT ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.log_ativo_cadastro();

-- Auto registro de mudanças
CREATE OR REPLACE FUNCTION public.log_ativo_alteracao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
END;
$$;
CREATE TRIGGER trg_ativo_log_alteracao AFTER UPDATE ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.log_ativo_alteracao();

-- ============= ESTOQUE CONSUMIVEIS =============
CREATE TABLE public.estoque_consumiveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  quantidade INT NOT NULL DEFAULT 0,
  estoque_minimo INT NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'un',
  localizacao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.estoque_consumiveis ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_consumiveis_updated_at BEFORE UPDATE ON public.estoque_consumiveis
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= ALERTAS =============
CREATE TABLE public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo alerta_tipo NOT NULL,
  status alerta_status NOT NULL DEFAULT 'ativo',
  titulo TEXT NOT NULL,
  mensagem TEXT,
  ativo_id UUID REFERENCES public.ativos(id) ON DELETE CASCADE,
  consumivel_id UUID REFERENCES public.estoque_consumiveis(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

-- ============= RLS POLICIES =============
-- Profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Authenticated view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Categorias
CREATE POLICY "Authenticated view categorias" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage categorias" ON public.categorias FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Sequencias (somente sistema)
CREATE POLICY "Authenticated view sequencias" ON public.codigo_sequencias FOR SELECT TO authenticated USING (true);

-- Ativos
CREATE POLICY "Authenticated view ativos" ON public.ativos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert ativos" ON public.ativos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update ativos" ON public.ativos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete ativos" ON public.ativos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Movimentacoes
CREATE POLICY "Authenticated view movimentacoes" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert movimentacoes" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (true);

-- Consumiveis
CREATE POLICY "Authenticated view consumiveis" ON public.estoque_consumiveis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage consumiveis" ON public.estoque_consumiveis FOR ALL TO authenticated USING (true);

-- Alertas
CREATE POLICY "Authenticated view alertas" ON public.alertas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage alertas" ON public.alertas FOR ALL TO authenticated USING (true);

-- ============= TRIGGER NOVO USUARIO =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email);

  -- Primeiro usuario vira admin automaticamente
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first;
  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
