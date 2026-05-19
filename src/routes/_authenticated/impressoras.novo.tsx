import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/impressoras/novo")({
  component: NovaImpressoraPage,
});

function NovaImpressoraPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ativo_id: "", ip: "", porta_snmp: 161, comunidade_snmp: "public", modelo: "" });

  const { data: ativos = [] } = useQuery({
    queryKey: ["ativos-printers-eligible"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ativos")
        .select("id, codigo_unico, nome, categorias(nome)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleSave = async () => {
    if (!form.ativo_id || !form.ip) {
      toast.error("Ativo e IP são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("impressoras" as never).insert(form);
      if (error) throw error;
      toast.success("Impressora cadastrada!");
      navigate({ to: "/impressoras" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full px-3 py-2 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none";
  const label = "text-xs font-semibold uppercase tracking-wider";

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/impressoras" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Nova impressora</h1>
      <p className="text-sm text-muted-foreground mb-6">Vincule a um ativo existente e configure o acesso SNMP.</p>

      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <div>
          <label className={label}>Ativo vinculado *</label>
          <select className={`${input} mt-1.5 cursor-pointer`} value={form.ativo_id} onChange={(e) => setForm({ ...form, ativo_id: e.target.value })}>
            <option value="">Selecione um ativo...</option>
            {ativos.map((a) => (
              <option key={a.id} value={a.id}>{a.codigo_unico} — {a.nome}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className={label}>Endereço IP *</label>
            <input className={`${input} mt-1.5 font-mono`} placeholder="192.168.1.50" value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} />
          </div>
          <div>
            <label className={label}>Porta SNMP</label>
            <input type="number" className={`${input} mt-1.5 font-mono`} value={form.porta_snmp} onChange={(e) => setForm({ ...form, porta_snmp: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={label}>Comunidade SNMP</label>
            <input className={`${input} mt-1.5`} value={form.comunidade_snmp} onChange={(e) => setForm({ ...form, comunidade_snmp: e.target.value })} />
          </div>
          <div>
            <label className={label}>Modelo</label>
            <input className={`${input} mt-1.5`} placeholder="HP LaserJet M404" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Cadastrar
          </button>
        </div>
      </div>
    </div>
  );
}
