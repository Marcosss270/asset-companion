import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Loader2, X, Truck, Package, Star, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { QuickContact } from "@/components/quick-contact";
import { formatKZ } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  component: FornecedoresPage,
});

type Fornecedor = {
  id: string;
  nome_empresa: string;
  nif: string | null;
  pessoa_contacto: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  website: string | null;
  observacoes: string | null;
  status: string;
  created_at: string;
};

type Consumivel = { id: string; nome: string; unidade: string };
type Ativo = { id: string; codigo_unico: string; nome: string };

type Link = {
  id: string;
  fornecedor_id: string;
  consumivel_id: string | null;
  ativo_id: string | null;
  preco_medio: number | null;
  prazo_entrega_dias: number | null;
  fornecedor_preferencial: boolean;
  observacoes: string | null;
  estoque_consumiveis?: Consumivel | null;
  ativos?: Ativo | null;
};

const F_TABLE = "fornecedores" as never;
const FP_TABLE = "fornecedor_produtos" as never;

function FornecedoresPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [managing, setManaging] = useState<Fornecedor | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from(F_TABLE).select("*").order("nome_empresa");
      if (error) throw error;
      return (data ?? []) as unknown as Fornecedor[];
    },
  });

  const filtered = data.filter((f) => {
    if (!q.trim()) return true;
    const n = q.toLowerCase();
    return [f.nome_empresa, f.nif, f.pessoa_contacto, f.telefone, f.email]
      .filter(Boolean).join(" ").toLowerCase().includes(n);
  });

  const ativos = data.filter((f) => f.status === "ativo").length;

  const refresh = () => qc.invalidateQueries({ queryKey: ["fornecedores"] });

  const remove = async (f: Fornecedor) => {
    if (!confirm(`Remover fornecedor "${f.nome_empresa}"?`)) return;
    const { error } = await (supabase.from(F_TABLE) as unknown as {
      delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    }).delete().eq("id", f.id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); refresh(); }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="size-6 text-accent" /> Fornecedores
          </h1>
          <p className="text-muted-foreground text-sm">
            {data.length} cadastrado(s) • <span className="text-success font-semibold">{ativos} ativo(s)</span>
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setOpenForm(true); }}
          className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 shadow-sm"
        >
          <Plus className="size-4" /> Novo Fornecedor
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-card flex items-center gap-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por empresa, NIF, contacto, telefone ou email..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {isLoading ? (
          <p className="p-12 text-center text-muted-foreground text-sm">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground text-sm">Nenhum fornecedor encontrado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">NIF</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold">{f.nome_empresa}</p>
                    {f.website && <a href={f.website} target="_blank" rel="noreferrer" className="text-[10px] text-accent hover:underline">{f.website.replace(/^https?:\/\//, "")}</a>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{f.nif ?? "—"}</td>
                  <td className="px-4 py-2.5">{f.pessoa_contacto ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{f.telefone ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{f.email ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      f.status === "ativo"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>{f.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <QuickContact nome={f.nome_empresa} telefone={f.telefone} whatsapp={f.whatsapp} email={f.email} size="sm" />
                      <button onClick={() => setManaging(f)} className="size-7 rounded-md hover:bg-accent/10 text-accent flex items-center justify-center" title="Produtos">
                        <Package className="size-3.5" />
                      </button>
                      <button onClick={() => { setEditing(f); setOpenForm(true); }} className="size-7 rounded-md hover:bg-secondary flex items-center justify-center" title="Editar">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => remove(f)} className="size-7 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center" title="Remover">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openForm && (
        <FornecedorForm
          item={editing}
          onClose={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); refresh(); }}
        />
      )}
      {managing && (
        <ProdutosManager fornecedor={managing} onClose={() => setManaging(null)} />
      )}
    </div>
  );
}

function FornecedorForm({ item, onClose, onSaved }: { item: Fornecedor | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome_empresa: item?.nome_empresa ?? "",
    nif: item?.nif ?? "",
    pessoa_contacto: item?.pessoa_contacto ?? "",
    telefone: item?.telefone ?? "",
    whatsapp: item?.whatsapp ?? "",
    email: item?.email ?? "",
    endereco: item?.endereco ?? "",
    website: item?.website ?? "",
    observacoes: item?.observacoes ?? "",
    status: item?.status ?? "ativo",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_empresa.trim()) return;
    setSaving(true);
    try {
      const payload = {
        nome_empresa: form.nome_empresa.trim(),
        nif: form.nif || null,
        pessoa_contacto: form.pessoa_contacto || null,
        telefone: form.telefone || null,
        whatsapp: form.whatsapp || form.telefone || null,
        email: form.email || null,
        endereco: form.endereco || null,
        website: form.website || null,
        observacoes: form.observacoes || null,
        status: form.status,
      };
      const client = supabase.from(F_TABLE) as unknown as {
        update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
        insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
      const { error } = item
        ? await client.update(payload).eq("id", item.id)
        : await client.insert(payload);
      if (error) throw error;
      toast.success(item ? "Fornecedor atualizado" : "Fornecedor cadastrado");
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
    <Modal title={item ? "Editar Fornecedor" : "Novo Fornecedor"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className={lbl}>Nome da Empresa *</label><input required className={`${inp} mt-1.5`} value={form.nome_empresa} onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })} /></div>
          <div><label className={lbl}>NIF</label><input className={`${inp} mt-1.5`} value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} /></div>
          <div><label className={lbl}>Status</label>
            <select className={`${inp} mt-1.5`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div className="col-span-2"><label className={lbl}>Pessoa de Contacto</label><input className={`${inp} mt-1.5`} value={form.pessoa_contacto} onChange={(e) => setForm({ ...form, pessoa_contacto: e.target.value })} /></div>
          <div><label className={lbl}>Telefone</label><input className={`${inp} mt-1.5`} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="+244 ..." /></div>
          <div><label className={lbl}>WhatsApp</label><input className={`${inp} mt-1.5`} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(se diferente)" /></div>
          <div className="col-span-2"><label className={lbl}>Email</label><input type="email" className={`${inp} mt-1.5`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="col-span-2"><label className={lbl}>Endereço</label><input className={`${inp} mt-1.5`} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
          <div className="col-span-2"><label className={lbl}>Website</label><input className={`${inp} mt-1.5`} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
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

function ProdutosManager({ fornecedor, onClose }: { fornecedor: Fornecedor; onClose: () => void }) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<"consumivel" | "ativo">("consumivel");
  const [produtoId, setProdutoId] = useState("");
  const [preco, setPreco] = useState("");
  const [prazo, setPrazo] = useState("");
  const [pref, setPref] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: links = [] } = useQuery({
    queryKey: ["fp", fornecedor.id],
    queryFn: async () => {
      const { data } = await (supabase.from(FP_TABLE) as unknown as {
        select: (q: string) => { eq: (c: string, v: string) => Promise<{ data: unknown }> };
      })
        .select("*, estoque_consumiveis(id, nome, unidade), ativos(id, codigo_unico, nome)")
        .eq("fornecedor_id", fornecedor.id);
      return (data ?? []) as unknown as Link[];
    },
  });

  const { data: consumiveis = [] } = useQuery({
    queryKey: ["consumiveis-all-lite"],
    queryFn: async () => (await supabase.from("estoque_consumiveis").select("id, nome, unidade").order("nome")).data ?? [],
  });

  const { data: ativos = [] } = useQuery({
    queryKey: ["ativos-lite"],
    queryFn: async () => (await supabase.from("ativos").select("id, codigo_unico, nome").order("nome")).data ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["fp", fornecedor.id] });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoId) return;
    setSaving(true);
    try {
      const payload = {
        fornecedor_id: fornecedor.id,
        consumivel_id: tipo === "consumivel" ? produtoId : null,
        ativo_id: tipo === "ativo" ? produtoId : null,
        preco_medio: preco ? Number(preco) : null,
        prazo_entrega_dias: prazo ? Number(prazo) : null,
        fornecedor_preferencial: pref,
      };
      const { error } = await (supabase.from(FP_TABLE) as unknown as {
        insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      }).insert(payload);
      if (error) throw error;
      toast.success("Produto vinculado");
      setProdutoId(""); setPreco(""); setPrazo(""); setPref(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setSaving(false); }
  };

  const togglePref = async (link: Link) => {
    const { error } = await (supabase.from(FP_TABLE) as unknown as {
      update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    }).update({ fornecedor_preferencial: !link.fornecedor_preferencial }).eq("id", link.id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover vínculo?")) return;
    const { error } = await (supabase.from(FP_TABLE) as unknown as {
      delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    }).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); refresh(); }
  };

  const inp = "px-3 py-2 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none";

  return (
    <Modal title={`Produtos — ${fornecedor.nome_empresa}`} onClose={onClose} wide>
      <form onSubmit={add} className="bg-secondary/40 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-12 gap-2">
          <select className={`${inp} col-span-3`} value={tipo} onChange={(e) => { setTipo(e.target.value as "consumivel" | "ativo"); setProdutoId(""); }}>
            <option value="consumivel">Consumível</option>
            <option value="ativo">Equipamento</option>
          </select>
          <select className={`${inp} col-span-5`} value={produtoId} onChange={(e) => setProdutoId(e.target.value)} required>
            <option value="">Selecionar produto...</option>
            {(tipo === "consumivel" ? consumiveis : ativos).map((p) => (
              <option key={p.id} value={p.id}>
                {"codigo_unico" in p ? `${p.codigo_unico} — ${p.nome}` : p.nome}
              </option>
            ))}
          </select>
          <input className={`${inp} col-span-2`} placeholder="Preço KZ" type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} />
          <input className={`${inp} col-span-2`} placeholder="Prazo (dias)" type="number" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" checked={pref} onChange={(e) => setPref(e.target.checked)} />
            Marcar como fornecedor preferencial
          </label>
          <button type="submit" disabled={saving || !produtoId} className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Vincular
          </button>
        </div>
      </form>

      <div className="max-h-[50vh] overflow-y-auto">
        {links.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Nenhum produto vinculado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <th className="px-2 py-2 text-left">Produto</th>
                <th className="px-2 py-2 text-left">Tipo</th>
                <th className="px-2 py-2 text-right">Preço</th>
                <th className="px-2 py-2 text-right">Prazo</th>
                <th className="px-2 py-2 text-center">Pref.</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {links.map((l) => {
                const isCon = !!l.consumivel_id;
                const nome = isCon ? l.estoque_consumiveis?.nome : l.ativos?.nome;
                const cod = isCon ? "" : l.ativos?.codigo_unico;
                return (
                  <tr key={l.id}>
                    <td className="px-2 py-2">
                      {cod && <span className="font-mono text-[10px] bg-secondary px-1 py-0.5 rounded mr-1">{cod}</span>}
                      {nome ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{isCon ? "Consumível" : "Equipamento"}</td>
                    <td className="px-2 py-2 text-right font-mono">{l.preco_medio != null ? formatKZ(l.preco_medio) : "—"}</td>
                    <td className="px-2 py-2 text-right text-xs">{l.prazo_entrega_dias != null ? `${l.prazo_entrega_dias}d` : "—"}</td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => togglePref(l)} title="Alternar preferencial">
                        <Star className={`size-4 ${l.fornecedor_preferencial ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                      </button>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => remove(l.id)} className="text-destructive hover:bg-destructive/10 size-7 rounded-md inline-flex items-center justify-center">
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-background rounded-xl border border-border shadow-xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
