import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS } from "@/lib/asset-utils";
import { formatKZ } from "@/lib/format";
import { AlertTriangle, Clock, Boxes, CheckCircle2, Wrench, PackageX, Building2, Coins, Printer, Wifi, WifiOff, ShoppingCart, Activity, Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("todas");

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => (await supabase.from("empresas").select("*").order("nome")).data ?? [],
  });

  const { data: ativos = [] } = useQuery({
    queryKey: ["ativos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos")
        .select("id, codigo_unico, nome, marca, modelo, status, responsavel, categoria_id, custo, empresa_id, categorias(nome), empresas(nome, sigla)")
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

  const { data: manutencoes = [] } = useQuery({
    queryKey: ["manutencoes-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("manutencoes").select("ativo_id, custo, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: impressoras = [] } = useQuery({
    queryKey: ["impressoras-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("impressoras" as never).select("id, ip, status_online, ativos(nome, empresa_id, empresas(sigla))");
      return (data ?? []) as unknown as Array<{ id: string; ip: string; status_online: boolean; ativos: { nome: string; empresa_id: string; empresas: { sigla: string } | null } | null }>;
    },
    refetchInterval: 30000,
  });

  const { data: alertasAtivos = [] } = useQuery({
    queryKey: ["alertas-ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("alertas").select("*").eq("status", "ativo").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: sugestoesPendentes = [] } = useQuery({
    queryKey: ["sugestoes-pendentes"],
    queryFn: async () => {
      const { data } = await supabase.from("sugestoes_compra" as never).select("id, item, urgencia").eq("status", "pendente");
      return (data ?? []) as unknown as Array<{ id: string; item: string; urgencia: string }>;
    },
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores" as never).select("id, nome_empresa, status");
      return (data ?? []) as unknown as Array<{ id: string; nome_empresa: string; status: string }>;
    },
  });

  const { data: fornecedorProdutos = [] } = useQuery({
    queryKey: ["fp-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedor_produtos" as never).select("fornecedor_id, consumivel_id, ativo_id");
      return (data ?? []) as unknown as Array<{ fornecedor_id: string; consumivel_id: string | null; ativo_id: string | null }>;
    },
  });

  const ativosFiltrados = empresaFiltro === "todas" ? ativos : ativos.filter((a) => a.empresa_id === empresaFiltro);

  const total = ativosFiltrados.length;
  const emUso = ativosFiltrados.filter((a) => a.status === "em_uso").length;
  const emManutencao = ativosFiltrados.filter((a) => a.status === "em_manutencao").length;
  const obsoletos = ativosFiltrados.filter((a) => a.status === "obsoleto").length;
  const disponiveis = ativosFiltrados.filter((a) => a.status === "disponivel").length;
  const estoqueBaixo = consumiveis.filter((c) => c.quantidade <= c.estoque_minimo).length;
  const custoTotal = ativosFiltrados.reduce((acc, a) => acc + (Number(a.custo) || 0), 0);

  // Manutenção: filtra por ativos da empresa
  const ativoIds = new Set(ativosFiltrados.map((a) => a.id));
  const manutFiltradas = manutencoes.filter((m) => ativoIds.has(m.ativo_id));
  const custoManut = manutFiltradas.reduce((acc, m) => acc + (Number(m.custo) || 0), 0);

  // Por categoria
  const porCategoria = new Map<string, number>();
  ativosFiltrados.forEach((a) => {
    const nome = (a.categorias as { nome: string } | null)?.nome ?? "Outros";
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + 1);
  });
  const categorias = Array.from(porCategoria.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // KPI por empresa (sempre total grupo, mesmo se filtrando)
  const porEmpresa = empresas.map((emp) => {
    const itens = ativos.filter((a) => a.empresa_id === emp.id);
    return {
      ...emp,
      total: itens.length,
      custo: itens.reduce((acc, i) => acc + (Number(i.custo) || 0), 0),
      manut: manutencoes.filter((m) => itens.some((i) => i.id === m.ativo_id)).length,
    };
  });
  const maxEmpresa = Math.max(1, ...porEmpresa.map((e) => e.total));

  const recentes = ativosFiltrados.slice(0, 6);

  const stats = [
    { label: "Total de Ativos", value: total, icon: Boxes, accent: "text-foreground" },
    { label: "Custo Total", value: formatKZ(custoTotal), icon: Coins, accent: "text-foreground" },
    { label: "Em Uso", value: emUso, icon: CheckCircle2, accent: "text-success" },
    { label: "Disponíveis", value: disponiveis, icon: Boxes, accent: "text-info" },
    { label: "Em Manutenção", value: emManutencao, icon: Wrench, accent: "text-warning" },
    { label: "Custo Manutenção", value: formatKZ(custoManut), icon: Wrench, accent: "text-warning" },
    { label: "Obsoletos", value: obsoletos, icon: PackageX, accent: "text-muted-foreground" },
    { label: "Estoque Baixo", value: estoqueBaixo, icon: AlertTriangle, accent: "text-destructive" },
  ];

  const colors = ["bg-accent", "bg-success", "bg-warning", "bg-destructive", "bg-info", "bg-muted-foreground"];
  const empresaAtiva = empresas.find((e) => e.id === empresaFiltro);

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard — GRUPO A3</h1>
          <p className="text-muted-foreground text-sm">
            {empresaAtiva ? `Visão: ${empresaAtiva.nome} (${empresaAtiva.sigla})` : "Monitoramento global do grupo"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground" />
          <select
            value={empresaFiltro}
            onChange={(e) => setEmpresaFiltro(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium outline-none cursor-pointer focus:ring-2 focus:ring-accent/30"
          >
            <option value="todas">Todas as empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome} ({e.sigla})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="bg-card p-5 rounded-xl border border-border shadow-card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">{label}</p>
              <Icon className={`size-4 ${accent}`} />
            </div>
            <h3 className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</h3>
          </div>
        ))}
      </div>

      {/* Comparativo por empresa */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-card mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold">Comparativo por Empresa</h2>
          <span className="text-xs text-muted-foreground">{empresas.length} empresas do grupo</span>
        </div>
        <div className="space-y-4">
          {porEmpresa.map((emp, i) => {
            const pct = Math.round((emp.total / maxEmpresa) * 100);
            return (
              <div key={emp.id}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[10px] bg-secondary px-1.5 py-0.5 rounded">{emp.sigla}</span>
                    <span className="font-semibold">{emp.nome}</span>
                  </div>
                  <div className="flex gap-4 text-muted-foreground font-mono">
                    <span>{emp.total} ativos</span>
                    <span className="text-foreground">{formatKZ(emp.custo)}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={`${colors[i % colors.length]} h-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel de impressoras + alertas críticos + sugestões */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2"><Printer className="size-4 text-accent" /> Impressoras</h2>
            <Link to="/impressoras" className="text-accent text-xs font-medium hover:underline">Ver todas →</Link>
          </div>
          {impressoras.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma cadastrada.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Pill icon={Wifi} label="Online" value={impressoras.filter((p) => p.status_online).length} color="text-success" />
                <Pill icon={WifiOff} label="Offline" value={impressoras.filter((p) => !p.status_online).length} color="text-destructive" />
              </div>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {impressoras.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{p.ativos?.nome ?? p.ip}</span>
                    <span className={`size-2 rounded-full ${p.status_online ? "bg-success" : "bg-destructive"}`} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2"><Activity className="size-4 text-destructive" /> Alertas Ativos</h2>
            <Link to="/alertas" className="text-accent text-xs font-medium hover:underline">Ver →</Link>
          </div>
          {alertasAtivos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Tudo sob controle.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {alertasAtivos.map((a) => (
                <li key={a.id} className="text-xs flex items-start gap-2 p-2 bg-destructive/5 border border-destructive/15 rounded">
                  <AlertTriangle className="size-3 text-destructive mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{a.titulo}</p>
                    <p className="text-muted-foreground truncate">{a.mensagem}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2"><ShoppingCart className="size-4 text-accent" /> Sugestões de Compra</h2>
            <Link to="/sugestoes-compra" className="text-accent text-xs font-medium hover:underline">Ver →</Link>
          </div>
          {sugestoesPendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma pendente.</p>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums mb-2">{sugestoesPendentes.length}</p>
              <p className="text-xs text-muted-foreground mb-3">item(ns) pendente(s) de aprovação.</p>
              <div className="flex flex-wrap gap-1">
                {["critica", "alta", "media", "baixa"].map((u) => {
                  const n = sugestoesPendentes.filter((s) => s.urgencia === u).length;
                  if (n === 0) return null;
                  return <span key={u} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary uppercase">{u}: {n}</span>;
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Painel de fornecedores */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2"><Truck className="size-4 text-accent" /> Fornecedores</h2>
          <Link to="/fornecedores" className="text-accent text-xs font-medium hover:underline">Gerir →</Link>
        </div>
        {(() => {
          const ativos = fornecedores.filter((f) => f.status === "ativo").length;
          const idsCobertos = new Set(fornecedorProdutos.map((fp) => fp.consumivel_id).filter(Boolean));
          const semFornecedor = consumiveis.filter((c) => !idsCobertos.has(c.id)).length;
          const ranking = new Map<string, number>();
          fornecedorProdutos.forEach((fp) => ranking.set(fp.fornecedor_id, (ranking.get(fp.fornecedor_id) ?? 0) + 1));
          const top = Array.from(ranking.entries())
            .sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([id, n]) => ({ nome: fornecedores.find((f) => f.id === id)?.nome_empresa ?? "—", n }));
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid grid-cols-2 gap-3 md:col-span-1">
                <KPI label="Ativos" value={ativos} color="text-success" />
                <KPI label="Total" value={fornecedores.length} color="text-foreground" />
                <KPI label="Críticos sem fornec." value={semFornecedor} color="text-destructive" />
                <KPI label="Vínculos" value={fornecedorProdutos.length} color="text-info" />
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Mais utilizados</p>
                {top.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">Nenhum vínculo registrado ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {top.map((t, i) => {
                      const max = top[0].n || 1;
                      const pct = Math.round((t.n / max) * 100);
                      return (
                        <li key={t.nome + i}>
                          <div className="flex justify-between text-xs font-medium mb-1">
                            <span>{t.nome}</span>
                            <span className="font-mono text-muted-foreground">{t.n} produto(s)</span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="bg-accent h-full" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          );
        })()}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold">Ativos Recentes</h2>
            <Link to="/ativos" className="text-accent text-sm font-medium hover:underline">Ver todos →</Link>
          </div>
          {recentes.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              Nenhum ativo cadastrado.{" "}
              <Link to="/ativos/novo" className="text-accent font-medium hover:underline">Cadastrar primeiro</Link>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  <th className="px-6 py-3">Código</th>
                  <th className="px-6 py-3">Ativo</th>
                  <th className="px-6 py-3">Empresa</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentes.map((a) => {
                  const emp = a.empresas as { sigla: string } | null;
                  return (
                    <tr key={a.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-6 py-3.5">
                        <Link to="/ativos/$id" params={{ id: a.id }} className="font-mono text-xs font-semibold text-muted-foreground hover:text-accent">
                          {a.codigo_unico}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-sm">{a.nome}</p>
                        <p className="text-xs text-muted-foreground">{[a.marca, a.modelo].filter(Boolean).join(" • ") || "—"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded font-bold">{emp?.sigla ?? "—"}</span>
                      </td>
                      <td className="px-6 py-3.5"><StatusBadge status={a.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

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
                    <p className="text-xs text-destructive/80">{estoqueBaixo} consumível(eis) abaixo do mínimo.</p>
                  </div>
                </div>
              )}
              {emManutencao > 0 && (
                <div className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
                  <Clock className="size-4 mt-0.5 text-warning shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Em Manutenção</p>
                    <p className="text-xs text-muted-foreground">{emManutencao} equipamento(s) requerem atenção.</p>
                  </div>
                </div>
              )}
              {estoqueBaixo === 0 && emManutencao === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum alerta ativo.</p>
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
                const count = ativosFiltrados.filter((a) => a.status === key).length;
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

function Pill({ icon: Icon, label, value, color }: { icon: typeof Wifi; label: string; value: number; color: string }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-2 text-center">
      <Icon className={`size-3.5 mx-auto ${color}`} />
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 font-semibold">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-3">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

