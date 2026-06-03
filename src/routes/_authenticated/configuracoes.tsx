import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Building2, Bell, Boxes, Printer, Upload, Star, Pencil, Power, Plus, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { loadOrgInfo } from "@/lib/org";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

type Tab = "org" | "empresas" | "inventario" | "alertas" | "impressoras";

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "org", label: "Organização", icon: Building2 },
  { id: "empresas", label: "Empresas do Grupo", icon: Building2 },
  { id: "inventario", label: "Inventário", icon: Boxes },
  { id: "alertas", label: "Alertas", icon: Bell },
  { id: "impressoras", label: "Impressoras", icon: Printer },
];

const inputCls = "w-full px-3 py-2 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none";
const labelCls = "text-xs font-semibold uppercase tracking-wider";

function ConfiguracoesPage() {
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("org");

  const { data: configs = {}, isLoading } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes").select("chave, valor");
      if (error) throw error;
      const map: Record<string, Record<string, unknown>> = {};
      (data ?? []).forEach((row) => { map[row.chave] = (row.valor as Record<string, unknown>) ?? {}; });
      return map;
    },
  });

  const save = useCallback(async (chave: string, valor: Record<string, unknown>) => {
    const { error } = await supabase.from("configuracoes").upsert({ chave, valor: valor as never }, { onConflict: "chave" });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["configuracoes"] });
  }, [qc]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">Central administrativa do Asset Companion. {!isAdmin && "(Somente administradores podem alterar.)"}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${active ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {tab === "org" && <OrgTab values={configs.organizacao ?? {}} onSave={save} disabled={!isAdmin} />}
          {tab === "empresas" && <EmpresasTab disabled={!isAdmin} />}
          {tab === "inventario" && <InventarioTab values={configs.inventario ?? {}} onSave={save} disabled={!isAdmin} />}
          {tab === "alertas" && <AlertasTab values={configs.alertas ?? {}} onSave={save} disabled={!isAdmin} />}
          {tab === "impressoras" && <ImpressorasTab values={configs.impressoras ?? {}} onSave={save} disabled={!isAdmin} />}
        </>
      )}
    </div>
  );
}

interface TabProps {
  values: Record<string, unknown>;
  onSave: (chave: string, valor: Record<string, unknown>) => Promise<void>;
  disabled: boolean;
}

function SaveBtn({ loading }: { loading: boolean }) {
  return (
    <button disabled={loading} className="bg-accent text-accent-foreground px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 disabled:opacity-60">
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
    </button>
  );
}

