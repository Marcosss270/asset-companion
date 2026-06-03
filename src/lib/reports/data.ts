import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS, type AtivoStatus } from "@/lib/asset-utils";
import type { ReportSpec } from "./export";

export interface ReportFilters {
  empresa_id?: string;
  categoria_id?: string;
  status?: string;
  inicio?: string;
  fim?: string;
}

const fmtKZ = (n: number | null | undefined) => Number(n ?? 0).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function reportAtivosGeral(f: ReportFilters): Promise<ReportSpec> {
  let q = supabase.from("ativos").select("codigo_unico, nome, marca, modelo, numero_serie, status, custo, localizacao, responsavel, data_compra, garantia_ate, categorias(nome), empresas(nome, sigla)").order("codigo_unico");
  if (f.empresa_id) q = q.eq("empresa_id", f.empresa_id);
  if (f.categoria_id) q = q.eq("categoria_id", f.categoria_id);
  if (f.status) q = q.eq("status", f.status as AtivoStatus);
  const { data } = await q;
  return {
    titulo: "Relatório Geral de Ativos",
    filtros: filtroLabel(f),
    colunas: ["Código", "Empresa", "Nome", "Marca", "Modelo", "Série", "Categoria", "Status", "Custo (KZ)", "Localização", "Responsável", "Compra", "Garantia"],
    linhas: (data ?? []).map((a) => [
      a.codigo_unico, (a.empresas as { sigla: string } | null)?.sigla ?? "", a.nome, a.marca ?? "", a.modelo ?? "", a.numero_serie ?? "",
      (a.categorias as { nome: string } | null)?.nome ?? "", STATUS_LABELS[a.status as AtivoStatus] ?? a.status,
      fmtKZ(a.custo as number | null), a.localizacao ?? "", a.responsavel ?? "", a.data_compra ?? "", a.garantia_ate ?? "",
    ]),
  };
}

export async function reportAtivosPorEmpresa(): Promise<ReportSpec> {
  const { data } = await supabase.from("ativos").select("custo, empresas(nome, sigla), status");
  const map = new Map<string, { nome: string; sigla: string; total: number; custo: number; em_uso: number }>();
  (data ?? []).forEach((a) => {
    const e = a.empresas as { nome: string; sigla: string } | null;
    if (!e) return;
    const k = e.sigla;
    const cur = map.get(k) ?? { nome: e.nome, sigla: e.sigla, total: 0, custo: 0, em_uso: 0 };
    cur.total++; cur.custo += Number(a.custo) || 0; if (a.status === "em_uso") cur.em_uso++;
    map.set(k, cur);
  });
  return {
    titulo: "Ativos por Empresa",
    colunas: ["Sigla", "Empresa", "Total", "Em Uso", "Custo Total (KZ)"],
    linhas: Array.from(map.values()).map((e) => [e.sigla, e.nome, e.total, e.em_uso, fmtKZ(e.custo)]),
  };
}

export async function reportAtivosPorCategoria(): Promise<ReportSpec> {
  const { data } = await supabase.from("ativos").select("custo, categorias(nome)");
  const map = new Map<string, { total: number; custo: number }>();
  (data ?? []).forEach((a) => {
    const nome = (a.categorias as { nome: string } | null)?.nome ?? "Sem categoria";
    const cur = map.get(nome) ?? { total: 0, custo: 0 };
    cur.total++; cur.custo += Number(a.custo) || 0;
    map.set(nome, cur);
  });
  return {
    titulo: "Ativos por Categoria",
    colunas: ["Categoria", "Total", "Custo Total (KZ)"],
    linhas: Array.from(map.entries()).map(([k, v]) => [k, v.total, fmtKZ(v.custo)]),
  };
}

export async function reportAtivosPorEstado(): Promise<ReportSpec> {
  const { data } = await supabase.from("ativos").select("status");
  const map = new Map<string, number>();
  (data ?? []).forEach((a) => map.set(a.status, (map.get(a.status) ?? 0) + 1));
  return {
    titulo: "Ativos por Estado",
    colunas: ["Estado", "Quantidade"],
    linhas: Array.from(map.entries()).map(([k, v]) => [STATUS_LABELS[k as AtivoStatus] ?? k, v]),
  };
}

