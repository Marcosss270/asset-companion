import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const devSchema = z.object({
  ip: z.string().max(64).optional(),
  mac: z.string().max(64).optional(),
  hostname: z.string().max(120).optional(),
  fabricante: z.string().max(120).optional(),
  modelo: z.string().max(120).optional(),
  tipo_sugerido: z.enum(["printer","computer","switch","router","ap","unknown"]).optional(),
  portas_abertas: z.array(z.number().int()).max(50).optional(),
});

const bodySchema = z.object({ dispositivos: z.array(devSchema).max(500) });

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function json(s: number, b: unknown) {
  return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/public/agent/discovery")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) return json(401, { error: "missing token" });
        const hash = await sha256Hex(token);
        const { data: ag } = await supabaseAdmin.from("agentes").select("id, empresa_id").eq("token_hash", hash).maybeSingle();
        const agente = ag as { id: string; empresa_id: string | null } | null;
        if (!agente) return json(401, { error: "invalid token" });

        let payload: unknown;
        try { payload = await request.json(); } catch { return json(400, { error: "invalid json" }); }
        const parsed = bodySchema.safeParse(payload);
        if (!parsed.success) return json(400, { error: "validation failed" });

        let inserted = 0;
        for (const d of parsed.data.dispositivos) {
          if (d.mac) {
            const { data: existing } = await supabaseAdmin.from("dispositivos_descobertos").select("id, estado").eq("mac", d.mac).maybeSingle();
            const ex = existing as { id: string; estado: string } | null;
            if (ex) {
              await supabaseAdmin.from("dispositivos_descobertos").update({ ...d, agente_id: agente.id, descoberto_em: new Date().toISOString() }).eq("id", ex.id);
              continue;
            }
          }
          await supabaseAdmin.from("dispositivos_descobertos").insert({ ...d, agente_id: agente.id, empresa_id: agente.empresa_id });
          inserted++;
        }
        await supabaseAdmin.from("agente_eventos").insert({ agente_id: agente.id, tipo: "discovery", payload: { count: parsed.data.dispositivos.length, inserted } });
        return json(200, { ok: true, inserted });
      },
    },
  },
});
