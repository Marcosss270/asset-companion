import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Plus, Loader2, X, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AssetHealthBadge } from "@/components/asset-health-badge";
import { diasParaVencer, type SaudeAtivo } from "@/lib/lifecycle";

interface Props { ativoId: string }

export function GarantiaSection({ ativoId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: garantias = [] } = useQuery({
    queryKey: ["garantias", ativoId],
    queryFn: async () => (await supabase.from("ativo_garantias").select("*").eq("ativo_id", ativoId).order("data_fim", { ascending: false })).data ?? [],
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => (await supabase.from("fornecedores").select("id, nome_empresa").order("nome_empresa")).data ?? [],
  });

  const { data: saude } = useQuery({
    queryKey: ["saude", ativoId],
    queryFn: async () => {
      const { data } = await supabase.rpc("saude_ativo", { _ativo_id: ativoId });
      return (data ?? "bom") as SaudeAtivo;
    },
  });

  const ativa = garantias.find((g) => new Date(g.data_fim) >= new Date());
  const dias = ativa ? diasParaVencer(ativa.data_fim) : null;

  const remover = async (id: string) => {
    if (!confirm("Remover esta garantia?")) return;
    const { error } = await supabase.from("ativo_garantias").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Garantia removida"); qc.invalidateQueries({ queryKey: ["garantias", ativoId] }); }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="font-bold flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> Garantia & Ciclo de Vida</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Acompanhe garantias, renovações e a saúde do ativo.</p>
        </div>
        <div className="flex items-center gap-2">
          {saude && <AssetHealthBadge saude={saude} />}
          <button onClick={() => setOpen(true)} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-accent text-accent-foreground flex items-center gap-1.5"><Plus className="size-3.5" /> Registrar</button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {ativa ? (
          <div className={`p-4 rounded-lg border ${dias != null && dias < 30 ? "bg-destructive/5 border-destructive/30" : dias != null && dias < 90 ? "bg-warning/5 border-warning/30" : "bg-success/5 border-success/30"}`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm font-bold">Garantia ativa</p>
              <span className="text-xs font-mono">{ativa.data_inicio} → {ativa.data_fim}</span>
            </div>
            <p className="text-xs text-muted-foreground">{dias != null ? `${dias} dia(s) restante(s)` : ""} {ativa.tipo && ` • ${ativa.tipo}`}</p>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-border bg-secondary/40 text-sm text-muted-foreground">Sem garantia ativa registrada.</div>
        )}

        {garantias.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead><tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <th className="px-3 py-2">Início</th><th className="px-3 py-2">Fim</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Fornecedor</th><th className="px-3 py-2">Nota</th><th></th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {garantias.map((g) => {
                  const f = fornecedores.find((x) => x.id === g.fornecedor_id);
                  return (
                    <tr key={g.id}>
                      <td className="px-3 py-1.5 font-mono">{g.data_inicio}</td>
                      <td className="px-3 py-1.5 font-mono">{g.data_fim}</td>
                      <td className="px-3 py-1.5">{g.tipo}</td>
                      <td className="px-3 py-1.5">{f?.nome_empresa ?? "—"}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{g.nota ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right"><button onClick={() => remover(g.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <GarantiaModal ativoId={ativoId} fornecedores={fornecedores} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["garantias", ativoId] }); qc.invalidateQueries({ queryKey: ["saude", ativoId] }); }} />}
    </div>
  );
}

function GarantiaModal({ ativoId, fornecedores, onClose, onSaved }: { ativoId: string; fornecedores: { id: string; nome_empresa: string }[]; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ data_inicio: today, data_fim: today, tipo: "original", fornecedor_id: "", nota: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("ativo_garantias").insert({
        ativo_id: ativoId,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        tipo: form.tipo,
        fornecedor_id: form.fornecedor_id || null,
        nota: form.nota || null,
        created_by: u.user?.id,
      });
      if (error) throw error;
      toast.success("Garantia registrada");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setSaving(false); }
  };

  const inp = "w-full px-3 py-2 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none";
  const lbl = "text-xs font-semibold uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold flex items-center gap-2"><RefreshCw className="size-4" /> Registrar garantia</h3>
          <button onClick={onClose}><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Início *</label><input required type="date" className={`${inp} mt-1.5`} value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
            <div><label className={lbl}>Fim *</label><input required type="date" className={`${inp} mt-1.5`} value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
          </div>
          <div><label className={lbl}>Tipo</label>
            <select className={`${inp} mt-1.5`} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="original">Original</option><option value="renovacao">Renovação</option><option value="substituicao">Substituição</option>
            </select>
          </div>
          <div><label className={lbl}>Fornecedor</label>
            <select className={`${inp} mt-1.5`} value={form.fornecedor_id} onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })}>
              <option value="">—</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome_empresa}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Nota</label><textarea rows={2} className={`${inp} mt-1.5 resize-none`} value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></div>
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
