import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/use-org";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planos")({
  component: PlanosPage,
  head: () => ({ meta: [{ title: "Planos — Asset Companion" }] }),
});

const FEATURE_LABELS: Record<string, string> = {
  garantias: "Gestão de Garantias",
  contratos: "Contratos e Serviços",
  licencas: "Licenças de Software",
  relatorios_avancados: "Relatórios Avançados",
  snmp: "Monitorização SNMP",
  agent: "A3 Agent",
  descoberta: "Descoberta de Rede",
  suporte_prioritario: "Suporte Prioritário",
};

function PlanosPage() {
  const { data: org } = useOrg();
  const { data: planos = [], isLoading } = useQuery({
    queryKey: ["planos-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planos").select("*").eq("ativo", true).order("ordem");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-12" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Planos & Preços</h1>
        <p className="text-muted-foreground mt-2">Escolha o plano ideal para a sua organização.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {planos.map((p: any) => {
          const isCurrent = org?.plano?.id === p.id;
          const isEnterprise = p.slug === "enterprise";
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-2xl border bg-card p-8 relative transition-all",
                isCurrent ? "border-accent ring-2 ring-accent shadow-lg" : "border-border hover:border-accent/50",
                isEnterprise && "bg-gradient-to-br from-card to-accent/5",
              )}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs px-3 py-1 rounded-full font-semibold">
                  Seu plano
                </span>
              )}
              {isEnterprise && <Crown className="size-5 text-accent absolute top-4 right-4" />}
              <h3 className="text-2xl font-bold">{p.nome}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">€{p.preco_mensal}</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">ou €{p.preco_anual}/ano</p>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-green-600" />
                  {p.limite_ativos ? `Até ${p.limite_ativos.toLocaleString()} ativos` : "Ativos ilimitados"}
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-green-600" />
                  {p.limite_usuarios ? `Até ${p.limite_usuarios} utilizadores` : "Utilizadores ilimitados"}
                </div>
                {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                  const has = !!p.features?.[key];
                  return (
                    <div key={key} className={cn("flex items-center gap-2", !has && "text-muted-foreground/50")}>
                      {has ? <Check className="size-4 text-green-600" /> : <X className="size-4" />}
                      {label}
                    </div>
                  );
                })}
              </div>

              <button
                disabled={isCurrent}
                className={cn(
                  "w-full mt-6 py-2.5 rounded-lg font-semibold text-sm transition-colors",
                  isCurrent ? "bg-muted text-muted-foreground cursor-default" : "bg-accent text-accent-foreground hover:bg-accent/90",
                )}
              >
                {isCurrent ? "Plano atual" : "Selecionar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
