import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, Plus, Wifi, WifiOff, Droplet, FileWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/impressoras/")({
  component: ImpressorasPage,
});

type Impressora = {
  id: string;
  ativo_id: string;
  ip: string;
  modelo: string | null;
  status_online: boolean;
  ultima_leitura_em: string | null;
  ativos: { nome: string; codigo_unico: string; empresas: { sigla: string; nome: string } | null } | null;
};

type Leitura = {
  impressora_id: string;
  toner_preto: number | null;
  toner_ciano: number | null;
  toner_magenta: number | null;
  toner_amarelo: number | null;
  papel_pct: number | null;
  capturado_em: string;
};

function minToner(l?: Leitura) {
  if (!l) return null;
  const vals = [l.toner_preto, l.toner_ciano, l.toner_magenta, l.toner_amarelo].filter((v): v is number => v != null);
  return vals.length ? Math.min(...vals) : null;
}

function statusBadge(online: boolean, toner: number | null, papel: number | null) {
  if (!online) return { label: "Offline", cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if ((toner != null && toner < 20) || (papel != null && papel < 15))
    return { label: "Crítico", cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if ((toner != null && toner < 40) || (papel != null && papel < 25))
    return { label: "Atenção", cls: "bg-warning/15 text-warning border-warning/30" };
  return { label: "OK", cls: "bg-success/10 text-success border-success/20" };
}

function ImpressorasPage() {
  const { data: impressoras = [], isLoading } = useQuery({
    queryKey: ["impressoras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impressoras" as never)
        .select("*, ativos(nome, codigo_unico, empresas(sigla, nome))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Impressora[];
    },
    refetchInterval: 30000,
  });

  const { data: leituras = [] } = useQuery({
    queryKey: ["leituras-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impressora_leituras" as never)
        .select("*")
        .order("capturado_em", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Leitura[];
    },
    refetchInterval: 30000,
  });

  const latestByPrinter = new Map<string, Leitura>();
  for (const l of leituras) if (!latestByPrinter.has(l.impressora_id)) latestByPrinter.set(l.impressora_id, l);

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Impressoras</h1>
          <p className="text-muted-foreground text-sm">Monitoramento em tempo real via SNMP (agente local).</p>
        </div>
        <Link to="/impressoras/novo" className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90">
          <Plus className="size-4" /> Adicionar impressora
        </Link>
      </div>

      {impressoras.length > 0 && (() => {
        const online = impressoras.filter((p) => p.status_online).length;
        const offline = impressoras.length - online;
        const criticos = impressoras.filter((p) => {
          const l = latestByPrinter.get(p.id);
          const t = minToner(l);
          return (t != null && t < 20) || (l?.papel_pct != null && l.papel_pct < 25);
        }).length;
        const topUso = [...impressoras]
          .map((p) => ({ p, c: latestByPrinter.get(p.id)?.papel_pct != null ? Number(latestByPrinter.get(p.id)?.toner_preto ?? 0) : 0 }))
          .sort((a, b) => b.c - a.c).slice(0, 1)[0];
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Kpi icon={Wifi} label="Online" value={online} color="text-success" />
            <Kpi icon={WifiOff} label="Offline" value={offline} color="text-destructive" />
            <Kpi icon={Droplet} label="Consumíveis críticos" value={criticos} color="text-warning" />
            <Kpi icon={Printer} label="Total" value={impressoras.length} color="text-foreground" />
          </div>
        );
      })()}



      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Carregando...</div>
      ) : impressoras.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Printer className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma impressora cadastrada ainda.</p>
          <Link to="/impressoras/novo" className="text-accent font-semibold text-sm hover:underline">
            Cadastrar primeira →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {impressoras.map((p) => {
            const l = latestByPrinter.get(p.id);
            const toner = minToner(l);
            const papel = l?.papel_pct ?? null;
            const badge = statusBadge(p.status_online, toner, papel);
            return (
              <Link
                key={p.id}
                to="/impressoras/$id"
                params={{ id: p.id }}
                className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{p.ativos?.codigo_unico}</p>
                    <h3 className="font-bold truncate">{p.ativos?.nome ?? "Impressora"}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.modelo ?? "Modelo não definido"} • <span className="font-mono">{p.ip}</span>
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                  <Metric icon={p.status_online ? Wifi : WifiOff} label="Status" value={p.status_online ? "Online" : "Offline"} accent={p.status_online ? "text-success" : "text-destructive"} />
                  <Metric icon={Droplet} label="Toner" value={toner != null ? `${toner}%` : "—"} accent={toner == null ? "text-muted-foreground" : toner < 20 ? "text-destructive" : toner < 40 ? "text-warning" : "text-success"} />
                  <Metric icon={FileWarning} label="Papel" value={papel != null ? `${papel}%` : "—"} accent={papel == null ? "text-muted-foreground" : papel < 25 ? "text-warning" : "text-success"} />
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-2">
                  <span className="font-mono font-bold bg-secondary px-1.5 py-0.5 rounded">
                    {p.ativos?.empresas?.sigla ?? "—"}
                  </span>
                  <span>
                    {l ? `Atualizado ${new Date(l.capturado_em).toLocaleTimeString("pt-PT")}` : "Sem leituras"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: typeof Wifi; label: string; value: string; accent: string }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-2">
      <Icon className={`size-3.5 mx-auto ${accent}`} />
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 font-semibold">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
