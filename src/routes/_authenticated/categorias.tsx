import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/categorias")({
  component: CategoriasPage,
});

function CategoriasPage() {
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const [form, setForm] = useState({ nome: "", codigo_prefixo: "", descricao: "" });
  const [saving, setSaving] = useState(false);

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ["categorias-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nome, codigo_prefixo, descricao, ativos(count)")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleSave = async () => {
    if (!form.nome.trim() || !form.codigo_prefixo.trim()) {
      return toast.error("Nome e prefixo são obrigatórios.");
    }
    setSaving(true);
    const { error } = await supabase.from("categorias").insert({
      nome: form.nome.trim(),
      codigo_prefixo: form.codigo_prefixo.trim().toUpperCase(),
      descricao: form.descricao.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Categoria criada");
    setForm({ nome: "", codigo_prefixo: "", descricao: "" });
    qc.invalidateQueries({ queryKey: ["categorias-admin"] });
    qc.invalidateQueries({ queryKey: ["categorias"] });
  };

  const handleDelete = async (id: string, count: number) => {
    if (count > 0) return toast.error("Categoria possui ativos vinculados.");
    if (!confirm("Excluir esta categoria?")) return;
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
    qc.invalidateQueries({ queryKey: ["categorias-admin"] });
  };

  const inputCls = "w-full px-3 py-2 bg-card border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
        <p className="text-muted-foreground text-sm">
          Defina prefixos para geração automática de códigos (ex.: LAP-2026-0001).
        </p>
      </div>

      {isAdmin && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-card">
          <h2 className="font-bold mb-4 flex items-center gap-2"><Plus className="size-4 text-accent" /> Nova categoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className={`${inputCls} md:col-span-2`} placeholder="Nome (ex: Notebooks)" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <input className={`${inputCls} font-mono uppercase`} placeholder="Prefixo (ex: LAP)" maxLength={6} value={form.codigo_prefixo} onChange={(e) => setForm({ ...form, codigo_prefixo: e.target.value.toUpperCase() })} />
            <button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground rounded-lg text-sm font-semibold hover:bg-accent/90 disabled:opacity-60">
              {saving ? "Salvando..." : "Adicionar"}
            </button>
            <textarea rows={2} className={`${inputCls} md:col-span-4 resize-none`} placeholder="Descrição (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <th className="px-6 py-3">Categoria</th>
              <th className="px-6 py-3">Prefixo</th>
              <th className="px-6 py-3">Ativos</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">Carregando...</td></tr>
            ) : categorias.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">Sem categorias cadastradas.</td></tr>
            ) : categorias.map((c) => {
              const count = ((c.ativos as unknown) as { count: number }[] | null)?.[0]?.count ?? 0;
              return (
                <tr key={c.id} className="hover:bg-secondary/40">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold">{c.nome}</p>
                        {c.descricao && <p className="text-xs text-muted-foreground">{c.descricao}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3"><span className="font-mono text-xs font-bold">{c.codigo_prefixo}</span></td>
                  <td className="px-6 py-3 text-sm tabular-nums">{count}</td>
                  <td className="px-6 py-3 text-right">
                    {isAdmin && (
                      <button onClick={() => handleDelete(c.id, count)} className="text-destructive hover:text-destructive/80" title="Excluir">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