function useSaver(chave: string, onSave: TabProps["onSave"]) {
  const [loading, setLoading] = useState(false);
  const submit = async (valor: Record<string, unknown>) => {
    setLoading(true);
    try { await onSave(chave, valor); toast.success("Configurações salvas"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  };
  return { loading, submit };
}

function OrgTab({ values, onSave, disabled }: TabProps) {
  const [form, setForm] = useState({
    nome: String(values.nome ?? "GRUPO A3"),
    email: String(values.email ?? ""),
    telefone: String(values.telefone ?? ""),
    endereco: String(values.endereco ?? ""),
    logo_path: values.logo_path ? String(values.logo_path) : "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { loading, submit } = useSaver("organizacao", onSave);

  useEffect(() => {
    setForm({
      nome: String(values.nome ?? "GRUPO A3"),
      email: String(values.email ?? ""),
      telefone: String(values.telefone ?? ""),
      endereco: String(values.endereco ?? ""),
      logo_path: values.logo_path ? String(values.logo_path) : "",
    });
  }, [values]);

  useEffect(() => {
    if (!form.logo_path) { setLogoUrl(null); return; }
    supabase.storage.from("branding").createSignedUrl(form.logo_path, 3600).then(({ data }) => setLogoUrl(data?.signedUrl ?? null));
  }, [form.logo_path]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) throw error;
      setForm({ ...form, logo_path: path });
      toast.success("Logo carregado. Lembre-se de salvar.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setUploading(false); }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(form); }} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6">
        <div>
          <label className={labelCls}>Logotipo</label>
          <div className="mt-2 size-40 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/30 relative">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="object-contain w-full h-full" /> : <ImageIcon className="size-10 text-muted-foreground" />}
          </div>
          {!disabled && (
            <label className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-accent hover:underline">
              <Upload className="size-3.5" /> {uploading ? "Enviando..." : "Carregar logo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </label>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className={labelCls}>Nome da organização</label><input className={`${inputCls} mt-1.5`} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} disabled={disabled} /></div>
          <div><label className={labelCls}>E-mail principal</label><input type="email" className={`${inputCls} mt-1.5`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={disabled} /></div>
          <div><label className={labelCls}>Telefone principal</label><input className={`${inputCls} mt-1.5`} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} disabled={disabled} /></div>
          <div className="md:col-span-2"><label className={labelCls}>Endereço</label><textarea rows={2} className={`${inputCls} mt-1.5 resize-none`} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} disabled={disabled} /></div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">Estes dados aparecem no cabeçalho de relatórios em PDF e nas impressões.</p>
      {!disabled && <div className="flex justify-end border-t border-border pt-4"><SaveBtn loading={loading} /></div>}
    </form>
  );
}

function EmpresasTab({ disabled }: { disabled: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string; nome: string; sigla: string; status: string } | null>(null);
  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas-config"],
    queryFn: async () => (await supabase.from("empresas").select("*").order("nome")).data ?? [],
  });

  const setPadrao = async (id: string) => {
    await supabase.from("empresas").update({ padrao: false }).neq("id", id);
    const { error } = await supabase.from("empresas").update({ padrao: true }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Empresa padrão definida"); qc.invalidateQueries({ queryKey: ["empresas-config"] }); qc.invalidateQueries({ queryKey: ["empresas"] }); }
  };

  const toggleStatus = async (emp: { id: string; status: string }) => {
    const novo = emp.status === "ativa" ? "inativa" : "ativa";
    const { error } = await supabase.from("empresas").update({ status: novo }).eq("id", emp.id);
    if (error) toast.error(error.message);
    else { toast.success(`Empresa ${novo === "ativa" ? "ativada" : "desativada"}`); qc.invalidateQueries({ queryKey: ["empresas-config"] }); }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h3 className="font-bold">Empresas do Grupo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Defina a empresa padrão usada como sugestão em formulários.</p>
        </div>
        {!disabled && (
          <button onClick={() => setEditing({ nome: "", sigla: "", status: "ativa" })} className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-2 rounded-md flex items-center gap-1.5"><Plus className="size-3.5" /> Nova</button>
        )}
      </div>
      <div className="overflow-x-auto">
        {isLoading ? <div className="py-12 text-center"><Loader2 className="size-5 animate-spin inline text-muted-foreground" /></div> : (
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <th className="px-6 py-3">Sigla</th><th className="px-6 py-3">Nome</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Padrão</th><th className="px-6 py-3 text-right">Ações</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {empresas.map((emp) => (
                <tr key={emp.id} className={emp.status === "ativa" ? "" : "opacity-60"}>
                  <td className="px-6 py-3 font-mono font-bold">{emp.sigla}</td>
                  <td className="px-6 py-3 font-semibold">{emp.nome}</td>
                  <td className="px-6 py-3"><span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${emp.status === "ativa" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{emp.status}</span></td>
                  <td className="px-6 py-3">
                    {!disabled ? (
                      <button onClick={() => setPadrao(emp.id)} title={emp.padrao ? "Empresa padrão" : "Definir como padrão"} className={emp.padrao ? "text-warning" : "text-muted-foreground hover:text-warning"}>
                        <Star className={`size-4 ${emp.padrao ? "fill-current" : ""}`} />
                      </button>
                    ) : emp.padrao ? <Star className="size-4 text-warning fill-current" /> : null}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {!disabled && (
                      <div className="inline-flex gap-1">
                        <button onClick={() => setEditing({ id: emp.id, nome: emp.nome, sigla: emp.sigla, status: emp.status })} className="size-7 rounded hover:bg-secondary inline-flex items-center justify-center" title="Editar"><Pencil className="size-3.5" /></button>
                        <button onClick={() => toggleStatus(emp)} className="size-7 rounded hover:bg-secondary inline-flex items-center justify-center" title="Ativar/Desativar"><Power className="size-3.5" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editing && !disabled && <EmpresaModal empresa={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["empresas-config"] }); qc.invalidateQueries({ queryKey: ["empresas"] }); }} />}
    </div>
  );
}

function EmpresaModal({ empresa, onClose, onSaved }: { empresa: { id?: string; nome: string; sigla: string; status: string }; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(empresa);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { nome: form.nome.trim(), sigla: form.sigla.trim().toUpperCase(), status: form.status };
      const { error } = empresa.id
        ? await supabase.from("empresas").update(payload).eq("id", empresa.id)
        : await supabase.from("empresas").insert(payload);
      if (error) throw error;
      toast.success(empresa.id ? "Empresa atualizada" : "Empresa criada");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold">{empresa.id ? "Editar empresa" : "Nova empresa"}</h3>
          <button onClick={onClose}><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div><label className={labelCls}>Nome *</label><input required className={`${inputCls} mt-1.5`} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><label className={labelCls}>Sigla *</label><input required maxLength={10} className={`${inputCls} mt-1.5 font-mono uppercase`} value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value.toUpperCase() })} /></div>
          <div><label className={labelCls}>Status</label>
            <select className={`${inputCls} mt-1.5 cursor-pointer`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ativa">Ativa</option><option value="inativa">Inativa</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-accent text-accent-foreground px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="size-4 animate-spin" />} Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InventarioTab({ values, onSave, disabled }: TabProps) {
  const [estoqueMin, setEstoqueMin] = useState(Number(values.estoque_minimo_padrao ?? 5));
  useEffect(() => setEstoqueMin(Number(values.estoque_minimo_padrao ?? 5)), [values]);
  const { loading, submit } = useSaver("inventario", onSave);
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit({ estoque_minimo_padrao: estoqueMin }); }} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
      <div>
        <label className={labelCls}>Formato do código de ativo</label>
        <div className="mt-1.5 bg-secondary/50 border border-border rounded-lg p-4 font-mono text-sm">
          <span className="text-accent font-bold">[EMPRESA]</span>-<span className="text-success font-bold">[TIPO]</span>-<span className="text-warning font-bold">[ANO]</span>-<span className="text-info font-bold">[NÚMERO]</span>
          <p className="text-[10px] text-muted-foreground mt-2 font-sans">Exemplo: <code className="bg-card px-1.5 py-0.5 rounded">PR-NB-2026-0001</code>. Gerado automaticamente ao cadastrar.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Estoque mínimo padrão</label>
          <input type="number" min={0} className={`${inputCls} mt-1.5`} value={estoqueMin} onChange={(e) => setEstoqueMin(Number(e.target.value))} disabled={disabled} />
          <p className="text-[10px] text-muted-foreground mt-1">Sugerido para novos consumíveis.</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-secondary/30">
          <p className="text-xs font-semibold mb-1">Tipos de ativos (categorias)</p>
          <p className="text-[10px] text-muted-foreground mb-2">Cadastre tipos e prefixos usados no código.</p>
          <Link to="/categorias" className="text-xs font-semibold text-accent hover:underline">Abrir gestão de categorias →</Link>
        </div>
      </div>

      <div className="border border-border rounded-lg p-4 bg-secondary/30">
        <p className="text-xs font-semibold mb-1">Estados dos ativos</p>
        <p className="text-[10px] text-muted-foreground">Disponível, Em uso, Em manutenção, Obsoleto, Baixado. Os rótulos e cores são padrão do sistema.</p>
      </div>

      {!disabled && <div className="flex justify-end border-t border-border pt-4"><SaveBtn loading={loading} /></div>}
    </form>
  );
}

function AlertasTab({ values, onSave, disabled }: TabProps) {
  const [form, setForm] = useState({
    toner_critico: Number(values.toner_critico ?? 20),
    toner_baixo: Number(values.toner_baixo ?? 40),
    papel_baixo: Number(values.papel_baixo ?? 25),
    estoque_critico_pct: Number(values.estoque_critico_pct ?? 50),
    manutencao_preventiva_dias: Number(values.manutencao_preventiva_dias ?? 90),
    garantia_alerta_dias: Number(values.garantia_alerta_dias ?? 90),
  });
  useEffect(() => setForm({
    toner_critico: Number(values.toner_critico ?? 20),
    toner_baixo: Number(values.toner_baixo ?? 40),
    papel_baixo: Number(values.papel_baixo ?? 25),
    estoque_critico_pct: Number(values.estoque_critico_pct ?? 50),
    manutencao_preventiva_dias: Number(values.manutencao_preventiva_dias ?? 90),
    garantia_alerta_dias: Number(values.garantia_alerta_dias ?? 90),
  }), [values]);
  const { loading, submit } = useSaver("alertas", onSave);

  const Field = ({ label, hint, k, min = 0, max = 365 }: { label: string; hint?: string; k: keyof typeof form; min?: number; max?: number }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input type="number" min={min} max={max} className={`${inputCls} mt-1.5`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} disabled={disabled} />
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(form); }} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
      <div>
        <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Impressoras / SNMP</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Toner crítico (%)" k="toner_critico" max={100} hint="Alerta vermelho abaixo deste valor." />
          <Field label="Toner baixo (%)" k="toner_baixo" max={100} />
          <Field label="Papel baixo (%)" k="papel_baixo" max={100} />
        </div>
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Estoque & Manutenção</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Estoque crítico (% acima do mínimo)" k="estoque_critico_pct" max={100} hint="Considerar crítico itens abaixo de X% do estoque mínimo." />
          <Field label="Manutenção preventiva (dias)" k="manutencao_preventiva_dias" hint="Avisar X dias após a última manutenção." />
        </div>
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Garantias</h4>
        <Field label="Antecedência do aviso (dias)" k="garantia_alerta_dias" hint="Alertas serão gerados em 30, 60 e 90 dias de antecedência." />
      </div>

      {!disabled && <div className="flex justify-end border-t border-border pt-4"><SaveBtn loading={loading} /></div>}
    </form>
  );
}

function ImpressorasTab({ values, onSave, disabled }: TabProps) {
  const [form, setForm] = useState({
    intervalo_snmp_min: Number(values.intervalo_snmp_min ?? 15),
    comunidade_padrao: String(values.comunidade_padrao ?? "public"),
  });
  useEffect(() => setForm({
    intervalo_snmp_min: Number(values.intervalo_snmp_min ?? 15),
    comunidade_padrao: String(values.comunidade_padrao ?? "public"),
  }), [values]);
  const { loading, submit } = useSaver("impressoras", onSave);
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(form); }} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className={labelCls}>Intervalo SNMP (min)</label><input type="number" min={1} className={`${inputCls} mt-1.5`} value={form.intervalo_snmp_min} onChange={(e) => setForm({ ...form, intervalo_snmp_min: Number(e.target.value) })} disabled={disabled} /></div>
        <div><label className={labelCls}>Comunidade SNMP padrão</label><input className={`${inputCls} mt-1.5 font-mono`} value={form.comunidade_padrao} onChange={(e) => setForm({ ...form, comunidade_padrao: e.target.value })} disabled={disabled} /></div>
      </div>
      <p className="text-[10px] text-muted-foreground">Estes valores são utilizados como padrão pelo agente local de leitura.</p>
      {!disabled && <div className="flex justify-end border-t border-border pt-4"><SaveBtn loading={loading} /></div>}
    </form>
  );
}

// Re-export for tree-shaking-friendly use elsewhere
export { loadOrgInfo };
