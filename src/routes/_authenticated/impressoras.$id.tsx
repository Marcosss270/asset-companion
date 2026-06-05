import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wifi, WifiOff, Droplet, FileWarning, Printer as PrinterIcon, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/impressoras/$id")({
  component: ImpressoraDetailPage,
});

type Leitura = {
  id: string;
  toner_preto: number | null;
  toner_ciano: number | null;
  toner_magenta: number | null;
  toner_amarelo: number | null;
  papel_pct: number | null;
  online: boolean;
  contador_impressoes: number | null;
  erros_hw: string | null;
  capturado_em: string;
};

function ImpressoraDetailPage() {
  const { id } = Route.useParams();

  const { data: impressora } = useQuery({
    queryKey: ["impressora", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("impressoras" as never)
        .select("*, ativos(id, nome, codigo_unico, empresas(nome, sigla))")
        .eq("id", id)
        .single();
      return data as unknown as {
        id: string; ativo_id: string; ip: string; porta_snmp: number; comunidade_snmp: string;
        modelo: string | null; status_online: boolean; ultima_leitura_em: string | null;
        ultimo_erro: string | null; ultimo_erro_em: string | null;
        ativos: { id: string; nome: string; codigo_unico: string; empresas: { nome: string; sigla: string } | null } | null;
      } | null;
    },
    refetchInterval: 30000,
  });


  const { data: leituras = [] } = useQuery({
    queryKey: ["leituras", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("impressora_leituras" as never)
        .select("*")
        .eq("impressora_id", id)
        .order("capturado_em", { ascending: false })
        .limit(50);
      return (data ?? []) as unknown as Leitura[];
    },
    refetchInterval: 30000,
  });

  if (!impressora) {
    return <div className="text-center py-12 text-sm text-muted-foreground">Carregando…</div>;
  }
  const last = leituras[0];
  const minToner = last ? Math.min(...[last.toner_preto, last.toner_ciano, last.toner_magenta, last.toner_amarelo].filter((v): v is number => v != null), 999) : null;
  const previsao = previsaoConsumo(leituras);

  return (
    <div className="max-w-[1200px] mx-auto">
      <Link to="/impressoras" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Impressoras
      </Link>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{impressora.ativos?.codigo_unico}</p>
          <h1 className="text-2xl font-bold tracking-tight">{impressora.ativos?.nome}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {impressora.modelo ?? "Sem modelo"} • <span className="font-mono">{impressora.ip}:{impressora.porta_snmp}</span> • SNMP {impressora.comunidade_snmp}
            {impressora.ativos?.empresas && <> • <span className="font-bold">{impressora.ativos.empresas.sigla}</span></>}
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${impressora.status_online ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
          {impressora.status_online ? "Online" : "Offline"}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI icon={impressora.status_online ? Wifi : WifiOff} label="Status" value={impressora.status_online ? "Online" : "Offline"} color={impressora.status_online ? "text-success" : "text-destructive"} />
        <KPI icon={Droplet} label="Toner mínimo" value={minToner != null && minToner !== 999 ? `${minToner}%` : "—"} color={minToner == null ? "text-muted-foreground" : minToner < 20 ? "text-destructive" : minToner < 40 ? "text-warning" : "text-success"} />
        <KPI icon={FileWarning} label="Papel" value={last?.papel_pct != null ? `${last.papel_pct}%` : "—"} color={last?.papel_pct == null ? "text-muted-foreground" : last.papel_pct < 25 ? "text-warning" : "text-success"} />
        <KPI icon={PrinterIcon} label="Contador" value={last?.contador_impressoes != null ? last.contador_impressoes.toLocaleString("pt-PT") : "—"} color="text-foreground" />
      </div>

      {impressora.ultimo_erro && (
        <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-4 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-destructive mb-1">Último erro do agente SNMP</p>
          <p className="text-sm font-mono">{impressora.ultimo_erro}</p>
          {impressora.ultimo_erro_em && <p className="text-xs text-muted-foreground mt-1">{new Date(impressora.ultimo_erro_em).toLocaleString("pt-PT")}</p>}
        </div>
      )}


      {last && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-card mb-6">
          <h2 className="font-bold mb-4">Níveis de Toner</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TonerBar label="Preto" value={last.toner_preto} color="bg-foreground" />
            <TonerBar label="Ciano" value={last.toner_ciano} color="bg-info" />
            <TonerBar label="Magenta" value={last.toner_magenta} color="bg-destructive" />
            <TonerBar label="Amarelo" value={last.toner_amarelo} color="bg-warning" />
          </div>
        </div>
      )}

      {previsao && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-card mb-6">
          <h2 className="font-bold mb-2 flex items-center gap-2"><Activity className="size-4" /> Previsão de Consumo</h2>
          <p className="text-sm text-muted-foreground">
            Consumo médio: <span className="font-semibold text-foreground">{previsao.diaria.toFixed(2)}%/dia</span>.
            Toner deverá atingir 0% em aproximadamente <span className="font-bold text-foreground">{previsao.diasRestantes} dia(s)</span>.
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold">Histórico de leituras ({leituras.length})</h2>
        </div>
        {leituras.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Sem leituras ainda. Configure o agente local SNMP enviando para <code className="text-xs bg-secondary px-1 rounded">/api/public/printers/ingest</code>.
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <th className="px-4 py-2">Capturado</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Preto</th>
                <th className="px-4 py-2">Ciano</th>
                <th className="px-4 py-2">Magenta</th>
                <th className="px-4 py-2">Amarelo</th>
                <th className="px-4 py-2">Papel</th>
                <th className="px-4 py-2">Contador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {leituras.map((l) => (
                <tr key={l.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(l.capturado_em).toLocaleString("pt-PT")}</td>
                  <td className="px-4 py-2"><span className={l.online ? "text-success" : "text-destructive"}>{l.online ? "online" : "offline"}</span></td>
                  <td className="px-4 py-2">{l.toner_preto ?? "—"}</td>
                  <td className="px-4 py-2">{l.toner_ciano ?? "—"}</td>
                  <td className="px-4 py-2">{l.toner_magenta ?? "—"}</td>
                  <td className="px-4 py-2">{l.toner_amarelo ?? "—"}</td>
                  <td className="px-4 py-2">{l.papel_pct ?? "—"}</td>
                  <td className="px-4 py-2">{l.contador_impressoes?.toLocaleString("pt-PT") ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: typeof Wifi; label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${color}`} />
      </div>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function TonerBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-medium">{label}</span>
        <span className="font-mono font-bold">{value != null ? `${value}%` : "—"}</span>
      </div>
      <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${v}%`, opacity: value == null ? 0.2 : 1 }} />
      </div>
    </div>
  );
}

function previsaoConsumo(leituras: Leitura[]) {
  if (leituras.length < 2) return null;
  const sorted = [...leituras].sort((a, b) => +new Date(a.capturado_em) - +new Date(b.capturado_em));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstMin = Math.min(...[first.toner_preto, first.toner_ciano, first.toner_magenta, first.toner_amarelo].filter((v): v is number => v != null), 999);
  const lastMin = Math.min(...[last.toner_preto, last.toner_ciano, last.toner_magenta, last.toner_amarelo].filter((v): v is number => v != null), 999);
  if (firstMin === 999 || lastMin === 999) return null;
  const delta = firstMin - lastMin;
  const dias = (+new Date(last.capturado_em) - +new Date(first.capturado_em)) / (1000 * 60 * 60 * 24);
  if (dias < 0.1 || delta <= 0) return null;
  const diaria = delta / dias;
  const diasRestantes = Math.max(0, Math.floor(lastMin / diaria));
  return { diaria, diasRestantes };
}
