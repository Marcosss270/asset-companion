import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, PackageOpen, ShieldAlert, Wrench, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/alertas")({
  component: AlertasPage,
});

function AlertasPage() {
  const { data: consumiveis = [] } = useQuery({
    queryKey: ["consumiveis-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("estoque_consumiveis").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: ativos = [] } = useQuery({
    queryKey: ["ativos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos")
        .select("id, codigo_unico, nome, status, garantia_ate, responsavel")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: manutencoes = [] } = useQuery({
    queryKey: ["manutencoes-abertas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes")
        .select("id, ativo_id, descricao, data_inicio, status, ativos(codigo_unico, nome)")
        .neq("status", "concluida")
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date();
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);

  const lowStock = consumiveis.filter((c) => c.quantidade <= c.estoque_minimo);
  const warrantyExpiring = ativos.filter((a) => {
    if (!a.garantia_ate) return false;
    const d = new Date(a.garantia_ate);
    return d <= in30 && d >= today;
  });
  const warrantyExpired = ativos.filter((a) => {
    if (!a.garantia_ate) return false;
    return new Date(a.garantia_ate) < today;
  });

  const total = lowStock.length + warrantyExpiring.length + warrantyExpired.length + manutencoes.length;

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Central de Alertas</h1>
        <p className="text-muted-foreground text-sm">
          {total} {total === 1 ? "alerta ativo" : "alertas ativos"} no inventário.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat icon={PackageOpen} label="Estoque baixo" value={lowStock.length} tone="destructive" />
        <Stat icon={Calendar} label="Garantia ≤ 30 dias" value={warrantyExpiring.length} tone="warning" />
        <Stat icon={ShieldAlert} label="Garantia expirada" value={warrantyExpired.length} tone="muted" />
        <Stat icon={Wrench} label="Manutenções abertas" value={manutencoes.length} tone="info" />
      </div>

      <Section title="Consumíveis abaixo do mínimo" icon={PackageOpen} empty={lowStock.length === 0 ? "Todos os estoques estão saudáveis." : null}>
        {lowStock.map((c) => (
          <Row
            key={c.id}
            title={c.nome}
            subtitle={`${c.quantidade} ${c.unidade} • mínimo ${c.estoque_minimo}`}
            badge="Crítico"
            tone="destructive"
            href="/consumiveis"
          />
        ))}
      </Section>

      <Section title="Garantias prestes a expirar (30 dias)" icon={Calendar} empty={warrantyExpiring.length === 0 ? "Nenhuma garantia próxima do vencimento." : null}>
        {warrantyExpiring.map((a) => (
          <Row
            key={a.id}
            title={a.nome}
            subtitle={`${a.codigo_unico} • vence em ${new Date(a.garantia_ate!).toLocaleDateString("pt-BR")}`}
            badge="Atenção"
            tone="warning"
            href={`/ativos/${a.id}`}
          />
        ))}
      </Section>

      <Section title="Garantias expiradas" icon={ShieldAlert} empty={warrantyExpired.length === 0 ? "Nenhum ativo com garantia expirada." : null}>
        {warrantyExpired.map((a) => (
          <Row
            key={a.id}
            title={a.nome}
            subtitle={`${a.codigo_unico} • expirou em ${new Date(a.garantia_ate!).toLocaleDateString("pt-BR")}`}
            badge="Expirada"
            tone="muted"
            href={`/ativos/${a.id}`}
          />
        ))}
      </Section>

      <Section title="Manutenções em aberto" icon={Wrench} empty={manutencoes.length === 0 ? "Nenhuma manutenção pendente." : null}>
        {manutencoes.map((m) => {
          const ativo = m.ativos as { codigo_unico: string; nome: string } | null;
          return (
            <Row
              key={m.id}
              title={ativo?.nome ?? "Ativo"}
              subtitle={`${ativo?.codigo_unico ?? ""} • ${m.descricao}`}
              badge={m.status}
              tone="info"
              href="/manutencao"
            />
          );
        })}
      </Section>
    </div>
  );
}

const TONE = {
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-info/10 text-info border-info/20",
  muted: "bg-muted text-muted-foreground border-border",
} as const;

function Stat({ icon: Icon, label, value, tone }: { icon: typeof AlertTriangle; label: string; value: number; tone: keyof typeof TONE }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className={`text-2xl font-bold tabular-nums ${value > 0 ? TONE[tone].split(" ")[1] : "text-muted-foreground"}`}>{value}</p>
    </div>
  );
}

function Section({ title, icon: Icon, empty, children }: { title: string; icon: typeof AlertTriangle; empty: string | null; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
        <Icon className="size-4 text-accent" /> {title}
      </h2>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {empty ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>
        ) : (
          <ul className="divide-y divide-border">{children}</ul>
        )}
      </div>
    </div>
  );
}

function Row({ title, subtitle, badge, tone, href }: { title: string; subtitle: string; badge: string; tone: keyof typeof TONE; href: string }) {
  return (
    <li>
      <Link to={href} className="flex items-center justify-between px-6 py-3 hover:bg-secondary/40 transition-colors">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${TONE[tone]} shrink-0 ml-3`}>{badge}</span>
      </Link>
    </li>
  );
}
