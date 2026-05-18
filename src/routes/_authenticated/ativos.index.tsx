import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS, STATUS_OPTIONS, type AtivoStatus } from "@/lib/asset-utils";

export const Route = createFileRoute("/_authenticated/ativos/")({
  component: AtivosListPage,
});

function AtivosListPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<AtivoStatus | "todos">("todos");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [empresaFilter, setEmpresaFilter] = useState<string>("todas");

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => (await supabase.from("categorias").select("*").order("nome")).data ?? [],
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => (await supabase.from("empresas").select("*").order("nome")).data ?? [],
  });

  const { data: ativos = [], isLoading } = useQuery({
    queryKey: ["ativos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos")
        .select("id, codigo_unico, nome, marca, modelo, numero_serie, status, localizacao, responsavel, categoria_id, empresa_id, categorias(nome), empresas(sigla)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = ativos.filter((a) => {
    if (statusFilter !== "todos" && a.status !== statusFilter) return false;
    if (categoriaFilter !== "todas" && a.categoria_id !== categoriaFilter) return false;
    if (empresaFilter !== "todas" && a.empresa_id !== empresaFilter) return false;
    if (q.trim()) {
      const needle = q.toLowerCase();
      const hay = [a.codigo_unico, a.nome, a.marca, a.modelo, a.numero_serie, a.responsavel, a.localizacao]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ativos & Equipamentos</h1>
          <p className="text-muted-foreground text-sm">{ativos.length} cadastrados • {filtered.length} mostrando</p>
        </div>
        <Link to="/ativos/novo" className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 shadow-sm">
          <Plus className="size-4" /> Novo Ativo
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-card flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute inset-y-0 left-3 h-full w-4 text-muted-foreground pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, nome, série, responsável..."
            className="w-full pl-10 pr-4 py-2 bg-secondary border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select value={empresaFilter} onChange={(e) => setEmpresaFilter(e.target.value)} className="px-3 py-2 bg-secondary border-none rounded-lg text-sm outline-none cursor-pointer">
          <option value="todas">Todas as empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome} ({e.sigla})</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AtivoStatus | "todos")} className="px-3 py-2 bg-secondary border-none rounded-lg text-sm outline-none cursor-pointer">
          <option value="todos">Todos os status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)} className="px-3 py-2 bg-secondary border-none rounded-lg text-sm outline-none cursor-pointer">
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">Empresa</th>
                <th className="px-6 py-3">Ativo</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Localização</th>
                <th className="px-6 py-3">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">Nenhum ativo encontrado.</td></tr>
              ) : (
                filtered.map((a) => {
                  const emp = a.empresas as { sigla: string } | null;
                  return (
                    <tr key={a.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-6 py-3">
                        <Link to="/ativos/$id" params={{ id: a.id }} className="font-mono text-xs font-semibold text-foreground hover:text-accent">
                          {a.codigo_unico}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded font-bold">{emp?.sigla ?? "—"}</span>
                      </td>
                      <td className="px-6 py-3">
                        <p className="font-semibold text-sm">{a.nome}</p>
                        <p className="text-xs text-muted-foreground">{[a.marca, a.modelo].filter(Boolean).join(" • ") || "—"}</p>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{(a.categorias as { nome: string } | null)?.nome ?? "—"}</td>
                      <td className="px-6 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{a.localizacao ?? "—"}</td>
                      <td className="px-6 py-3 text-sm">{a.responsavel ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
