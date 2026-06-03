export type SaudeAtivo = "novo" | "bom" | "regular" | "critico";

export const SAUDE_LABELS: Record<SaudeAtivo, string> = {
  novo: "Novo",
  bom: "Bom",
  regular: "Regular",
  critico: "Crítico",
};

export const SAUDE_COLORS: Record<SaudeAtivo, string> = {
  novo: "bg-info/10 text-info border-info/30",
  bom: "bg-success/10 text-success border-success/30",
  regular: "bg-warning/10 text-warning border-warning/30",
  critico: "bg-destructive/10 text-destructive border-destructive/30",
};

export function computeSaude(opts: {
  dataCompra?: string | null;
  createdAt?: string | null;
  status?: string | null;
  manutCount: number;
  garantiaAtiva: boolean;
}): SaudeAtivo {
  const base = opts.dataCompra ?? opts.createdAt ?? new Date().toISOString();
  const meses = Math.max(0, Math.floor((Date.now() - new Date(base).getTime()) / (1000 * 60 * 60 * 24 * 30)));
  if (opts.status === "em_manutencao" || opts.status === "obsoleto" || opts.manutCount >= 5 || meses >= 84) return "critico";
  if (opts.manutCount >= 3 || meses >= 60) return "regular";
  if (meses <= 6 && opts.garantiaAtiva) return "novo";
  return "bom";
}

export function diasParaVencer(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
