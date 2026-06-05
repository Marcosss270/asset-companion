import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Plus, Pencil, Trash2, Search, X, Loader2, Users, Building2, Boxes, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatKZ } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/licencas")({
  component: LicencasPage,
});

type Licenca = {
  id: string;
  nome: string;
  fabricante: string | null;
  tipo: "perpetua"|"subscricao"|"oem"|"volume"|"freeware"|"outra";
  chave: string | null;
  quantidade_total: number;
  data_aquisicao: string | null;
  data_validade: string | null;
  valor: number | null;
  fornecedor_id: string | null;
  empresa_id: string | null;
  notas: string | null;
  created_at: string;
};

type Atrib = {
  id: string;
  licenca_id: string;
  tipo_alvo: "utilizador"|"ativo"|"empresa";
  alvo_id: string;
  alvo_label: string | null;
  atribuido_em: string;
  revogado_em: string | null;
  notas: string | null;
};

const TIPOS = ["perpetua","subscricao","oem","volume","freeware","outra"] as const;
const TIPO_LABEL: Record<string,string> = { perpetua:"Perpétua", subscricao:"Subscrição", oem:"OEM", volume:"Volume", freeware:"Freeware", outra:"Outra" };

function diasParaVencer(d: string | null): number | null {
  if (!d) return null;
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
}

