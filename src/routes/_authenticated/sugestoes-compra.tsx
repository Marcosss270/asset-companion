import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/sugestoes-compra")({
  component: SugestoesPage,
});

type Sugestao = {
  id: string;
  empresa_id: string | null;
  ativo_id: string | null;
  item: string;
  quantidade: number;
  urgencia: "baixa" | "media" | "alta" | "critica";
  motivo: string | null;
  status: "pendente" | "aprovada" | "comprada" | "cancelada";
  created_at: string;
  empresas: { sigla: string; nome: string } | null;
  ativos: { codigo_unico: string; nome: string } | null;
};

const URGENCIA_CLS: Record<string, string> = {
  baixa: "bg-info/10 text-info border-info/20",
  media: "bg-warning/15 text-warning border-warning/30",
  alta: "bg-destructive/10 text-destructive border-destructive/20",
  critica: "bg-destructive text-destructive-foreground border-destructive",
};

const STATUS_CLS: Record<string, string> = {
  pendente: "bg-secondary text-foreground border-border",
  aprovada: "bg-info/10 text-info border-info/20",
  comprada: "bg-success/10 text-success border-success/20",
  cancelada: "bg-muted text-muted-foreground border-border",
};

function SugestoesPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["sugestoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sugestoes_compra" as never)
        .select("*, empresas(sigla, nome), ativos(codigo_unico, nome)")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Sugestao[];
    },
  });

  const updateStatus = async (id: string, status: Sugestao["status"]) => {
    const { error } = await supabase.from("sugestoes_compra" as never).update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["sugestoes"] }); }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingCart className="size-6 text-accent" /> Sugestões de Compra
        </h1>
        <p className="text-muted-foreground text-sm">Recomendações geradas automaticamente pelo motor de automação.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {data.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted-foreground">Nenhuma sugestão pendente.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Qtd</th>
                <th className="px-4 py-3">Urgência</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(s.created_at).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded font-bold">{s.empresas?.sigla ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2">
                    <p className="font-semibold">{s.item}</p>
                    {s.ativos && <p className="text-[10px] font-mono text-muted-foreground">{s.ativos.codigo_unico}</p>}
                  </td>
                  <td className="px-4 py-2 font-mono font-bold tabular-nums">{s.quantidade}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${URGENCIA_CLS[s.urgencia]}`}>
                      {s.urgencia}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground max-w-xs truncate">{s.motivo}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${STATUS_CLS[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {s.status === "pendente" && (
                      <div className="inline-flex gap-1">
                        <button onClick={() => updateStatus(s.id, "aprovada")} className="size-7 rounded-md hover:bg-success/15 text-success flex items-center justify-center" title="Aprovar">
                          <Check className="size-4" />
                        </button>
                        <button onClick={() => updateStatus(s.id, "cancelada")} className="size-7 rounded-md hover:bg-destructive/15 text-destructive flex items-center justify-center" title="Cancelar">
                          <X className="size-4" />
                        </button>
                      </div>
                    )}
                    {s.status === "aprovada" && (
                      <button onClick={() => updateStatus(s.id, "comprada")} className="text-xs font-semibold text-success hover:underline">
                        Marcar comprada
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
