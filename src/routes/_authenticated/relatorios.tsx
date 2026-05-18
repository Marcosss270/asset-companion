import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Boxes, PackageOpen, ArrowLeftRight, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/csv";
import { STATUS_LABELS, STATUS_OPTIONS, type AtivoStatus } from "@/lib/asset-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const [statusFiltro, setStatusFiltro] = useState<AtivoStatus | "todos">("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => (await supabase.from("categorias").select("*").order("nome")).data ?? [],
  });

  const exportAtivos = async () => {
    let q = supabase
      .from("ativos")
      .select("codigo_unico, nome, marca, modelo, numero_serie, status, localizacao, responsavel, custo, data_compra, garantia_ate, categorias(nome), empresas(nome, sigla)")
      .order("codigo_unico");
    if (statusFiltro !== "todos") q = q.eq("status", statusFiltro);
    if (categoriaFiltro !== "todas") q = q.eq("categoria_id", categoriaFiltro);
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.error("Nenhum dado para exportar");
    const rows = data.map((a) => ({
      Codigo: a.codigo_unico,
      Empresa: (a.empresas as { sigla: string } | null)?.sigla ?? "",
      Nome: a.nome,
      Marca: a.marca ?? "",
      Modelo: a.modelo ?? "",
      Serie: a.numero_serie ?? "",
      Categoria: (a.categorias as { nome: string } | null)?.nome ?? "",
      Status: STATUS_LABELS[a.status as AtivoStatus],
      Custo_KZ: a.custo ?? "",
      Localizacao: a.localizacao ?? "",
      Responsavel: a.responsavel ?? "",
      Data_Compra: a.data_compra ?? "",
      Garantia: a.garantia_ate ?? "",
    }));
    exportToCsv(`ativos-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success(`${rows.length} ativos exportados`);
  };

  const exportConsumiveis = async () => {
    const { data, error } = await supabase.from("estoque_consumiveis").select("*").order("nome");
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.error("Nenhum dado");
    exportToCsv(`consumiveis-${new Date().toISOString().slice(0, 10)}.csv`, data.map((c) => ({
      Nome: c.nome, Categoria: c.categoria ?? "", Quantidade: c.quantidade, Unidade: c.unidade,
      Estoque_Minimo: c.estoque_minimo, Localizacao: c.localizacao ?? "",
      Estoque_Baixo: c.quantidade <= c.estoque_minimo ? "SIM" : "NAO",
    })));
    toast.success(`${data.length} itens exportados`);
  };

  const exportMovimentacoes = async () => {
    const { data, error } = await supabase
      .from("movimentacoes")
      .select("created_at, tipo, descricao, status_anterior, status_novo, responsavel_anterior, responsavel_novo, localizacao_anterior, localizacao_nova, ativos(codigo_unico, nome)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.error("Nenhum dado");
    exportToCsv(`movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`, data.map((m) => ({
      Data: new Date(m.created_at).toLocaleString("pt-BR"),
      Ativo: (m.ativos as { codigo_unico: string } | null)?.codigo_unico ?? "",
      Nome_Ativo: (m.ativos as { nome: string } | null)?.nome ?? "",
      Tipo: m.tipo,
      Descricao: m.descricao ?? "",
      Status_De: m.status_anterior ?? "",
      Status_Para: m.status_novo ?? "",
      Responsavel_De: m.responsavel_anterior ?? "",
      Responsavel_Para: m.responsavel_novo ?? "",
      Local_De: m.localizacao_anterior ?? "",
      Local_Para: m.localizacao_nova ?? "",
    })));
    toast.success(`${data.length} movimentações exportadas`);
  };

  const exportManutencoes = async () => {
    const { data, error } = await supabase
      .from("manutencoes")
      .select("*, ativos(codigo_unico, nome)")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.error("Nenhum dado");
    exportToCsv(`manutencoes-${new Date().toISOString().slice(0, 10)}.csv`, data.map((m) => ({
      Ativo: (m.ativos as { codigo_unico: string } | null)?.codigo_unico ?? "",
      Nome_Ativo: (m.ativos as { nome: string } | null)?.nome ?? "",
      Tipo: m.tipo,
      Descricao: m.descricao,
      Tecnico: m.tecnico ?? "",
      Fornecedor: m.fornecedor ?? "",
      Custo: m.custo ?? "",
      Data_Inicio: m.data_inicio,
      Data_Conclusao: m.data_conclusao ?? "",
      Status: m.status,
    })));
    toast.success(`${data.length} manutenções exportadas`);
  };

  const cards = [
    {
      titulo: "Ativos & Equipamentos",
      desc: "Inventário completo com filtros por status e categoria.",
      icon: Boxes,
      action: exportAtivos,
      filters: true,
    },
    { titulo: "Consumíveis", desc: "Estoque atual com alerta de níveis críticos.", icon: PackageOpen, action: exportConsumiveis },
    { titulo: "Movimentações", desc: "Histórico de auditoria (últimos 5000 registros).", icon: ArrowLeftRight, action: exportMovimentacoes },
    { titulo: "Manutenções", desc: "Serviços, técnicos, custos e status.", icon: Wrench, action: exportManutencoes },
  ];

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Exportação de dados em CSV (compatível com Excel/Google Sheets).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((c) => (
          <div key={c.titulo} className="bg-card border border-border rounded-xl p-6 shadow-card">
            <div className="flex items-start gap-4 mb-4">
              <div className="size-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <c.icon className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{c.titulo}</h3>
                <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
              </div>
            </div>
            {c.filters && (
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border">
                <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as AtivoStatus | "todos")} className="text-xs px-2 py-1.5 bg-secondary rounded-md border-none outline-none">
                  <option value="todos">Todos os status</option>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
                <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="text-xs px-2 py-1.5 bg-secondary rounded-md border-none outline-none">
                  <option value="todas">Todas as categorias</option>
                  {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                </select>
              </div>
            )}
            <button
              onClick={c.action}
              className="w-full bg-foreground text-background px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <FileSpreadsheet className="size-4" /> Exportar CSV <Download className="size-3.5 ml-auto opacity-60" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
