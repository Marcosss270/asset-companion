import { supabase } from "@/integrations/supabase/client";

export type TimelineEvent = {
  id: string;
  ativo_id: string;
  origem: "movimentacao" | "manutencao" | "alerta";
  tipo: string;
  titulo: string;
  descricao?: string | null;
  data: string;
  metadata?: Record<string, unknown> | null;
};

export async function fetchTimeline(ativoId: string): Promise<TimelineEvent[]> {
  const [mov, manut, alertas] = await Promise.all([
    supabase.from("movimentacoes").select("*").eq("ativo_id", ativoId).order("created_at", { ascending: false }),
    supabase.from("manutencoes").select("*").eq("ativo_id", ativoId).order("created_at", { ascending: false }),
    supabase.from("alertas").select("*").eq("ativo_id", ativoId).order("created_at", { ascending: false }),
  ]);

  const events: TimelineEvent[] = [];

  for (const m of mov.data ?? []) {
    events.push({
      id: `mov-${m.id}`,
      ativo_id: ativoId,
      origem: "movimentacao",
      tipo: m.tipo,
      titulo: m.tipo.replace(/_/g, " "),
      descricao: m.descricao,
      data: m.created_at,
      metadata: (m as { metadata?: Record<string, unknown> }).metadata ?? {
        status_anterior: m.status_anterior,
        status_novo: m.status_novo,
        responsavel_anterior: m.responsavel_anterior,
        responsavel_novo: m.responsavel_novo,
        localizacao_anterior: m.localizacao_anterior,
        localizacao_nova: m.localizacao_nova,
      },
    });
  }
  for (const x of manut.data ?? []) {
    events.push({
      id: `man-${x.id}`,
      ativo_id: ativoId,
      origem: "manutencao",
      tipo: x.tipo,
      titulo: `Manutenção ${x.tipo}`,
      descricao: x.descricao,
      data: x.created_at,
      metadata: { status: x.status, tecnico: x.tecnico, custo: x.custo },
    });
  }
  for (const a of alertas.data ?? []) {
    events.push({
      id: `alr-${a.id}`,
      ativo_id: ativoId,
      origem: "alerta",
      tipo: a.tipo,
      titulo: a.titulo,
      descricao: a.mensagem,
      data: a.created_at,
    });
  }

  events.sort((a, b) => +new Date(b.data) - +new Date(a.data));
  return events;
}
