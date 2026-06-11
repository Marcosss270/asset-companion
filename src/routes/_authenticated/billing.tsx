import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, DollarSign, Users, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
  head: () => ({ meta: [{ title: "Billing — Asset Companion" }] }),
});

function BillingPage() {
  const { isTenantMaster, isLoading } = useRole();
  const qc = useQueryClient();

  const { data: assinaturas = [], isLoading: loading } = useQuery({
    queryKey: ["assinaturas-all"],
    enabled: isTenantMaster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assinaturas")
        .select("*, organizacao:organizacoes(id, nome, sigla, estado), plano:planos(nome, slug, preco_mensal, preco_anual)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-12" />;
  if (!isTenantMaster) {
    return <div className="rounded-lg border border-border bg-card p-8 text-center"><p>Apenas Tenant Master tem acesso ao Billing.</p></div>;
  }

  const ativas = assinaturas.filter((a: any) => a.estado === "ativa");
  const trials = assinaturas.filter((a: any) => a.estado === "trial");
  const expiradas = assinaturas.filter((a: any) => a.estado === "expirada" || a.estado === "cancelada");
  const mrr = ativas.reduce((sum: number, a: any) => sum + Number(a.ciclo === "anual" ? (a.valor / 12) : a.valor), 0);
  const arr = mrr * 12;

  const setEstado = async (id: string, novo: string) => {
    const { error } = await supabase.from("assinaturas").update({ estado: novo as any }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Estado atualizado"); qc.invalidateQueries({ queryKey: ["assinaturas-all"] }); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Assinaturas</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão executiva SaaS.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi icon={<Users className="size-5" />} label="Orgs ativas" value={ativas.length} />
        <Kpi icon={<DollarSign className="size-5" />} label="MRR" value={`€${mrr.toFixed(0)}`} />
        <Kpi icon={<TrendingUp className="size-5" />} label="ARR estimado" value={`€${arr.toFixed(0)}`} />
        <Kpi icon={<Clock className="size-5" />} label="Trials ativos" value={trials.length} />
        <Kpi icon={<AlertCircle className="size-5" />} label="Expiradas" value={expiradas.length} />
      </div>

      {loading ? <Loader2 className="animate-spin mx-auto" /> : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Organização</th>
                <th className="px-4 py-3 text-left">Plano</th>
                <th className="px-4 py-3 text-left">Ciclo</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Renovação</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {assinaturas.map((a: any) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{a.organizacao?.nome}</td>
                  <td className="px-4 py-3">{a.plano?.nome}</td>
                  <td className="px-4 py-3 capitalize">{a.ciclo}</td>
                  <td className="px-4 py-3"><EstadoBadge estado={a.estado} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{a.data_renovacao ?? "—"}</td>
                  <td className="px-4 py-3">€{Number(a.valor).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {a.estado === "ativa" && <Button size="sm" variant="outline" onClick={() => setEstado(a.id, "suspensa")}>Suspender</Button>}
                    {a.estado === "suspensa" && <Button size="sm" onClick={() => setEstado(a.id, "ativa")}>Reativar</Button>}
                    {a.estado === "trial" && <Button size="sm" onClick={() => setEstado(a.id, "ativa")}>Ativar</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-wider">{icon}{label}</div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    ativa: "bg-green-500/15 text-green-600",
    trial: "bg-blue-500/15 text-blue-600",
    suspensa: "bg-yellow-500/15 text-yellow-600",
    cancelada: "bg-muted text-muted-foreground",
    expirada: "bg-red-500/15 text-red-600",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${map[estado] ?? "bg-muted"}`}>{estado}</span>;
}
