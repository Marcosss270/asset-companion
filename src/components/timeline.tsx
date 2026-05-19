import { useState, useMemo } from "react";
import type { TimelineEvent } from "@/lib/timeline";
import {
  Plus, ArrowRightLeft, Wrench, AlertTriangle, MapPin, User, RefreshCw, Activity, Pencil, FileSearch,
} from "lucide-react";

type IconType = typeof Plus;
const ICONS: Record<string, { icon: IconType; color: string }> = {
  cadastro: { icon: Plus, color: "text-info bg-info/10 ring-info/20" },
  mudanca_status: { icon: RefreshCw, color: "text-warning bg-warning/10 ring-warning/20" },
  transferencia: { icon: User, color: "text-accent bg-accent/10 ring-accent/20" },
  localizacao: { icon: MapPin, color: "text-accent bg-accent/10 ring-accent/20" },
  manutencao: { icon: Wrench, color: "text-warning bg-warning/15 ring-warning/30" },
  edicao: { icon: Pencil, color: "text-muted-foreground bg-secondary ring-border" },
  alerta: { icon: AlertTriangle, color: "text-destructive bg-destructive/10 ring-destructive/20" },
  leitura_snmp: { icon: Activity, color: "text-info bg-info/10 ring-info/20" },
  _default: { icon: ArrowRightLeft, color: "text-muted-foreground bg-secondary ring-border" },
};

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "movimentacao", label: "Movimentações" },
  { id: "manutencao", label: "Manutenções" },
  { id: "alerta", label: "Alertas" },
] as const;

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const [filter, setFilter] = useState<typeof FILTERS[number]["id"]>("all");

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.origem === filter)),
    [events, filter],
  );

  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
        <FileSearch className="size-8 opacity-40" />
        Nenhum evento registrado ainda.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 px-6 py-3 border-b border-border bg-secondary/30">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === f.id
                ? "bg-foreground text-background"
                : "bg-card border border-border hover:bg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground self-center">
          {filtered.length} evento(s)
        </span>
      </div>

      <div className="relative px-6 py-4">
        <div className="absolute left-[34px] top-4 bottom-4 w-px bg-border" aria-hidden />
        <ul className="space-y-3">
          {filtered.map((e) => {
            const cfg = ICONS[e.tipo] ?? ICONS[e.origem] ?? ICONS._default;
            const Icon = cfg.icon;
            return (
              <li key={e.id} className="relative pl-10">
                <span className={`absolute left-0 top-1.5 size-7 rounded-full ring-2 flex items-center justify-center ${cfg.color}`}>
                  <Icon className="size-3.5" />
                </span>
                <div className="bg-card border border-border rounded-lg p-3 shadow-card/40">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold capitalize">{e.titulo}</p>
                    <time className="text-[10px] font-mono text-muted-foreground whitespace-nowrap mt-0.5">
                      {new Date(e.data).toLocaleString("pt-PT")}
                    </time>
                  </div>
                  {e.descricao && (
                    <p className="text-xs text-muted-foreground mt-1">{e.descricao}</p>
                  )}
                  {e.metadata && Object.entries(e.metadata).filter(([, v]) => v !== null && v !== undefined && v !== "").length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(e.metadata)
                        .filter(([, v]) => v !== null && v !== undefined && v !== "")
                        .slice(0, 6)
                        .map(([k, v]) => (
                          <span key={k} className="text-[10px] px-1.5 py-0.5 bg-secondary rounded font-mono">
                            <span className="text-muted-foreground">{k.replace(/_/g, " ")}:</span>{" "}
                            <span className="font-semibold">{String(v)}</span>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
