import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Wrench, Loader2, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/manutencao")({
  component: ManutencaoPage,
});

interface Manutencao {
  id: string;
  ativo_id: string;
  tipo: string;
  descricao: string;
  tecnico: string | null;
  fornecedor: string | null;
  custo: number | null;
  data_inicio: string;
  data_conclusao: string | null;
  status: string;
  observacoes: string | null;
  ativos?: { codigo_unico: string; nome: string } | null;
}

function ManutencaoPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("todas");

  const { data = [], isLoading } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes")
        .select("*, ativos(codigo_unico, nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Manutencao[];
    },
  });

  const filtered = statusFilter === "todas" ? data : data.filter((m) => m.status === statusFilter);
  const abertas = data.filter((m) => m.status === "aberta").length;
  const emAndamento = data.filter((m) => m.status === "em_andamento").length;
  const concluidas = data.filter((m) => m.status === "concluida").length;
  const totalCusto = data.reduce((acc, m) => acc + (Number(m.custo) || 0), 0);

  const concluir = async (id: string) => {
    const { error } = await supabase
      .from("manutencoes")
      .update({ status: "concluida", data_conclusao: new Date().toISOString().slice(0, 10) })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Manutenção concluída"); qc.invalidateQueries({ queryKey: ["manutencoes"] }); }
  };

  const stats = [
    { label: "Abertas", value: abertas, cls: "text-destructive" },
    { label: "Em Andamento", value: emAndamento, cls: "text-warning" },
    { label: "Concluídas", value: concluidas, cls: "text-success" },
    { label: "Custo Total", value: `R$ ${totalCusto.toFixed(2)}`, cls: "text-foreground" },
  ];

  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manutenção</h1>
          <p className="text-muted-foreground text-sm">Registro e acompanhamento de serviços de manutenção.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 shadow-sm"
        >
          <Plus className="size-4" /> Nova Manutenção
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-card p-5 rounded-xl border border-border shadow-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
            <p className={`text-2xl font-bold mt-2 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-card flex gap-3 flex-wrap">
        {["todas", "aberta", "em_andamento", "concluida", "cancelada"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold capitalize transition-colors ${statusFilter === s ? "bg-foreground text-background" : "bg-secondary hover:bg-secondary/70"}`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <th className="px-6 py-3">Ativo</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3">Descrição</th>
              <th className="px-6 py-3">Técnico</th>
              <th className="px-6 py-3">Custo</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">
                <Wrench className="size-8 mx-auto mb-2 opacity-40" />
                Nenhuma manutenção registrada.
              </td></tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-secondary/40">
                  <td className="px-6 py-3">
                    {m.ativos && (
                      <Link to="/ativos/$id" params={{ id: m.ativo_id }} className="hover:text-accent">
                        <p className="font-mono text-xs font-semibold">{m.ativos.codigo_unico}</p>
                        <p className="text-xs text-muted-foreground">{m.ativos.nome}</p>
                      </Link>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs capitalize">{m.tipo}</td>
                  <td className="px-6 py-3 text-sm max-w-xs truncate" title={m.descricao}>{m.descricao}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{m.tecnico ?? "—"}</td>
                  <td className="px-6 py-3 text-sm font-mono">{m.custo ? `R$ ${Number(m.custo).toFixed(2)}` : "—"}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                      m.status === "concluida" ? "bg-success/10 text-success" :
                      m.status === "em_andamento" ? "bg-warning/15 text-warning" :
                      m.status === "cancelada" ? "bg-muted text-muted-foreground" :
                      "bg-destructive/10 text-destructive"
                    }`}>{m.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {m.status !== "concluida" && m.status !== "cancelada" && (
                      <button onClick={() => concluir(m.id)} className="text-xs text-success hover:underline inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Concluir
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && <NovaManutencaoForm onClose={() => setOpen(false)} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["manutencoes"] }); qc.invalidateQueries({ queryKey: ["movimentacoes-all"] }); }} />}
    </div>
  );
}

function NovaManutencaoForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ativo_id: "",
    tipo: "corretiva",
    descricao: "",
    tecnico: "",
    fornecedor: "",
    custo: "",
    data_inicio: new Date().toISOString().slice(0, 10),
    status: "aberta",
    observacoes: "",
  });

  const { data: ativos = [] } = useQuery({
    queryKey: ["ativos-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ativos").select("id, codigo_unico, nome").order("codigo_unico");
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ativo_id || !form.descricao.trim()) {
      toast.error("Selecione o ativo e descreva o serviço");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("manutencoes").insert({
        ativo_id: form.ativo_id,
        tipo: form.tipo,
        descricao: form.descricao,
        tecnico: form.tecnico || null,
        fornecedor: form.fornecedor || null,
        custo: form.custo ? Number(form.custo) : null,
        data_inicio: form.data_inicio,
        status: form.status,
        observacoes: form.observacoes || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      // Atualizar status do ativo para em_manutencao se manutenção está aberta/em_andamento
      if (form.status === "aberta" || form.status === "em_andamento") {
        await supabase.from("ativos").update({ status: "em_manutencao" }).eq("id", form.ativo_id);
      }
      toast.success("Manutenção registrada");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full px-3 py-2 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none";
  const lbl = "text-xs font-semibold uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold">Nova Manutenção</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Ativo *</label>
              <select required className={`${inp} mt-1.5 cursor-pointer`} value={form.ativo_id} onChange={(e) => setForm({ ...form, ativo_id: e.target.value })}>
                <option value="">Selecione...</option>
                {ativos.map((a) => <option key={a.id} value={a.id}>{a.codigo_unico} — {a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Tipo</label>
              <select className={`${inp} mt-1.5 cursor-pointer`} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="corretiva">Corretiva</option>
                <option value="preventiva">Preventiva</option>
                <option value="upgrade">Upgrade</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select className={`${inp} mt-1.5 cursor-pointer`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="aberta">Aberta</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={lbl}>Descrição do serviço *</label>
              <textarea required rows={2} className={`${inp} mt-1.5 resize-none`} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div><label className={lbl}>Técnico</label><input className={`${inp} mt-1.5`} value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} /></div>
            <div><label className={lbl}>Fornecedor</label><input className={`${inp} mt-1.5`} value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
            <div><label className={lbl}>Custo (R$)</label><input type="number" step="0.01" className={`${inp} mt-1.5`} value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} /></div>
            <div><label className={lbl}>Data de início</label><input type="date" className={`${inp} mt-1.5`} value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
            <div className="col-span-2"><label className={lbl}>Observações</label><textarea rows={2} className={`${inp} mt-1.5 resize-none`} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-accent text-accent-foreground px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="size-4 animate-spin" />} Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
