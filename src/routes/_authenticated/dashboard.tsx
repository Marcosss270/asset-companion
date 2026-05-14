import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS } from "@/lib/asset-utils";
import { AlertTriangle, Clock, Boxes, CheckCircle2, Wrench, PackageX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: ativos = [] } = useQuery({
    queryKey: ["ativos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos")
        .select("id, codigo_unico, nome, marca, modelo, status, responsavel, categoria_id, categorias(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: consumiveis = [] } = useQuery({
    queryKey: ["consumiveis-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("estoque_consumiveis").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = ativos.length;
  const emUso = ativos.filter((a) => a.status === "em_uso").length;
  const emManutencao = ativos.filter((a) => a.status === "em_manutencao").length;
  const obsoletos = ativos.filter((a) => a.status === "obsoleto" || a.status === "baixado").length;
  const estoqueBaixo = consumiveis.filter((c) => c.quantidade <= c.estoque_minimo).length;
  const disponiveis = ativos.filter((a) => a.status === "disponivel").length;

  // Distribuição por categoria
  const porCategoria = new Map<string, number>();
  ativos.forEach((a) => {
    const nome = (a.categorias as { nome: string } | null)?.nome ?? "Outros";
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + 1);
  });
  const categorias = Array.from(porCategoria.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const recentes = ativos.slice(0, 6);

  const stats = [
    { label: "Total de Ativos", value: total, icon: Boxes, accent: "text-foreground" },
    { label: "Em Uso", value: emUso, icon: CheckCircle2, accent: "text-success" },
    { label: "Disponíveis", value: disponiveis, icon: Boxes, accent: "text-info" },
    { label: "Em Manutenção", value: emManutencao, icon: Wrench, accent: "text-warning" },
    { label: "Obsoletos / Baixados", value: obsoletos, icon: PackageX, accent: "text-muted-foreground" },
    { label: "Estoque Baixo", value: estoqueBaixo, icon: AlertTriangle, accent: "text-destructive" },
  ];

  const colors = ["bg-accent", "bg-success", "bg-warning", "bg-destructive", "bg-info", "bg-muted-foreground"];

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard de Inventário</h1>
          <p className="text-muted-foreground text-sm">Monitoramento global de ativos em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 border border-border bg-card text-xs font-semibold rounded hover:bg-secondary transition-colors">
            Exportar PDF
          </button>
          <button className="px-3 py-1.5 border border-border bg-card text-xs font-semibold rounded hover:bg-secondary transition-colors">
            Exportar Excel
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="bg-card p-5 rounded-xl border border-border shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{label}</p>
              <Icon className={`size-4 ${accent}`} />
            </div>
            <h3 className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recentes */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold">Ativos Recentes</h2>
            <Link to="/ativos" className="text-accent text-sm font-medium hover:underline">
              Ver todos →
            </Link>
          </div>
          {recentes.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              Nenhum ativo cadastrado ainda.{" "}
              <Link to="/ativos/novo" className="text-accent font-medium hover:underline">
                Cadastrar primeiro
              </Link>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  <th className="px-6 py-3">Código</th>
                  <th className="px-6 py-3">Ativo</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentes.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        to="/ativos/$id"
                        params={{ id: a.id }}
                        className="font-mono text-xs font-semibold text-muted-foreground hover:text-accent"
                      >
                        {a.codigo_unico}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-sm">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {[a.marca, a.modelo].filter(Boolean).join(" • ") || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-sm">{a.responsavel ?? "—"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Side */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Alertas Críticos
            </h2>
            <div className="space-y-3">
              {estoqueBaixo > 0 && (
                <div className="flex items-start gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                  <AlertTriangle className="size-4 mt-0.5 text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-destructive">Estoque Baixo</p>
                    <p className="text-xs text-destructive/80">
                      {estoqueBaixo} item(ns) consumível(eis) abaixo do mínimo.
                    </p>
                  </div>
                </div>
              )}
              {emManutencao > 0 && (
                <div className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
                  <Clock className="size-4 mt-0.5 text-warning shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Em Manutenção</p>
                    <p className="text-xs text-muted-foreground">
                      {emManutencao} equipamento(s) requerem atenção.
                    </p>
                  </div>
                </div>
              )}
              {estoqueBaixo === 0 && emManutencao === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum alerta ativo no momento.
                </p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold mb-4">Distribuição por Categoria</h2>
            {categorias.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Sem dados ainda.</p>
            ) : (
              <div className="space-y-3">
                {categorias.map(([nome, count], i) => {
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={nome}>
                      <div className="flex justify-between text-xs mb-1 font-medium">
                        <span>{nome}</span>
                        <span className="text-muted-foreground">{count} • {pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`${colors[i % colors.length]} h-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold mb-4">Status Operacional</h2>
            <div className="space-y-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const count = ativos.filter((a) => a.status === key).length;
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-semibold tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
