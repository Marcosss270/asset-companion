import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/auditoria")({
  component: AuditoriaPage,
});

const ACAO_BADGE: Record<string, string> = {
  create: "bg-success/10 text-success border-success/30",
  update: "bg-info/10 text-info border-info/30",
  delete: "bg-destructive/10 text-destructive border-destructive/30",
  restore: "bg-warning/10 text-warning border-warning/30",
};

function AuditoriaPage() {
  const { isManager, isLoading } = useRole();
  const [q, setQ] = useState("");
  const [entidade, setEntidade] = useState("");
  const [acao, setAcao] = useState("");
  const [desde, setDesde] = useState("");

  const { data = [], isLoading: loading } = useQuery({
    enabled: isManager,
    queryKey: ["audit-log", entidade, acao, desde],
    queryFn: async () => {
      let qb = supabase.from("audit_log").select("*, profiles:usuario_id(nome,email)").order("created_at", { ascending: false }).limit(300);
      if (entidade) qb = qb.eq("entidade", entidade);
      if (acao) qb = qb.eq("acao", acao);
      if (desde) qb = qb.gte("created_at", desde);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const term = q.toLowerCase();
    return data.filter((r) => {
      const p = (r.profiles as { nome?: string; email?: string } | null) ?? null;
      return r.descricao?.toLowerCase().includes(term) || p?.nome?.toLowerCase().includes(term) || p?.email?.toLowerCase().includes(term) || r.entidade.toLowerCase().includes(term);
    });
  }, [data, q]);

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Carregando…</div>;
  if (!isManager) return <EmptyState icon={History} title="Acesso restrito" description="Esta página é visível para administradores e gestores." />;

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><History className="size-6" /> Auditoria</h1>
        <p className="text-muted-foreground text-sm">Histórico completo de alterações no sistema.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar utilizador, entidade…" className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-md text-sm" />
        </div>
        <select value={entidade} onChange={(e) => setEntidade(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-md text-sm">
          <option value="">Todas entidades</option>
          {["licencas_software","licenca_atribuicoes","contratos","contrato_documentos","empresas","fornecedores","categorias","estoque_consumiveis","ativo_garantias"].map((e) => <option key={e}>{e}</option>)}
        </select>
        <select value={acao} onChange={(e) => setAcao(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-md text-sm">
          <option value="">Todas ações</option>
          <option value="create">Criação</option>
          <option value="update">Edição</option>
          <option value="delete">Exclusão</option>
        </select>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-md text-sm" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            <tr><th className="px-4 py-3">Quando</th><th className="px-4 py-3">Quem</th><th className="px-4 py-3">Entidade</th><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Descrição</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Carregando…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Nenhum registo.</td></tr>
              : filtered.map((r) => {
                const p = (r.profiles as { nome?: string; email?: string } | null) ?? null;
                return (
                  <tr key={r.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-PT")}</td>
                    <td className="px-4 py-2 text-xs">{p?.nome ?? p?.email ?? <span className="text-muted-foreground">sistema</span>}</td>
                    <td className="px-4 py-2 text-xs font-mono">{r.entidade}</td>
                    <td className="px-4 py-2"><span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium ${ACAO_BADGE[r.acao] ?? "bg-secondary"}`}>{r.acao}</span></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.descricao}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
