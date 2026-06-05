import { useState, useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileSignature, Plus, Pencil, Trash2, Search, X, Loader2, Upload, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatKZ } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contratos")({
  component: ContratosPage,
});

type Contrato = {
  id: string;
  nome: string;
  fornecedor_id: string | null;
  empresa_id: string | null;
  categoria: "internet"|"impressoras"|"manutencao"|"software"|"seguranca"|"outros";
  tipo_servico: string | null;
  valor: number;
  moeda: string;
  periodicidade: "mensal"|"trimestral"|"semestral"|"anual"|"unico";
  data_inicio: string | null;
  data_vencimento: string | null;
  renovacao_automatica: boolean;
  notas: string | null;
  created_at: string;
};

type Doc = {
  id: string;
  contrato_id: string;
  versao: number;
  path: string;
  nome_ficheiro: string;
  tamanho: number | null;
  mime: string | null;
  created_at: string;
};

const CATEGORIAS = ["internet","impressoras","manutencao","software","seguranca","outros"] as const;
const CAT_LABEL: Record<string,string> = { internet:"Internet", impressoras:"Impressoras", manutencao:"Manutenção", software:"Software", seguranca:"Segurança", outros:"Outros" };
const PERIODOS = ["mensal","trimestral","semestral","anual","unico"] as const;
const PER_LABEL: Record<string,string> = { mensal:"Mensal", trimestral:"Trimestral", semestral:"Semestral", anual:"Anual", unico:"Único" };
const PER_MESES: Record<string,number> = { mensal:1, trimestral:3, semestral:6, anual:12, unico:0 };

function diasParaVencer(d: string | null): number | null {
  if (!d) return null;
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
}

function ContratosPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [catFiltro, setCatFiltro] = useState<string>("todas");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [docs, setDocs] = useState<Contrato | null>(null);

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["contratos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contratos").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Contrato[];
    },
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["forn-min-c"],
    queryFn: async () => (await supabase.from("fornecedores").select("id, nome_empresa")).data ?? [],
  });
  const fornMap = useMemo(() => new Map(fornecedores.map((f) => [f.id, f.nome_empresa])), [fornecedores]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return contratos.filter((c) => {
      if (term && !c.nome.toLowerCase().includes(term) && !(c.tipo_servico ?? "").toLowerCase().includes(term)) return false;
      if (catFiltro !== "todas" && c.categoria !== catFiltro) return false;
      return true;
    });
  }, [contratos, q, catFiltro]);

  const kpis = useMemo(() => {
    const ativos = contratos.filter((c) => !c.data_vencimento || (diasParaVencer(c.data_vencimento) ?? 1) >= 0);
    const vence90 = contratos.filter((c) => { const d = diasParaVencer(c.data_vencimento); return d != null && d >= 0 && d <= 90; }).length;
    const expirados = contratos.filter((c) => { const d = diasParaVencer(c.data_vencimento); return d != null && d < 0; }).length;
    let mensal = 0;
    ativos.forEach((c) => {
      const meses = PER_MESES[c.periodicidade];
      if (meses > 0) mensal += Number(c.valor) / meses;
    });
    return { ativos: ativos.length, vence90, expirados, mensal, anual: mensal * 12 };
  }, [contratos]);

  async function remover(id: string) {
    if (!confirm("Remover contrato e documentos?")) return;
    const { error } = await supabase.from("contratos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Contrato removido"); qc.invalidateQueries({ queryKey: ["contratos"] }); }
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FileSignature className="size-6 text-accent" /> Contratos & Serviços</h1>
          <p className="text-sm text-muted-foreground">Controlo de contratos recorrentes e serviços externos.</p>
        </div>
        <button onClick={() => { setEditing(null); setOpenForm(true); }} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold inline-flex items-center gap-2 shadow-sm hover:opacity-90">
          <Plus className="size-4" /> Novo contrato
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KPI label="Ativos" value={kpis.ativos} color="text-success" />
        <KPI label="Próx. 90 dias" value={kpis.vence90} color="text-warning" />
        <KPI label="Expirados" value={kpis.expirados} color="text-destructive" />
        <KPI label="Custo mensal" value={formatKZ(kpis.mensal)} color="text-foreground" />
        <KPI label="Custo anual" value={formatKZ(kpis.anual)} color="text-foreground" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar…" className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
        <select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm">
          <option value="todas">Todas categorias</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground"><FileSignature className="size-8 mx-auto mb-3 opacity-40" /> Nenhum contrato.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  <th className="px-4 py-3">Contrato</th>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => {
                  const d = diasParaVencer(c.data_vencimento);
                  return (
                    <tr key={c.id} className="hover:bg-secondary/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.tipo_servico ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{fornMap.get(c.fornecedor_id ?? "") ?? "—"}</td>
                      <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary uppercase">{CAT_LABEL[c.categoria]}</span></td>
                      <td className="px-4 py-3 font-mono text-xs">{formatKZ(c.valor)}</td>
                      <td className="px-4 py-3 text-xs">{PER_LABEL[c.periodicidade]}</td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {c.data_vencimento ? (
                          <span className={d != null && d < 0 ? "text-destructive font-semibold" : d != null && d <= 30 ? "text-warning font-semibold" : ""}>
                            {new Date(c.data_vencimento).toLocaleDateString("pt-PT")}
                            {d != null && <span className="opacity-60 ml-1">({d < 0 ? "venceu" : `${d}d`})</span>}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setDocs(c)} className="p-1.5 rounded hover:bg-secondary" title="Documentos"><FileText className="size-4" /></button>
                          <button onClick={() => { setEditing(c); setOpenForm(true); }} className="p-1.5 rounded hover:bg-secondary" title="Editar"><Pencil className="size-4" /></button>
                          <button onClick={() => remover(c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Remover"><Trash2 className="size-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openForm && <ContratoForm contrato={editing} fornecedores={fornecedores} onClose={() => { setOpenForm(false); setEditing(null); }} onSaved={() => qc.invalidateQueries({ queryKey: ["contratos"] })} />}
      {docs && <DocumentosPanel contrato={docs} onClose={() => setDocs(null)} />}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
      <p className={`text-xl md:text-2xl font-bold tabular-nums ${color} mt-1 break-words`}>{value}</p>
    </div>
  );
}

function ContratoForm({ contrato, fornecedores, onClose, onSaved }: { contrato: Contrato | null; fornecedores: Array<{ id:string; nome_empresa:string }>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: contrato?.nome ?? "",
    fornecedor_id: contrato?.fornecedor_id ?? "",
    empresa_id: contrato?.empresa_id ?? "",
    categoria: contrato?.categoria ?? "outros",
    tipo_servico: contrato?.tipo_servico ?? "",
    valor: contrato?.valor ?? 0,
    moeda: contrato?.moeda ?? "AOA",
    periodicidade: contrato?.periodicidade ?? "mensal",
    data_inicio: contrato?.data_inicio ?? "",
    data_vencimento: contrato?.data_vencimento ?? "",
    renovacao_automatica: contrato?.renovacao_automatica ?? false,
    notas: contrato?.notas ?? "",
  });
  const [saving, setSaving] = useState(false);

  const { data: empresas = [] } = useQuery({ queryKey:["emp-min-c"], queryFn: async () => (await supabase.from("empresas").select("id, nome, sigla").order("nome")).data ?? [] });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    const payload = {
      ...form,
      nome: form.nome.trim(),
      fornecedor_id: form.fornecedor_id || null,
      empresa_id: form.empresa_id || null,
      tipo_servico: form.tipo_servico || null,
      valor: Number(form.valor) || 0,
      data_inicio: form.data_inicio || null,
      data_vencimento: form.data_vencimento || null,
      notas: form.notas || null,
    };
    const { error } = contrato
      ? await supabase.from("contratos").update(payload).eq("id", contrato.id)
      : await supabase.from("contratos").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(contrato ? "Contrato atualizado" : "Contrato criado");
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-bold">{contrato ? "Editar contrato" : "Novo contrato"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome *" className="md:col-span-2"><input required value={form.nome} onChange={(e) => setForm({...form, nome:e.target.value})} className="cinput" /></Field>
          <Field label="Categoria"><select value={form.categoria} onChange={(e) => setForm({...form, categoria:e.target.value as typeof form.categoria})} className="cinput">{CATEGORIAS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}</select></Field>
          <Field label="Tipo de serviço"><input value={form.tipo_servico} onChange={(e) => setForm({...form, tipo_servico:e.target.value})} className="cinput" /></Field>
          <Field label="Fornecedor"><select value={form.fornecedor_id} onChange={(e) => setForm({...form, fornecedor_id:e.target.value})} className="cinput"><option value="">—</option>{fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome_empresa}</option>)}</select></Field>
          <Field label="Empresa"><select value={form.empresa_id} onChange={(e) => setForm({...form, empresa_id:e.target.value})} className="cinput"><option value="">—</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome} ({e.sigla})</option>)}</select></Field>
          <Field label="Valor"><input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({...form, valor:Number(e.target.value)})} className="cinput" /></Field>
          <Field label="Moeda"><input value={form.moeda} onChange={(e) => setForm({...form, moeda:e.target.value})} className="cinput" /></Field>
          <Field label="Periodicidade"><select value={form.periodicidade} onChange={(e) => setForm({...form, periodicidade:e.target.value as typeof form.periodicidade})} className="cinput">{PERIODOS.map((p) => <option key={p} value={p}>{PER_LABEL[p]}</option>)}</select></Field>
          <Field label="Data início"><input type="date" value={form.data_inicio} onChange={(e) => setForm({...form, data_inicio:e.target.value})} className="cinput" /></Field>
          <Field label="Data vencimento"><input type="date" value={form.data_vencimento} onChange={(e) => setForm({...form, data_vencimento:e.target.value})} className="cinput" /></Field>
          <label className="md:col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.renovacao_automatica} onChange={(e) => setForm({...form, renovacao_automatica:e.target.checked})} />
            Renovação automática
          </label>
          <Field label="Notas" className="md:col-span-2"><textarea rows={3} value={form.notas} onChange={(e) => setForm({...form, notas:e.target.value})} className="cinput" /></Field>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg">Cancelar</button>
            <button disabled={saving} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? "A guardar…" : "Guardar"}</button>
          </div>
        </form>
      </div>
      <style>{`.cinput{width:100%;padding:.5rem .75rem;background:var(--background);border:1px solid var(--border);border-radius:.5rem;font-size:.875rem;outline:none}.cinput:focus{box-shadow:0 0 0 2px color-mix(in oklab, var(--accent) 30%, transparent)}`}</style>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-xs font-semibold text-muted-foreground uppercase tracking-wide ${className ?? ""}`}>
      <span className="block mb-1">{label}</span>
      {children}
    </label>
  );
}

function DocumentosPanel({ contrato, onClose }: { contrato: Contrato; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["contrato-docs", contrato.id],
    queryFn: async () => (await supabase.from("contrato_documentos").select("*").eq("contrato_id", contrato.id).order("versao", { ascending: false })).data as Doc[] ?? [],
  });

  async function upload(file: File) {
    setUploading(true);
    try {
      const proxVersao = (docs[0]?.versao ?? 0) + 1;
      const path = `${contrato.id}/v${proxVersao}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("contratos").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from("contrato_documentos").insert({
        contrato_id: contrato.id, versao: proxVersao, path, nome_ficheiro: file.name, tamanho: file.size, mime: file.type,
      });
      if (error) throw error;
      toast.success(`Versão ${proxVersao} enviada`);
      qc.invalidateQueries({ queryKey: ["contrato-docs", contrato.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function download(d: Doc) {
    const { data, error } = await supabase.storage.from("contratos").createSignedUrl(d.path, 300);
    if (error || !data?.signedUrl) return toast.error(error?.message ?? "Erro");
    window.open(data.signedUrl, "_blank");
  }

  async function remover(d: Doc) {
    if (!confirm(`Remover versão ${d.versao}?`)) return;
    await supabase.storage.from("contratos").remove([d.path]);
    const { error } = await supabase.from("contrato_documentos").delete().eq("id", d.id);
    if (error) toast.error(error.message);
    else { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["contrato-docs", contrato.id] }); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="font-bold">Documentos — {contrato.nome}</h2>
            <p className="text-xs text-muted-foreground">Cada upload cria uma nova versão.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <input ref={fileRef} type="file" accept="application/pdf,image/*,.doc,.docx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full px-4 py-3 border-2 border-dashed border-border rounded-lg text-sm font-semibold hover:bg-secondary/40 inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "A enviar…" : "Enviar nova versão"}
            </button>
          </div>

          {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> :
            docs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-6">Sem documentos.</p>
            ) : (
              <ul className="divide-y divide-border border border-border rounded-lg">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[10px] bg-accent/15 text-accent px-2 py-1 rounded font-bold">v{d.versao}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{d.nome_ficheiro}</p>
                        <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("pt-PT")} • {d.tamanho ? `${(d.tamanho/1024).toFixed(1)} KB` : "—"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => download(d)} className="p-1.5 rounded hover:bg-secondary" title="Download"><Download className="size-4" /></button>
                      <button onClick={() => remover(d)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Remover"><Trash2 className="size-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </div>
      </div>
    </div>
  );
}