export async function reportEstoqueAtual(): Promise<ReportSpec> {
  const { data } = await supabase.from("estoque_consumiveis").select("*").order("nome");
  return {
    titulo: "Estoque Atual de Consumíveis",
    colunas: ["Nome", "Categoria", "Quantidade", "Unidade", "Mínimo", "Estado", "Localização"],
    linhas: (data ?? []).map((c) => [c.nome, c.categoria ?? "", c.quantidade, c.unidade, c.estoque_minimo, c.quantidade <= c.estoque_minimo ? "BAIXO" : "OK", c.localizacao ?? ""]),
  };
}

export async function reportProdutosCriticos(): Promise<ReportSpec> {
  const { data } = await supabase.from("estoque_consumiveis").select("*").order("nome");
  const criticos = (data ?? []).filter((c) => c.quantidade <= c.estoque_minimo);
  return {
    titulo: "Produtos em Nível Crítico",
    colunas: ["Nome", "Categoria", "Quantidade", "Mínimo", "Diferença"],
    linhas: criticos.map((c) => [c.nome, c.categoria ?? "", c.quantidade, c.estoque_minimo, c.estoque_minimo - c.quantidade]),
  };
}

export async function reportMovimentacoes(f: ReportFilters): Promise<ReportSpec> {
  let q = supabase.from("movimentacoes").select("created_at, tipo, descricao, status_anterior, status_novo, ativos(codigo_unico, nome)").order("created_at", { ascending: false }).limit(5000);
  if (f.inicio) q = q.gte("created_at", f.inicio);
  if (f.fim) q = q.lte("created_at", f.fim);
  const { data } = await q;
  return {
    titulo: "Histórico de Movimentações",
    filtros: filtroLabel(f),
    colunas: ["Data", "Ativo", "Nome", "Tipo", "De", "Para", "Descrição"],
    linhas: (data ?? []).map((m) => [
      new Date(m.created_at).toLocaleString("pt-BR"),
      (m.ativos as { codigo_unico: string } | null)?.codigo_unico ?? "",
      (m.ativos as { nome: string } | null)?.nome ?? "",
      m.tipo, m.status_anterior ?? "", m.status_novo ?? "", m.descricao ?? "",
    ]),
  };
}

export async function reportConsumoPeriodo(f: ReportFilters): Promise<ReportSpec> {
  // Heurística: usa movimentacoes do tipo cadastro/leitura como proxy? Para consumíveis não há tabela de consumo dedicada.
  // Lista alertas de estoque baixo no período como aproximação.
  let q = supabase.from("alertas").select("created_at, titulo, mensagem, tipo").in("tipo", ["estoque_baixo", "toner_critico", "toner_baixo"]).order("created_at", { ascending: false });
  if (f.inicio) q = q.gte("created_at", f.inicio);
  if (f.fim) q = q.lte("created_at", f.fim);
  const { data } = await q;
  return {
    titulo: "Consumo / Alertas no Período",
    filtros: filtroLabel(f),
    colunas: ["Data", "Tipo", "Item", "Detalhe"],
    linhas: (data ?? []).map((a) => [new Date(a.created_at).toLocaleString("pt-BR"), a.tipo, a.titulo, a.mensagem ?? ""]),
  };
}

export async function reportPatrimonialPorEmpresa(): Promise<ReportSpec> {
  return reportAtivosPorEmpresa().then((r) => ({ ...r, titulo: "Valor Patrimonial por Empresa" }));
}

