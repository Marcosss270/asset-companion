import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS, STATUS_OPTIONS, type AtivoStatus } from "@/lib/asset-utils";
import { formatKZ } from "@/lib/format";
import { Timeline } from "@/components/timeline";
import { fetchTimeline } from "@/lib/timeline";
import { FornecedoresProduto } from "@/components/fornecedores-produto";

export const Route = createFileRoute("/_authenticated/ativos/$id")({
  component: AtivoDetailPage,
});

function AtivoDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({
    nome: "",
    status: "disponivel" as AtivoStatus,
    localizacao: "",
    responsavel: "",
    custo: "",
    observacoes: "",
  });

  const { data: ativo, isLoading } = useQuery({
    queryKey: ["ativo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos")
        .select("*, categorias(nome, codigo_prefixo), empresas(nome, sigla)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: timelineEvents = [] } = useQuery({
    queryKey: ["timeline", id],
    queryFn: () => fetchTimeline(id),
  });

  useEffect(() => {
    if (ativo) {
      setEdit({
        nome: ativo.nome,
        status: ativo.status,
        localizacao: ativo.localizacao ?? "",
        responsavel: ativo.responsavel ?? "",
        custo: ativo.custo != null ? String(ativo.custo) : "",
        observacoes: ativo.observacoes ?? "",
      });
    }
  }, [ativo]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!ativo) {
    return <div className="text-center py-12 text-muted-foreground">Ativo não encontrado.</div>;
  }

  const handleSave = async () => {
    if (!edit.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ativos")
        .update({
          nome: edit.nome.trim(),
          status: edit.status,
          localizacao: edit.localizacao || null,
          responsavel: edit.responsavel || null,
          custo: edit.custo ? Number(edit.custo) : null,
          observacoes: edit.observacoes || null,
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Ativo atualizado!");
      qc.invalidateQueries({ queryKey: ["ativo", id] });
      qc.invalidateQueries({ queryKey: ["movimentacoes", id] });
      qc.invalidateQueries({ queryKey: ["ativos-list"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Excluir o ativo ${ativo.codigo_unico}? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("ativos").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Ativo excluído");
      navigate({ to: "/ativos" });
    }
  };

  const qrValue = JSON.stringify({ codigo: ativo.codigo_unico, id: ativo.id });
  const inputCls = "w-full px-3 py-2 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none";
  const inputDisabled = "w-full px-3 py-2 bg-secondary/40 border border-border rounded-lg text-sm text-muted-foreground";
  const labelCls = "text-xs font-semibold text-foreground uppercase tracking-wider";
  const empresa = ativo.empresas as { nome: string; sigla: string } | null;
  const categoria = ativo.categorias as { nome: string } | null;

  return (
    <div className="max-w-[1200px] mx-auto">
      <Link to="/ativos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Voltar à lista
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="font-mono text-xs text-muted-foreground tracking-wider">{ativo.codigo_unico}</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{ativo.nome}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {empresa && <span className="font-semibold text-foreground">{empresa.sigla}</span>}
            {empresa && " • "}
            {[ativo.marca, ativo.modelo].filter(Boolean).join(" • ") || "Sem marca/modelo"} • {categoria?.nome}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={ativo.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold mb-4">Informações do Ativo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Nome do ativo</label>
                <input className={`${inputCls} mt-1.5`} value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
                <p className="text-[10px] text-muted-foreground mt-1">Alterações são registradas no histórico.</p>
              </div>
              <div>
                <label className={labelCls}>Empresa</label>
                <input className={`${inputDisabled} mt-1.5`} value={empresa ? `${empresa.nome} (${empresa.sigla})` : "—"} disabled />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={`${inputCls} mt-1.5 cursor-pointer`} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as AtivoStatus })}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Número de série</label>
                <input className={`${inputDisabled} mt-1.5 font-mono`} value={ativo.numero_serie ?? "—"} disabled />
              </div>
              <div>
                <label className={labelCls}>Custo (KZ)</label>
                <input type="number" step="0.01" className={`${inputCls} mt-1.5`} value={edit.custo} onChange={(e) => setEdit({ ...edit, custo: e.target.value })} placeholder="0,00" />
              </div>
              <div>
                <label className={labelCls}>Localização</label>
                <input className={`${inputCls} mt-1.5`} value={edit.localizacao} onChange={(e) => setEdit({ ...edit, localizacao: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Responsável</label>
                <input className={`${inputCls} mt-1.5`} value={edit.responsavel} onChange={(e) => setEdit({ ...edit, responsavel: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Data de compra</label>
                <input className={`${inputDisabled} mt-1.5`} value={ativo.data_compra ?? "—"} disabled />
              </div>
              <div>
                <label className={labelCls}>Garantia até</label>
                <input className={`${inputDisabled} mt-1.5`} value={ativo.garantia_ate ?? "—"} disabled />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Observações</label>
                <textarea rows={3} className={`${inputCls} mt-1.5 resize-none`} value={edit.observacoes} onChange={(e) => setEdit({ ...edit, observacoes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 mt-4 border-t border-border">
              <button onClick={handleDelete} className="text-xs text-destructive hover:underline">
                Excluir ativo
              </button>
              <button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 disabled:opacity-60">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Salvar alterações
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-bold">Timeline do Ativo</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Histórico completo: cadastros, movimentações, manutenções e alertas.</p>
            </div>
            <Timeline events={timelineEvents} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold mb-4">Resumo Financeiro</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Custo de aquisição</span><span className="font-mono font-semibold">{formatKZ(ativo.custo)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Empresa</span><span className="font-semibold">{empresa?.sigla ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Categoria</span><span className="font-semibold">{categoria?.nome ?? "—"}</span></div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold mb-4">Fornecedores Disponíveis</h2>
            <FornecedoresProduto ativoId={ativo.id} produtoNome={ativo.nome} compact />
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-card text-center">
            <h2 className="font-bold mb-4">QR Code do Ativo</h2>
            <div className="bg-white p-4 rounded-lg inline-block border border-border">
              <QRCodeSVG value={qrValue} size={180} level="M" />
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-4">{ativo.codigo_unico}</p>
            <button
              onClick={() => window.print()}
              className="w-full mt-4 border border-border bg-secondary text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-secondary/70"
            >
              <Printer className="size-4" /> Imprimir Etiqueta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