function statusLicenca(l: Licenca, usadas: number): { label: string; cls: string } {
  if (usadas > l.quantidade_total) return { label: "Excedida", cls: "bg-destructive/10 text-destructive border-destructive/20" };
  const d = diasParaVencer(l.data_validade);
  if (d != null && d < 0) return { label: "Expirada", cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if (d != null && d <= 30) return { label: "Vence em breve", cls: "bg-warning/10 text-warning border-warning/30" };
  return { label: "Ativa", cls: "bg-success/10 text-success border-success/20" };
}

function LicencasPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todas"|"ativas"|"expirando"|"expiradas"|"excedidas">("todas");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Licenca | null>(null);
  const [managing, setManaging] = useState<Licenca | null>(null);

  const { data: licencas = [], isLoading } = useQuery({
    queryKey: ["licencas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("licencas_software").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Licenca[];
    },
  });

  const { data: atribs = [] } = useQuery({
    queryKey: ["licenca-atribs-all"],
    queryFn: async () => {
      const { data } = await supabase.from("licenca_atribuicoes").select("*");
      return (data ?? []) as Atrib[];
    },
  });

  const usadasMap = useMemo(() => {
    const m = new Map<string, number>();
    atribs.filter((a) => !a.revogado_em).forEach((a) => m.set(a.licenca_id, (m.get(a.licenca_id) ?? 0) + 1));
    return m;
  }, [atribs]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return licencas.filter((l) => {
      if (term && !l.nome.toLowerCase().includes(term) && !(l.fabricante ?? "").toLowerCase().includes(term)) return false;
      const usadas = usadasMap.get(l.id) ?? 0;
      const d = diasParaVencer(l.data_validade);
      if (filtro === "expiradas") return d != null && d < 0;
      if (filtro === "expirando") return d != null && d >= 0 && d <= 90;
      if (filtro === "excedidas") return usadas > l.quantidade_total;
      if (filtro === "ativas") return (d == null || d >= 0) && usadas <= l.quantidade_total;
      return true;
    });
  }, [licencas, q, filtro, usadasMap]);

  const kpis = useMemo(() => {
    const total = licencas.length;
    let ativas = 0, expiradas = 0, vence90 = 0, excedidas = 0;
    licencas.forEach((l) => {
      const usadas = usadasMap.get(l.id) ?? 0;
      const d = diasParaVencer(l.data_validade);
      if (usadas > l.quantidade_total) excedidas++;
      if (d != null && d < 0) expiradas++;
      else {
        ativas++;
        if (d != null && d <= 90) vence90++;
      }
    });
    return { total, ativas, expiradas, vence90, excedidas };
  }, [licencas, usadasMap]);

  async function gerarAlertas() {
    const { data, error } = await supabase.rpc("gerar_alertas_licencas_contratos");
    if (error) toast.error(error.message);
    else toast.success(`${data ?? 0} alerta(s) verificado(s)`);
  }

  async function remover(id: string) {
    if (!confirm("Remover esta licença e todas as suas atribuições?")) return;
    const { error } = await supabase.from("licencas_software").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Licença removida");
      qc.invalidateQueries({ queryKey: ["licencas"] });
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><KeyRound className="size-6 text-accent" /> Licenças de Software</h1>
          <p className="text-sm text-muted-foreground">Controlo centralizado de licenças e atribuições.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={gerarAlertas} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary inline-flex items-center gap-2">
            <AlertTriangle className="size-4" /> Verificar alertas
          </button>
          <button onClick={() => { setEditing(null); setOpenForm(true); }} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold inline-flex items-center gap-2 shadow-sm hover:opacity-90">
            <Plus className="size-4" /> Nova licença
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KPI label="Total" value={kpis.total} color="text-foreground" />
        <KPI label="Ativas" value={kpis.ativas} color="text-success" />
        <KPI label="Próx. 90 dias" value={kpis.vence90} color="text-warning" />
        <KPI label="Expiradas" value={kpis.expiradas} color="text-destructive" />
        <KPI label="Excedidas" value={kpis.excedidas} color="text-destructive" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por nome ou fabricante…" className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
        {(["todas","ativas","expirando","expiradas","excedidas"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-2 text-xs font-semibold rounded-lg border ${filtro===f ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "todas" ? "Todas" : f === "ativas" ? "Ativas" : f === "expirando" ? "A vencer" : f === "expiradas" ? "Expiradas" : "Excedidas"}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <KeyRound className="size-8 mx-auto mb-3 opacity-40" />
            Nenhuma licença encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  <th className="px-4 py-3">Software</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Uso</th>
                  <th className="px-4 py-3">Validade</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((l) => {
                  const usadas = usadasMap.get(l.id) ?? 0;
                  const st = statusLicenca(l, usadas);
                  const pct = l.quantidade_total ? Math.min(100, Math.round((usadas / l.quantidade_total) * 100)) : 0;
                  return (
                    <tr key={l.id} className="hover:bg-secondary/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{l.nome}</p>
                        <p className="text-xs text-muted-foreground">{l.fabricante ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{TIPO_LABEL[l.tipo]}</td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span>{usadas} / {l.quantidade_total}</span>
                          <span className="text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full ${pct>100?"bg-destructive":pct>=80?"bg-warning":"bg-success"}`} style={{ width: `${Math.min(100,pct)}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{l.data_validade ? new Date(l.data_validade).toLocaleDateString("pt-PT") : "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono">{formatKZ(l.valor)}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${st.cls}`}>{st.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setManaging(l)} className="p-1.5 rounded hover:bg-secondary" title="Atribuições"><Users className="size-4" /></button>
                          <button onClick={() => { setEditing(l); setOpenForm(true); }} className="p-1.5 rounded hover:bg-secondary" title="Editar"><Pencil className="size-4" /></button>
                          <button onClick={() => remover(l.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Remover"><Trash2 className="size-4" /></button>
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

      {openForm && <LicencaForm licenca={editing} onClose={() => { setOpenForm(false); setEditing(null); }} onSaved={() => qc.invalidateQueries({ queryKey: ["licencas"] })} />}
      {managing && <AtribuicoesPanel licenca={managing} onClose={() => setManaging(null)} />}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color} mt-1`}>{value}</p>
    </div>
  );
}

function LicencaForm({ licenca, onClose, onSaved }: { licenca: Licenca | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: licenca?.nome ?? "",
    fabricante: licenca?.fabricante ?? "",
    tipo: licenca?.tipo ?? "subscricao",
    chave: licenca?.chave ?? "",
    quantidade_total: licenca?.quantidade_total ?? 1,
    data_aquisicao: licenca?.data_aquisicao ?? "",
    data_validade: licenca?.data_validade ?? "",
    valor: licenca?.valor ?? "",
    fornecedor_id: licenca?.fornecedor_id ?? "",
    empresa_id: licenca?.empresa_id ?? "",
    notas: licenca?.notas ?? "",
  });
  const [saving, setSaving] = useState(false);

  const { data: empresas = [] } = useQuery({ queryKey:["emp-min"], queryFn: async () => (await supabase.from("empresas").select("id, nome, sigla").order("nome")).data ?? [] });
  const { data: fornecedores = [] } = useQuery({ queryKey:["forn-min"], queryFn: async () => (await supabase.from("fornecedores").select("id, nome_empresa").order("nome_empresa")).data ?? [] });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    const payload = {
      ...form,
      nome: form.nome.trim(),
      fabricante: form.fabricante || null,
      chave: form.chave || null,
      data_aquisicao: form.data_aquisicao || null,
      data_validade: form.data_validade || null,
      valor: form.valor === "" ? null : Number(form.valor),
      fornecedor_id: form.fornecedor_id || null,
      empresa_id: form.empresa_id || null,
      notas: form.notas || null,
      quantidade_total: Number(form.quantidade_total) || 1,
    };
    const { error } = licenca
      ? await supabase.from("licencas_software").update(payload).eq("id", licenca.id)
      : await supabase.from("licencas_software").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(licenca ? "Licença atualizada" : "Licença criada");
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-bold">{licenca ? "Editar licença" : "Nova licença"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome *" className="md:col-span-2"><input required value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} className="input" /></Field>
          <Field label="Fabricante"><input value={form.fabricante} onChange={(e) => setForm({...form, fabricante: e.target.value})} className="input" /></Field>
          <Field label="Tipo"><select value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value as typeof form.tipo})} className="input">{TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}</select></Field>
          <Field label="Chave / Serial" className="md:col-span-2"><input value={form.chave} onChange={(e) => setForm({...form, chave: e.target.value})} className="input font-mono" /></Field>
          <Field label="Quantidade adquirida *"><input type="number" min={1} required value={form.quantidade_total} onChange={(e) => setForm({...form, quantidade_total: Number(e.target.value)})} className="input" /></Field>
          <Field label="Valor (KZ)"><input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({...form, valor: e.target.value})} className="input" /></Field>
          <Field label="Data de aquisição"><input type="date" value={form.data_aquisicao} onChange={(e) => setForm({...form, data_aquisicao: e.target.value})} className="input" /></Field>
          <Field label="Data de validade"><input type="date" value={form.data_validade} onChange={(e) => setForm({...form, data_validade: e.target.value})} className="input" /></Field>
          <Field label="Fornecedor"><select value={form.fornecedor_id} onChange={(e) => setForm({...form, fornecedor_id: e.target.value})} className="input"><option value="">—</option>{fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome_empresa}</option>)}</select></Field>
          <Field label="Empresa"><select value={form.empresa_id} onChange={(e) => setForm({...form, empresa_id: e.target.value})} className="input"><option value="">—</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome} ({e.sigla})</option>)}</select></Field>
          <Field label="Notas" className="md:col-span-2"><textarea rows={3} value={form.notas} onChange={(e) => setForm({...form, notas: e.target.value})} className="input" /></Field>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg">Cancelar</button>
            <button disabled={saving} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? "A guardar…" : "Guardar"}</button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;padding:.5rem .75rem;background:hsl(var(--background));border:1px solid hsl(var(--border));border-radius:.5rem;font-size:.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px hsl(var(--accent)/0.3)}`}</style>
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

function AtribuicoesPanel({ licenca, onClose }: { licenca: Licenca; onClose: () => void }) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<"utilizador"|"ativo"|"empresa">("utilizador");
  const [alvoId, setAlvoId] = useState("");
  const [notas, setNotas] = useState("");

  const { data: atribs = [], isLoading } = useQuery({
    queryKey: ["licenca-atribs", licenca.id],
    queryFn: async () => (await supabase.from("licenca_atribuicoes").select("*").eq("licenca_id", licenca.id).order("atribuido_em", { ascending: false })).data as Atrib[] ?? [],
  });
  const { data: utilizadores = [] } = useQuery({ queryKey:["users-min"], queryFn: async () => (await supabase.from("profiles").select("id, nome, email").order("nome")).data ?? [] });
  const { data: ativos = [] } = useQuery({ queryKey:["ativos-min"], queryFn: async () => (await supabase.from("ativos").select("id, codigo_unico, nome").order("nome")).data ?? [] });
  const { data: empresas = [] } = useQuery({ queryKey:["emp-min2"], queryFn: async () => (await supabase.from("empresas").select("id, nome, sigla").order("nome")).data ?? [] });

  const ativas = atribs.filter((a) => !a.revogado_em);
  const historico = atribs.filter((a) => a.revogado_em);

  async function atribuir() {
    if (!alvoId) return toast.error("Selecione o alvo");
    let label = "";
    if (tipo === "utilizador") { const u = utilizadores.find((x) => x.id === alvoId); label = u ? `${u.nome ?? u.email}` : ""; }
    if (tipo === "ativo") { const a = ativos.find((x) => x.id === alvoId); label = a ? `${a.codigo_unico} — ${a.nome}` : ""; }
    if (tipo === "empresa") { const e = empresas.find((x) => x.id === alvoId); label = e ? `${e.nome} (${e.sigla})` : ""; }
    const { error } = await supabase.from("licenca_atribuicoes").insert({
      licenca_id: licenca.id, tipo_alvo: tipo, alvo_id: alvoId, alvo_label: label, notas: notas || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Atribuído");
    setAlvoId(""); setNotas("");
    qc.invalidateQueries({ queryKey: ["licenca-atribs", licenca.id] });
    qc.invalidateQueries({ queryKey: ["licenca-atribs-all"] });
  }

  async function revogar(id: string) {
    const { error } = await supabase.from("licenca_atribuicoes").update({ revogado_em: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Revogada");
    qc.invalidateQueries({ queryKey: ["licenca-atribs", licenca.id] });
    qc.invalidateQueries({ queryKey: ["licenca-atribs-all"] });
  }

  const opcoes = tipo === "utilizador" ? utilizadores.map((u) => ({ id: u.id, label: u.nome ?? u.email ?? u.id }))
    : tipo === "ativo" ? ativos.map((a) => ({ id: a.id, label: `${a.codigo_unico} — ${a.nome}` }))
    : empresas.map((e) => ({ id: e.id, label: `${e.nome} (${e.sigla})` }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="font-bold">Atribuições — {licenca.nome}</h2>
            <p className="text-xs text-muted-foreground">{ativas.length} / {licenca.quantidade_total} em uso</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="size-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-secondary/40 border border-border rounded-lg p-3">
            <p className="text-xs font-bold uppercase tracking-widest mb-2">Nova atribuição</p>
            <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2">
              <select value={tipo} onChange={(e) => { setTipo(e.target.value as typeof tipo); setAlvoId(""); }} className="input">
                <option value="utilizador">Utilizador</option>
                <option value="ativo">Ativo</option>
                <option value="empresa">Empresa</option>
              </select>
              <select value={alvoId} onChange={(e) => setAlvoId(e.target.value)} className="input">
                <option value="">Selecione…</option>
                {opcoes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <button onClick={atribuir} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold">Atribuir</button>
            </div>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (opcional)" className="input mt-2" />
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle2 className="size-3.5 text-success" /> Ativas ({ativas.length})</h3>
            {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> :
              ativas.length === 0 ? <p className="text-sm text-muted-foreground italic">Sem atribuições ativas.</p> :
              <ul className="divide-y divide-border border border-border rounded-lg">
                {ativas.map((a) => (
                  <li key={a.id} className="flex items-center justify-between p-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {a.tipo_alvo === "utilizador" ? <Users className="size-4 text-info" /> : a.tipo_alvo === "ativo" ? <Boxes className="size-4 text-accent" /> : <Building2 className="size-4 text-warning" />}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.alvo_label ?? a.alvo_id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.atribuido_em).toLocaleDateString("pt-PT")} {a.notas ? `• ${a.notas}` : ""}</p>
                      </div>
                    </div>
                    <button onClick={() => revogar(a.id)} className="text-xs text-destructive hover:underline">Revogar</button>
                  </li>
                ))}
              </ul>
            }
          </div>

          {historico.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2 text-muted-foreground">Histórico ({historico.length})</h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {historico.map((a) => (
                  <li key={a.id} className="flex justify-between border-b border-border py-1">
                    <span>{a.alvo_label ?? a.alvo_id}</span>
                    <span>{new Date(a.atribuido_em).toLocaleDateString("pt-PT")} → {a.revogado_em ? new Date(a.revogado_em).toLocaleDateString("pt-PT") : "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <style>{`.input{width:100%;padding:.5rem .75rem;background:hsl(var(--background));border:1px solid hsl(var(--border));border-radius:.5rem;font-size:.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px hsl(var(--accent)/0.3)}`}</style>
    </div>
  );
}
