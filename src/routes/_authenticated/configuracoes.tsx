import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Building2, Bell, Boxes, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

type Tab = "org" | "alertas" | "inventario" | "impressoras";

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "org", label: "Organização", icon: Building2 },
  { id: "alertas", label: "Alertas", icon: Bell },
  { id: "inventario", label: "Inventário", icon: Boxes },
  { id: "impressoras", label: "Impressoras", icon: Printer },
];

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
      (data ?? []).forEach((row) => {
        map[row.chave] = (row.valor as Record<string, unknown>) ?? {};
      });
      return map;
    },
  });

  const save = async (chave: string, valor: Record<string, unknown>) => {
    const { error } = await supabase
      .from("configuracoes")
      .upsert({ chave, valor: valor as never }, { onConflict: "chave" });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["configuracoes"] });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">Parâmetros globais do sistema. {!isAdmin && "(Somente administradores podem alterar.)"}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border mb-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${active ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {tab === "org" && <OrgTab values={configs.organizacao ?? { nome: "GRUPO A3" }} onSave={save} disabled={!isAdmin} />}
          {tab === "alertas" && <AlertasTab values={configs.alertas ?? {}} onSave={save} disabled={!isAdmin} />}
          {tab === "inventario" && <InventarioTab values={configs.inventario ?? {}} onSave={save} disabled={!isAdmin} />}
          {tab === "impressoras" && <ImpressorasTab values={configs.impressoras ?? {}} onSave={save} disabled={!isAdmin} />}
        </>
      )}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none";
const labelCls = "text-xs font-semibold uppercase tracking-wider";

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
    try {
      await onSave(chave, valor);
      toast.success("Configurações salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };
  return { loading, submit };
}

function OrgTab({ values, onSave, disabled }: TabProps) {
  const [nome, setNome] = useState(String(values.nome ?? "GRUPO A3"));
  useEffect(() => setNome(String(values.nome ?? "GRUPO A3")), [values]);
  const { loading, submit } = useSaver("organizacao", onSave);

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit({ nome }); }} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
      <div>
        <label className={labelCls}>Nome do grupo</label>
        <input className={`${inputCls} mt-1.5`} value={nome} onChange={(e) => setNome(e.target.value)} disabled={disabled} />
      </div>
      <div className="border-t border-border pt-4">
        <p className="text-sm font-semibold mb-2">Empresas do grupo</p>
        <p className="text-xs text-muted-foreground mb-3">Gerencie as empresas, siglas e estados.</p>
        <Link to="/empresas" className="text-sm font-semibold text-accent hover:underline">Abrir gestão de empresas →</Link>
      </div>
      {!disabled && <div className="flex justify-end"><SaveBtn loading={loading} /></div>}
    </form>
  );
}

function AlertasTab({ values, onSave, disabled }: TabProps) {
  const [form, setForm] = useState({
    toner_critico: Number(values.toner_critico ?? 20),
    toner_baixo: Number(values.toner_baixo ?? 40),
    papel_baixo: Number(values.papel_baixo ?? 25),
  });
  useEffect(() => setForm({
    toner_critico: Number(values.toner_critico ?? 20),
    toner_baixo: Number(values.toner_baixo ?? 40),
    papel_baixo: Number(values.papel_baixo ?? 25),
  }), [values]);
  const { loading, submit } = useSaver("alertas", onSave);

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(form); }} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
      <p className="text-xs text-muted-foreground">Limiares que disparam alertas e sugestões de compra automaticamente.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><label className={labelCls}>Toner crítico (%)</label><input type="number" min={0} max={100} className={`${inputCls} mt-1.5`} value={form.toner_critico} onChange={(e) => setForm({ ...form, toner_critico: Number(e.target.value) })} disabled={disabled} /></div>
        <div><label className={labelCls}>Toner baixo (%)</label><input type="number" min={0} max={100} className={`${inputCls} mt-1.5`} value={form.toner_baixo} onChange={(e) => setForm({ ...form, toner_baixo: Number(e.target.value) })} disabled={disabled} /></div>
        <div><label className={labelCls}>Papel baixo (%)</label><input type="number" min={0} max={100} className={`${inputCls} mt-1.5`} value={form.papel_baixo} onChange={(e) => setForm({ ...form, papel_baixo: Number(e.target.value) })} disabled={disabled} /></div>
      </div>
      {!disabled && <div className="flex justify-end"><SaveBtn loading={loading} /></div>}
    </form>
  );
}

function InventarioTab({ values, onSave, disabled }: TabProps) {
  const [estoqueMin, setEstoqueMin] = useState(Number(values.estoque_minimo_padrao ?? 5));
  useEffect(() => setEstoqueMin(Number(values.estoque_minimo_padrao ?? 5)), [values]);
  const { loading, submit } = useSaver("inventario", onSave);
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit({ estoque_minimo_padrao: estoqueMin }); }} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
      <div>
        <label className={labelCls}>Estoque mínimo padrão</label>
        <input type="number" min={0} className={`${inputCls} mt-1.5`} value={estoqueMin} onChange={(e) => setEstoqueMin(Number(e.target.value))} disabled={disabled} />
        <p className="text-[10px] text-muted-foreground mt-1">Aplicado a novos consumíveis quando não informado.</p>
      </div>
      <div className="border-t border-border pt-4">
        <p className="text-sm font-semibold mb-2">Categorias e prefixos</p>
        <Link to="/categorias" className="text-sm font-semibold text-accent hover:underline">Abrir gestão de categorias →</Link>
      </div>
      {!disabled && <div className="flex justify-end"><SaveBtn loading={loading} /></div>}
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
      {!disabled && <div className="flex justify-end"><SaveBtn loading={loading} /></div>}
    </form>
  );
}
