import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Loader2, Plus, Pencil, Power, X } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: EmpresasPage,
});

interface Empresa {
  id: string;
  nome: string;
  sigla: string;
  status: string;
}

function EmpresasPage() {
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [open, setOpen] = useState(false);

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Empresa[];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["ativos-by-empresa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ativos").select("empresa_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((a) => { if (a.empresa_id) map[a.empresa_id] = (map[a.empresa_id] ?? 0) + 1; });
      return map;
    },
  });

  const toggleStatus = async (emp: Empresa) => {
    const novo = emp.status === "ativa" ? "inativa" : "ativa";
    const { error } = await supabase.from("empresas").update({ status: novo }).eq("id", emp.id);
    if (error) toast.error(error.message);
    else { toast.success(`Empresa ${novo === "ativa" ? "ativada" : "desativada"}`); qc.invalidateQueries({ queryKey: ["empresas"] }); }
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas do Grupo</h1>
          <p className="text-muted-foreground text-sm">Estrutura organizacional do GRUPO A3.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditing(null); setOpen(true); }} className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 shadow-sm">
            <Plus className="size-4" /> Nova Empresa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground"><Loader2 className="size-5 animate-spin inline" /></div>
        ) : (
          empresas.map((emp) => (
            <div key={emp.id} className={`bg-card border rounded-xl p-5 shadow-card transition-all hover:shadow-md ${emp.status === "ativa" ? "border-border" : "border-border opacity-60"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="size-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                  <Building2 className="size-5" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${emp.status === "ativa" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {emp.status}
                </span>
              </div>
              <h3 className="font-bold tracking-tight">{emp.nome}</h3>
              <p className="font-mono text-xs text-muted-foreground mt-0.5 tracking-wider">SIGLA: {emp.sigla}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ativos</p>
                  <p className="text-xl font-bold tabular-nums">{counts[emp.id] ?? 0}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(emp); setOpen(true); }} className="size-8 rounded hover:bg-secondary inline-flex items-center justify-center" title="Editar"><Pencil className="size-3.5" /></button>
                    <button onClick={() => toggleStatus(emp)} className="size-8 rounded hover:bg-secondary inline-flex items-center justify-center" title="Ativar/Desativar"><Power className="size-3.5" /></button>
                  </div>
                )}
              </div>
              <Link to="/ativos" className="text-xs text-accent hover:underline mt-3 inline-block">Ver ativos →</Link>
            </div>
          ))
        )}
      </div>

      {open && isAdmin && (
        <EmpresaForm
          empresa={editing}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["empresas"] }); }}
        />
      )}
    </div>
  );
}

function EmpresaForm({ empresa, onClose, onSaved }: { empresa: Empresa | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ nome: empresa?.nome ?? "", sigla: empresa?.sigla ?? "", status: empresa?.status ?? "ativa" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.sigla.trim()) return;
    setSaving(true);
    try {
      const payload = { nome: form.nome.trim(), sigla: form.sigla.trim().toUpperCase(), status: form.status };
      const { error } = empresa
        ? await supabase.from("empresas").update(payload).eq("id", empresa.id)
        : await supabase.from("empresas").insert(payload);
      if (error) throw error;
      toast.success(empresa ? "Empresa atualizada" : "Empresa criada");
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
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold">{empresa ? "Editar Empresa" : "Nova Empresa"}</h3>
          <button onClick={onClose}><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div><label className={lbl}>Nome *</label><input required className={`${inp} mt-1.5`} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><label className={lbl}>Sigla *</label><input required maxLength={10} className={`${inp} mt-1.5 font-mono uppercase`} value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value.toUpperCase() })} placeholder="ex: PR, ARQA3" /></div>
          <div>
            <label className={lbl}>Status</label>
            <select className={`${inp} mt-1.5 cursor-pointer`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
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
