import type { Database } from "@/integrations/supabase/types";

export type AtivoStatus = Database["public"]["Enums"]["ativo_status"];

export const STATUS_LABELS: Record<AtivoStatus, string> = {
  disponivel: "Disponível",
  em_uso: "Em Uso",
  em_manutencao: "Em Manutenção",
  danificado: "Danificado",
  obsoleto: "Obsoleto",
  baixado: "Baixado",
};

export const STATUS_OPTIONS: AtivoStatus[] = [
  "disponivel",
  "em_uso",
  "em_manutencao",
  "danificado",
  "obsoleto",
  "baixado",
];

export function statusBadgeClass(status: AtivoStatus): string {
  switch (status) {
    case "disponivel":
      return "bg-info/10 text-info border-info/20";
    case "em_uso":
      return "bg-success/10 text-success border-success/20";
    case "em_manutencao":
      return "bg-warning/15 text-warning border-warning/30";
    case "danificado":
    case "baixado":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "obsoleto":
      return "bg-muted text-muted-foreground border-border";
  }
}
