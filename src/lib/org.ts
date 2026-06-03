import { supabase } from "@/integrations/supabase/client";

export interface OrgInfo {
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  logo_path?: string;
  logo_url?: string;
}

export async function loadOrgInfo(): Promise<OrgInfo> {
  const { data } = await supabase.from("configuracoes").select("valor").eq("chave", "organizacao").maybeSingle();
  const v = (data?.valor ?? {}) as Record<string, unknown>;
  const info: OrgInfo = {
    nome: String(v.nome ?? "GRUPO A3"),
    email: v.email ? String(v.email) : undefined,
    telefone: v.telefone ? String(v.telefone) : undefined,
    endereco: v.endereco ? String(v.endereco) : undefined,
    logo_path: v.logo_path ? String(v.logo_path) : undefined,
  };
  if (info.logo_path) {
    const { data: signed } = await supabase.storage.from("branding").createSignedUrl(info.logo_path, 60 * 60);
    if (signed?.signedUrl) info.logo_url = signed.signedUrl;
  }
  return info;
}

export async function urlToDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
