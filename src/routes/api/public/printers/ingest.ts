import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const leituraSchema = z.object({
  toner_preto: z.number().int().min(0).max(100).nullable().optional(),
  toner_ciano: z.number().int().min(0).max(100).nullable().optional(),
  toner_magenta: z.number().int().min(0).max(100).nullable().optional(),
  toner_amarelo: z.number().int().min(0).max(100).nullable().optional(),
  papel_pct: z.number().int().min(0).max(100).nullable().optional(),
  online: z.boolean().default(true),
  erros_hw: z.string().max(500).nullable().optional(),
  contador_impressoes: z.number().int().min(0).nullable().optional(),
});

const bodySchema = z.object({
  impressora_id: z.string().uuid().optional(),
  ip: z.string().min(3).max(64).optional(),
  leitura: leituraSchema,
}).refine((v) => v.impressora_id || v.ip, { message: "impressora_id ou ip é obrigatório" });

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/printers/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-ingest-token");
        const expected = process.env.PRINTER_INGEST_TOKEN;
        if (!expected) return json(500, { error: "Server token not configured" });
        if (!token || token !== expected) return json(401, { error: "Invalid token" });

        let payload: unknown;
        try { payload = await request.json(); } catch { return json(400, { error: "Invalid JSON" }); }
        const parsed = bodySchema.safeParse(payload);
        if (!parsed.success) return json(400, { error: "Validation failed", details: parsed.error.flatten() });

        const { impressora_id, ip, leitura } = parsed.data;
        let pid = impressora_id;
        if (!pid && ip) {
          const { data } = await supabaseAdmin.from("impressoras" as never).select("id").eq("ip", ip).maybeSingle();
          pid = (data as { id?: string } | null)?.id;
        }
        if (!pid) return json(404, { error: "Impressora não encontrada" });

        const { error } = await (supabaseAdmin.from("impressora_leituras" as never) as unknown as {
          insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        }).insert({ impressora_id: pid, ...leitura });
        if (error) return json(500, { error: error.message });

        return json(200, { ok: true });
      },
    },
  },
});
