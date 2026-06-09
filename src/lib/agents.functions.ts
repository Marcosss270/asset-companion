import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Gera token e armazena hash; devolve o token em claro uma única vez.
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const criarAgente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nome: string; empresa_id?: string | null; ativo_id?: string | null; notas?: string | null }) =>
    z.object({
      nome: z.string().min(1).max(100),
      empresa_id: z.string().uuid().nullable().optional(),
      ativo_id: z.string().uuid().nullable().optional(),
      notas: z.string().max(500).nullable().optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const token_hash = await sha256Hex(token);
    const { data: ag, error } = await supabaseAdmin
      .from("agentes" as never)
      .insert({ nome: data.nome, empresa_id: data.empresa_id ?? null, ativo_id: data.ativo_id ?? null, notas: data.notas ?? null, token_hash })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    void context;
    return { id: (ag as { id: string }).id, token };
  });

export const removerAgente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("agentes" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const aprovarDispositivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; nome: string; categoria_id: string; empresa_id: string }) =>
    z.object({
      id: z.string().uuid(),
      nome: z.string().min(1).max(120),
      categoria_id: z.string().uuid(),
      empresa_id: z.string().uuid(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: disp, error: e1 } = await supabaseAdmin
      .from("dispositivos_descobertos" as never)
      .select("ip, mac, fabricante, modelo")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    const d = disp as { ip?: string; mac?: string; fabricante?: string; modelo?: string } | null;
    const { data: ativo, error: e2 } = await supabaseAdmin
      .from("ativos" as never)
      .insert({
        nome: data.nome,
        categoria_id: data.categoria_id,
        empresa_id: data.empresa_id,
        marca: d?.fabricante ?? null,
        modelo: d?.modelo ?? null,
        localizacao: d?.ip ?? null,
        notas: d?.mac ? `MAC: ${d.mac}` : null,
        status: "disponivel",
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);
    await supabaseAdmin
      .from("dispositivos_descobertos" as never)
      .update({ estado: "aprovado", ativo_id: (ativo as { id: string }).id, empresa_id: data.empresa_id, categoria_id: data.categoria_id })
      .eq("id", data.id);
    return { ativo_id: (ativo as { id: string }).id };
  });

export const ignorarDispositivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("dispositivos_descobertos" as never).update({ estado: "ignorado" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
