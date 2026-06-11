import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export interface OrgPlano {
  id: string;
  nome: string;
  slug: string;
  limite_ativos: number | null;
  limite_usuarios: number | null;
  features: Record<string, boolean>;
}

export interface OrgInfo {
  id: string;
  nome: string;
  sigla: string;
  logo_url: string | null;
  estado: "ativa" | "inativa" | "suspensa";
  is_tenant_master: boolean;
  moeda: string;
  pais: string | null;
  setor: string | null;
  onboarding_completo: boolean;
  plano: OrgPlano | null;
}

export function useOrg() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current-org", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrgInfo | null> => {
      const { data: profile } = await supabase
        .from("profiles").select("organizacao_id").eq("id", user!.id).maybeSingle();
      if (!profile?.organizacao_id) return null;
      const { data: org } = await supabase
        .from("organizacoes")
        .select("id, nome, sigla, logo_url, estado, is_tenant_master, moeda, pais, setor, onboarding_completo, plano:planos(id, nome, slug, limite_ativos, limite_usuarios, features)")
        .eq("id", profile.organizacao_id)
        .maybeSingle();
      if (!org) return null;
      return {
        ...org,
        plano: (org as any).plano ? {
          ...(org as any).plano,
          features: ((org as any).plano.features ?? {}) as Record<string, boolean>,
        } : null,
      } as OrgInfo;
    },
  });
}

export function useHasFeature(feature: string) {
  const { data: org } = useOrg();
  return org?.plano?.features?.[feature] ?? false;
}