export async function reportPatrimonialTotal(): Promise<ReportSpec> {
  const { data } = await supabase.from("ativos").select("custo, categorias(nome), empresas(sigla)");
  const total = (data ?? []).reduce((acc, a) => acc + (Number(a.custo) || 0), 0);
  return {
    titulo: "Valor Patrimonial Total",
    colunas: ["Empresa", "Categoria", "Custo (KZ)"],
    linhas: [
      ...(data ?? []).map((a) => [
        (a.empresas as { sigla: string } | null)?.sigla ?? "",
        (a.categorias as { nome: string } | null)?.nome ?? "",
        fmtKZ(a.custo as number | null),
      ] as (string | number)[]),
      ["", "TOTAL", fmtKZ(total)],
    ],
  };
}

export async function reportCustosManutencao(f: ReportFilters): Promise<ReportSpec> {
  let q = supabase.from("manutencoes").select("data_inicio, tipo, status, custo, fornecedor, descricao, ativos(codigo_unico, nome)").order("data_inicio", { ascending: false });
  if (f.inicio) q = q.gte("data_inicio", f.inicio);
  if (f.fim) q = q.lte("data_inicio", f.fim);
  const { data } = await q;
  const total = (data ?? []).reduce((a, m) => a + (Number(m.custo) || 0), 0);
  return {
    titulo: "Custos de Manutenção",
    filtros: filtroLabel(f),
    colunas: ["Data", "Ativo", "Nome", "Tipo", "Status", "Fornecedor", "Custo (KZ)", "Descrição"],
    linhas: [
      ...(data ?? []).map((m) => [
        m.data_inicio,
        (m.ativos as { codigo_unico: string } | null)?.codigo_unico ?? "",
        (m.ativos as { nome: string } | null)?.nome ?? "",
        m.tipo, m.status, m.fornecedor ?? "", fmtKZ(m.custo as number | null), m.descricao,
      ] as (string | number)[]),
      ["", "", "", "", "", "TOTAL", fmtKZ(total), ""],
    ],
  };
}

export async function reportCustosPorCategoria(): Promise<ReportSpec> {
  const { data: ms } = await supabase.from("manutencoes").select("custo, ativos(categorias(nome))");
  const map = new Map<string, number>();
  (ms ?? []).forEach((m) => {
    const a = m.ativos as { categorias: { nome: string } | null } | null;
    const nome = a?.categorias?.nome ?? "Sem categoria";
    map.set(nome, (map.get(nome) ?? 0) + (Number(m.custo) || 0));
  });
  return {
    titulo: "Custos de Manutenção por Categoria",
    colunas: ["Categoria", "Custo (KZ)"],
    linhas: Array.from(map.entries()).map(([k, v]) => [k, fmtKZ(v)]),
  };
}

export async function reportGarantiasVencimento(): Promise<ReportSpec> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: gs } = await supabase.from("ativo_garantias").select("ativo_id, data_inicio, data_fim, tipo").gte("data_fim", today).order("data_fim");
  const ids = Array.from(new Set((gs ?? []).map((g) => g.ativo_id)));
  const { data: ats } = ids.length
    ? await supabase.from("ativos").select("id, codigo_unico, nome, empresas(sigla)").in("id", ids)
    : { data: [] as Array<{ id: string; codigo_unico: string; nome: string; empresas: { sigla: string } | null }> };
  const map = new Map((ats ?? []).map((a) => [a.id, a]));
  return {
    titulo: "Garantias Próximas do Vencimento",
    colunas: ["Empresa", "Código", "Ativo", "Início", "Fim", "Tipo"],
    linhas: (gs ?? []).map((g) => {
      const a = map.get(g.ativo_id);
      return [a?.empresas?.sigla ?? "", a?.codigo_unico ?? "", a?.nome ?? "", g.data_inicio, g.data_fim, g.tipo];
    }),
  };
}

function filtroLabel(f: ReportFilters): string {
  const parts: string[] = [];
  if (f.inicio) parts.push(`de ${f.inicio}`);
  if (f.fim) parts.push(`até ${f.fim}`);
  if (f.status) parts.push(`status: ${STATUS_LABELS[f.status as AtivoStatus] ?? f.status}`);
  return parts.join(" • ");
}
