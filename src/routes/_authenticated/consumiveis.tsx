import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/consumiveis")({
  component: ConsumiveisPage,
});

function ConsumiveisPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["consumiveis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("estoque_consumiveis").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Consumíveis</h1>
        <p className="text-muted-foreground text-sm">Controle de estoque de tinteiros, cabos, papel e demais consumíveis.</p>
      </div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <th className="px-6 py-3">Item</th>
              <th className="px-6 py-3">Categoria</th>
              <th className="px-6 py-3">Quantidade</th>
              <th className="px-6 py-3">Mínimo</th>
              <th className="px-6 py-3">Localização</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">Nenhum consumível cadastrado. (Em breve: cadastro completo na Etapa 2)</td></tr>
            ) : (
              data.map((c) => {
                const baixo = c.quantidade <= c.estoque_minimo;
                return (
                  <tr key={c.id} className="hover:bg-secondary/40">
                    <td className="px-6 py-3 font-medium text-sm">{c.nome}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{c.categoria ?? "—"}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={baixo ? "text-destructive font-bold" : ""}>{c.quantidade} {c.unidade}</span>
                      {baixo && <AlertTriangle className="size-3.5 inline-block ml-2 text-destructive" />}
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{c.estoque_minimo} {c.unidade}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{c.localizacao ?? "—"}</td>
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
