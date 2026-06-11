
ALTER TABLE public.user_roles ALTER COLUMN organizacao_id SET DEFAULT public.current_org_id();
ALTER TABLE public.profiles ALTER COLUMN organizacao_id SET DEFAULT public.current_org_id();
