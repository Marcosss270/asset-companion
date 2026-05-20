import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Plus, Pencil, Loader2, X, Minus, ArrowUp, ArrowDown, Truck } from "lucide-react";
import { toast } from "sonner";
import { FornecedoresProduto } from "@/components/fornecedores-produto";

export const Route = createFileRoute("/_authenticated/consumiveis")({
  component: ConsumiveisPage,
});

interface Consumivel {
  id: string;
  nome: string;
  categoria: string | null;
  quantidade: number;
  estoque_minimo: number;
  unidade: string;
  localizacao: string | null;
  observacoes: string | null;
}

function ConsumiveisPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Consumivel | null>(null);
  const [adjust, setAdjust] = useState<{ item: Consumivel; delta: number } | null>(null);
  const [suppliers, setSuppliers] = useState<Consumivel | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["consumiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estoque_consumiveis")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Consumivel[];
    },
  });

  const filtered = data.filter((c) => {
    if (!q.trim()) return true;
    const n = q.toLowerCase();
    return [c.nome, c.categoria, c.localizacao].filter(Boolean).join(" ").toLowerCase().includes(n);
  });

  const baixos = data.filter((c) => c.quantidade <= c.estoque_minimo);

  const refresh = () => qc.invalidateQueries({ queryKey: ["consumiveis"] });

  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consumíveis</h1>
          <p className="text-muted-foreground text-sm">
            {data.length} itens • {baixos.length > 0 && (
              <span className="text-destructive font-semibold">{baixos.length} em estoque baixo</span>
            )}
            {baixos.length === 0 && <span>todos com estoque OK</span>}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setOpenForm(true); }}
          className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 shadow-sm"
        >
          <Plus className="size-4" /> Novo Item
        </button>
      </div>

      {baixos.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-start gap-3">
          <AlertTriangle className="size-5 text-destructive mt-0.5" />
          <div>
            <p className="font-bold text-sm text-destructive">Reposição necessária</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              {baixos.map((b) => b.nome).join(", ")}
            </p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-card">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, categoria ou localização..."
          className="w-full px-4 py-2 bg-secondary border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30"
        />
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
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">Nenhum consumível encontrado.</td></tr>
            ) : (
              filtered.map((c) => {
                const baixo = c.quantidade <= c.estoque_minimo;
                return (
                  <tr key={c.id} className="hover:bg-secondary/40">
                    <td className="px-6 py-3 font-medium text-sm">{c.nome}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{c.categoria ?? "—"}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={baixo ? "text-destructive font-bold" : "font-semibold"}>{c.quantidade} {c.unidade}</span>
                      {baixo && <AlertTriangle className="size-3.5 inline-block ml-2 text-destructive" />}
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{c.estoque_minimo} {c.unidade}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{c.localizacao ?? "—"}</td>
                    <td className="px-6 py-3 text-right space-x-1">
                      <button
                        onClick={() => setAdjust({ item: c, delta: 1 })}
                        className="inline-flex items-center justify-center size-7 rounded hover:bg-success/10 text-success"
                        title="Entrada"
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        onClick={() => setAdjust({ item: c, delta: -1 })}
                        className="inline-flex items-center justify-center size-7 rounded hover:bg-destructive/10 text-destructive"
                        title="Saída"
                      >
                        <ArrowDown className="size-4" />
                      </button>
                      <button
                        onClick={() => { setEditing(c); setOpenForm(true); }}
                        className="inline-flex items-center justify-center size-7 rounded hover:bg-secondary"
                        title="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {openForm && (
        <ConsumivelForm
          item={editing}
          onClose={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); refresh(); }}
        />
      )}
      {adjust && (
        <AjusteEstoque
          item={adjust.item}
          direcao={adjust.delta}
          onClose={() => setAdjust(null)}
          onSaved={() => { setAdjust(null); refresh(); }}
        />
      )}
    </div>
  );
}

function ConsumivelForm({
  item,
  onClose,
  onSaved,
}: {
  item: Consumivel | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nome: item?.nome ?? "",
    categoria: item?.categoria ?? "",
    quantidade: item?.quantidade ?? 0,
    estoque_minimo: item?.estoque_minimo ?? 0,
    unidade: item?.unidade ?? "un",
    localizacao: item?.localizacao ?? "",
    observacoes: item?.observacoes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria || null,
        quantidade: Number(form.quantidade),
        estoque_minimo: Number(form.estoque_minimo),
        unidade: form.unidade || "un",
        localizacao: form.localizacao || null,
        observacoes: form.observacoes || null,
      };
      const { error } = item
        ? await supabase.from("estoque_consumiveis").update(payload).eq("id", item.id)
        : await supabase.from("estoque_consumiveis").insert(payload);
      if (error) throw error;
      toast.success(item ? "Item atualizado" : "Item cadastrado");
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
    <Modal title={item ? "Editar Item" : "Novo Consumível"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className={lbl}>Nome *</label><input required className={`${inp} mt-1.5`} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><label className={lbl}>Categoria</label><input className={`${inp} mt-1.5`} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
          <div><label className={lbl}>Unidade</label><input className={`${inp} mt-1.5`} value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /></div>
          <div><label className={lbl}>Quantidade</label><input type="number" className={`${inp} mt-1.5`} value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} /></div>
          <div><label className={lbl}>Estoque Mínimo</label><input type="number" className={`${inp} mt-1.5`} value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: Number(e.target.value) })} /></div>
          <div className="col-span-2"><label className={lbl}>Localização</label><input className={`${inp} mt-1.5`} value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} /></div>
          <div className="col-span-2"><label className={lbl}>Observações</label><textarea rows={2} className={`${inp} mt-1.5 resize-none`} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="bg-accent text-accent-foreground px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
            {saving && <Loader2 className="size-4 animate-spin" />} Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AjusteEstoque({
  item,
  direcao,
  onClose,
  onSaved,
}: {
  item: Consumivel;
  direcao: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [qtd, setQtd] = useState(1);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const novo = item.quantidade + direcao * qtd;
      if (novo < 0) {
        toast.error("Quantidade insuficiente em estoque");
        return;
      }
      const { error } = await supabase
        .from("estoque_consumiveis")
        .update({ quantidade: novo })
        .eq("id", item.id);
      if (error) throw error;
      toast.success(direcao > 0 ? "Entrada registrada" : "Saída registrada");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={direcao > 0 ? "Entrada de Estoque" : "Saída de Estoque"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-secondary/50 rounded-lg p-3 text-sm">
          <p className="font-semibold">{item.nome}</p>
          <p className="text-xs text-muted-foreground">Atual: {item.quantidade} {item.unidade}</p>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider">Quantidade</label>
          <input
            autoFocus
            type="number"
            min={1}
            value={qtd}
            onChange={(e) => setQtd(Math.max(1, Number(e.target.value)))}
            className="w-full mt-1.5 px-3 py-2 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className={`px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60 ${direcao > 0 ? "bg-success text-white" : "bg-destructive text-destructive-foreground"}`}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : direcao > 0 ? <Plus className="size-4" /> : <Minus className="size-4" />}
            Confirmar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
