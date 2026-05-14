import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS } from "@/lib/asset-utils";

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  component: MovimentacoesPage,
});

function MovimentacoesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["movimentacoes-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*, ativos(codigo_unico, nome)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Movimentações</h1>
        <p className="text-muted-foreground text-sm">Auditoria completa de alterações nos ativos.</p>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Ativo</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">Sem movimentações registradas.</td></tr>
            ) : (
              data.map((m) => {
                const ativo = m.ativos as { codigo_unico: string; nome: string } | null;
                return (
                  <tr key={m.id} className="hover:bg-secondary/40">
                    <td className="px-6 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-mono text-xs font-semibold">{ativo?.codigo_unico}</p>
                      <p className="text-xs text-muted-foreground">{ativo?.nome}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded-full capitalize font-medium">
                        {m.tipo.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {m.status_anterior && m.status_novo && (
                        <span>{STATUS_LABELS[m.status_anterior]} → <span className="font-medium text-foreground">{STATUS_LABELS[m.status_novo]}</span></span>
                      )}
                      {m.responsavel_novo && (
                        <span>{m.responsavel_anterior ?? "—"} → <span className="font-medium text-foreground">{m.responsavel_novo}</span></span>
                      )}
                      {m.localizacao_nova && (
                        <span>{m.localizacao_anterior ?? "—"} → <span className="font-medium text-foreground">{m.localizacao_nova}</span></span>
                      )}
                      {!m.status_anterior && !m.responsavel_novo && !m.localizacao_nova && (m.descricao ?? "—")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
