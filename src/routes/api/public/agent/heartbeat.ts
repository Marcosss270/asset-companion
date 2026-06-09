import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const invSchema = z.object({
  hostname: z.string().max(120).optional(),
  usuario_atual: z.string().max(120).optional(),
  ip: z.string().max(64).optional(),
  mac: z.string().max(64).optional(),
  so: z.string().max(120).optional(),
  so_versao: z.string().max(120).optional(),
  cpu: z.string().max(200).optional(),
  ram_mb: z.number().int().optional(),
  disco_total_gb: z.number().optional(),
  disco_livre_gb: z.number().optional(),
}).optional();

const bodySchema = z.object({ inventario: invSchema });

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(s: number, b: unknown) {
  return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/public/agent/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) return json(401, { error: "missing token" });
        const hash = await sha256Hex(token);
        const { data: ag } = await supabaseAdmin
          .from("agentes" as never)
          .select("id")
          .eq("token_hash", hash)
          .maybeSingle();
        const agente = ag as { id: string } | null;
        if (!agente) return json(401, { error: "invalid token" });

        let payload: unknown = {};
        try { payload = await request.json(); } catch { /* empty body ok */ }
        const parsed = bodySchema.safeParse(payload);
        if (!parsed.success) return json(400, { error: "invalid body" });

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
        await supabaseAdmin.from("agentes" as never).update({ ultimo_contato: new Date().toISOString(), hostname: parsed.data.inventario?.hostname ?? undefined }).eq("id", agente.id);
        if (parsed.data.inventario) {
          await supabaseAdmin.from("agente_inventarios" as never).insert({ agente_id: agente.id, ...parsed.data.inventario });
        }
        await supabaseAdmin.from("agente_eventos" as never).insert({ agente_id: agente.id, tipo: parsed.data.inventario ? "inventario" : "heartbeat", payload: parsed.data as never, ip_origem: ip });
        return json(200, { ok: true });
      },
    },
  },
});
