import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS, STATUS_OPTIONS, type AtivoStatus } from "@/lib/asset-utils";

export const Route = createFileRoute("/_authenticated/ativos/$id")({
  component: AtivoDetailPage,
});

function AtivoDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({
    status: "disponivel" as AtivoStatus,
    localizacao: "",
    responsavel: "",
    observacoes: "",
  });

  const { data: ativo, isLoading } = useQuery({
    queryKey: ["ativo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos")
        .select("*, categorias(nome, codigo_prefixo)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ["movimentacoes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("ativo_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (ativo) {
      setEdit({
        status: ativo.status,
        localizacao: ativo.localizacao ?? "",
        responsavel: ativo.responsavel ?? "",
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
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ativos")
        .update({
          status: edit.status,
          localizacao: edit.localizacao || null,
          responsavel: edit.responsavel || null,
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
  const labelCls = "text-xs font-semibold text-foreground uppercase tracking-wider";

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
            {[ativo.marca, ativo.modelo].filter(Boolean).join(" • ") || "Sem marca/modelo"} • {(ativo.categorias as { nome: string } | null)?.nome}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={ativo.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <h2 className="font-bold mb-4">Informações do Ativo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Status</label>
                <select className={`${inputCls} mt-1.5 cursor-pointer`} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as AtivoStatus })}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Número de série</label>
                <input className={`${inputCls} mt-1.5 font-mono`} value={ativo.numero_serie ?? "—"} disabled />
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
                <input className={`${inputCls} mt-1.5`} value={ativo.data_compra ?? "—"} disabled />
              </div>
              <div>
                <label className={labelCls}>Garantia até</label>
                <input className={`${inputCls} mt-1.5`} value={ativo.garantia_ate ?? "—"} disabled />
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
              <h2 className="font-bold">Histórico de Movimentações ({movimentacoes.length})</h2>
            </div>
            {movimentacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">Sem movimentações registradas.</p>
            ) : (
              <ul className="divide-y divide-border">
                {movimentacoes.map((m) => (
                  <li key={m.id} className="px-6 py-3 flex items-start gap-4">
                    <div className="size-2 rounded-full bg-accent mt-2 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold capitalize">{m.tipo.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground font-mono">{new Date(m.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{m.descricao}</p>
                      {m.status_anterior && m.status_novo && (
                        <p className="text-xs mt-1">
                          <span className="text-muted-foreground">{STATUS_LABELS[m.status_anterior]}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{STATUS_LABELS[m.status_novo]}</span>
                        </p>
                      )}
                      {m.responsavel_novo && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          Responsável: <span className="text-foreground">{m.responsavel_anterior ?? "—"}</span> → <span className="text-foreground font-medium">{m.responsavel_novo}</span>
                        </p>
                      )}
                      {m.localizacao_nova && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          Local: <span className="text-foreground">{m.localizacao_anterior ?? "—"}</span> → <span className="text-foreground font-medium">{m.localizacao_nova}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* QR Code panel */}
        <div className="space-y-6">
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
