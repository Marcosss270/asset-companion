import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Building2, Tag, Activity, PackageOpen, ArrowLeftRight, AlertTriangle, Coins, Wrench, ShieldCheck, ChevronRight, FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS, STATUS_OPTIONS, type AtivoStatus } from "@/lib/asset-utils";
import { ReportViewer } from "@/components/report-viewer";
import type { ReportSpec } from "@/lib/reports/export";
import type { ReportFilters } from "@/lib/reports/data";
import * as R from "@/lib/reports/data";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

interface ReportDef {
  id: string;
  titulo: string;
  desc: string;
  icon: typeof Boxes;
  build: (f: ReportFilters) => Promise<ReportSpec>;
  usaFiltro?: ("empresa" | "categoria" | "status" | "periodo")[];
}

const REPORTS_ATIVOS: ReportDef[] = [
  { id: "a-geral", titulo: "Geral de Ativos", desc: "Inventário completo.", icon: Boxes, build: R.reportAtivosGeral, usaFiltro: ["empresa", "categoria", "status"] },
  { id: "a-empresa", titulo: "Ativos por Empresa", desc: "Totais e custo consolidado.", icon: Building2, build: R.reportAtivosPorEmpresa },
  { id: "a-cat", titulo: "Ativos por Categoria", desc: "Distribuição por categoria.", icon: Tag, build: R.reportAtivosPorCategoria },
  { id: "a-est", titulo: "Ativos por Estado", desc: "Quantidade por status.", icon: Activity, build: R.reportAtivosPorEstado },
];

const REPORTS_CONSUMIVEIS: ReportDef[] = [
  { id: "c-est", titulo: "Estoque Atual", desc: "Todos os consumíveis.", icon: PackageOpen, build: R.reportEstoqueAtual },
  { id: "c-cons", titulo: "Consumo no Período", desc: "Alertas de consumo registrados.", icon: ArrowLeftRight, build: R.reportConsumoPeriodo, usaFiltro: ["periodo"] },
  { id: "c-mov", titulo: "Histórico de Movimentações", desc: "Auditoria por período.", icon: ArrowLeftRight, build: R.reportMovimentacoes, usaFiltro: ["periodo"] },
  { id: "c-crit", titulo: "Produtos Críticos", desc: "Itens abaixo do mínimo.", icon: AlertTriangle, build: R.reportProdutosCriticos },
];

const REPORTS_FIN: ReportDef[] = [
  { id: "f-pat-emp", titulo: "Valor Patrimonial por Empresa", desc: "Soma de custos por empresa.", icon: Coins, build: R.reportPatrimonialPorEmpresa },
  { id: "f-pat-tot", titulo: "Valor Patrimonial Total", desc: "Inventário valorado.", icon: Coins, build: R.reportPatrimonialTotal },
  { id: "f-manut", titulo: "Custos de Manutenção", desc: "Despesas no período.", icon: Wrench, build: R.reportCustosManutencao, usaFiltro: ["periodo"] },
  { id: "f-manut-cat", titulo: "Custos por Categoria", desc: "Manutenção por tipo de ativo.", icon: Wrench, build: R.reportCustosPorCategoria },
  { id: "f-gar", titulo: "Garantias Próximas do Vencimento", desc: "Acompanhamento de garantias.", icon: ShieldCheck, build: R.reportGarantiasVencimento },
];

function RelatoriosPage() {
  const [open, setOpen] = useState<ReportDef | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => (await supabase.from("empresas").select("id, nome, sigla").order("nome")).data ?? [],
  });
  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => (await supabase.from("categorias").select("id, nome").order("nome")).data ?? [],
  });

  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central de Relatórios</h1>
          <p className="text-muted-foreground text-sm">Relatórios executivos com exportação em PDF, Excel e impressão.</p>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5"><FileBarChart className="size-4" /> {REPORTS_ATIVOS.length + REPORTS_CONSUMIVEIS.length + REPORTS_FIN.length} relatórios disponíveis</div>
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        empresas={empresas}
        categorias={categorias}
      />

      <Section titulo="Ativos & Equipamentos" defs={REPORTS_ATIVOS} onOpen={setOpen} />
      <Section titulo="Consumíveis & Estoque" defs={REPORTS_CONSUMIVEIS} onOpen={setOpen} />
      <Section titulo="Financeiros & Patrimônio" defs={REPORTS_FIN} onOpen={setOpen} />

      {open && (
        <ReportViewer
          load={() => open.build(filters)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function Section({ titulo, defs, onOpen }: { titulo: string; defs: ReportDef[]; onOpen: (d: ReportDef) => void }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">{titulo}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {defs.map((d) => {
          const Icon = d.icon;
          return (
            <button key={d.id} onClick={() => onOpen(d)} className="text-left bg-card border border-border rounded-xl p-4 shadow-card hover:shadow-md hover:border-accent/40 transition-all group">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm truncate">{d.titulo}</h3>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-accent shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterBar({ filters, setFilters, empresas, categorias }: { filters: ReportFilters; setFilters: (f: ReportFilters) => void; empresas: { id: string; nome: string; sigla: string }[]; categorias: { id: string; nome: string }[] }) {
  const cls = "text-xs px-3 py-1.5 bg-card border border-border rounded-md outline-none focus:ring-2 focus:ring-accent/30";
  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-card flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-2">Filtros globais</span>
      <select className={cls} value={filters.empresa_id ?? ""} onChange={(e) => setFilters({ ...filters, empresa_id: e.target.value || undefined })}>
        <option value="">Todas as empresas</option>
        {empresas.map((e) => <option key={e.id} value={e.id}>{e.sigla} — {e.nome}</option>)}
      </select>
      <select className={cls} value={filters.categoria_id ?? ""} onChange={(e) => setFilters({ ...filters, categoria_id: e.target.value || undefined })}>
        <option value="">Todas as categorias</option>
        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <select className={cls} value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}>
        <option value="">Todos os estados</option>
        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s as AtivoStatus]}</option>)}
      </select>
      <label className="text-xs text-muted-foreground ml-2">De</label>
      <input type="date" className={cls} value={filters.inicio ?? ""} onChange={(e) => setFilters({ ...filters, inicio: e.target.value || undefined })} />
      <label className="text-xs text-muted-foreground">Até</label>
      <input type="date" className={cls} value={filters.fim ?? ""} onChange={(e) => setFilters({ ...filters, fim: e.target.value || undefined })} />
      {(filters.empresa_id || filters.categoria_id || filters.status || filters.inicio || filters.fim) && (
        <button onClick={() => setFilters({})} className="text-[10px] font-semibold text-accent hover:underline ml-auto">Limpar</button>
      )}
    </div>
  );
}
