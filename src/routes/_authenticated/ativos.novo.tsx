import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS, STATUS_OPTIONS, type AtivoStatus } from "@/lib/asset-utils";

export const Route = createFileRoute("/_authenticated/ativos/novo")({
  component: NovoAtivoPage,
});

function NovoAtivoPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    categoria_id: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    status: "disponivel" as AtivoStatus,
    localizacao: "",
    responsavel: "",
    data_compra: "",
    garantia_ate: "",
    observacoes: "",
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.categoria_id) {
      toast.error("Nome e categoria são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("ativos")
        .insert({
          nome: form.nome,
          categoria_id: form.categoria_id,
          marca: form.marca || null,
          modelo: form.modelo || null,
          numero_serie: form.numero_serie || null,
          status: form.status,
          localizacao: form.localizacao || null,
          responsavel: form.responsavel || null,
          data_compra: form.data_compra || null,
          garantia_ate: form.garantia_ate || null,
          observacoes: form.observacoes || null,
          created_by: u.user?.id,
        })
        .select("id, codigo_unico")
        .single();
      if (error) throw error;
      toast.success(`Ativo ${data.codigo_unico} cadastrado!`);
      navigate({ to: "/ativos/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none";
  const labelCls = "text-xs font-semibold text-foreground uppercase tracking-wider";

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/ativos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Voltar à lista
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Novo Ativo</h1>
        <p className="text-muted-foreground text-sm">O código único e o QR Code serão gerados automaticamente.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Nome do ativo *</label>
            <input className={`${inputCls} mt-1.5`} required value={form.nome} onChange={(e) => update("nome", e.target.value)} placeholder="ex: MacBook Pro 16'' M3" />
          </div>
          <div>
            <label className={labelCls}>Categoria *</label>
            <select className={`${inputCls} mt-1.5 cursor-pointer`} required value={form.categoria_id} onChange={(e) => update("categoria_id", e.target.value)}>
              <option value="">Selecione...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} ({c.codigo_prefixo})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado inicial</label>
            <select className={`${inputCls} mt-1.5 cursor-pointer`} value={form.status} onChange={(e) => update("status", e.target.value as AtivoStatus)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Marca</label>
            <input className={`${inputCls} mt-1.5`} value={form.marca} onChange={(e) => update("marca", e.target.value)} placeholder="Apple, Dell, HP..." />
          </div>
          <div>
            <label className={labelCls}>Modelo</label>
            <input className={`${inputCls} mt-1.5`} value={form.modelo} onChange={(e) => update("modelo", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Número de série</label>
            <input className={`${inputCls} mt-1.5 font-mono`} value={form.numero_serie} onChange={(e) => update("numero_serie", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Localização</label>
            <input className={`${inputCls} mt-1.5`} value={form.localizacao} onChange={(e) => update("localizacao", e.target.value)} placeholder="Sala TI, Mesa 12..." />
          </div>
          <div>
            <label className={labelCls}>Responsável</label>
            <input className={`${inputCls} mt-1.5`} value={form.responsavel} onChange={(e) => update("responsavel", e.target.value)} placeholder="Nome do colaborador" />
          </div>
          <div>
            <label className={labelCls}>Data de compra</label>
            <input type="date" className={`${inputCls} mt-1.5`} value={form.data_compra} onChange={(e) => update("data_compra", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Garantia até</label>
            <input type="date" className={`${inputCls} mt-1.5`} value={form.garantia_ate} onChange={(e) => update("garantia_ate", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Observações</label>
            <textarea rows={3} className={`${inputCls} mt-1.5 resize-none`} value={form.observacoes} onChange={(e) => update("observacoes", e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Link to="/ativos" className="px-4 py-2 border border-border bg-card text-sm font-semibold rounded-lg hover:bg-secondary">
            Cancelar
          </Link>
          <button type="submit" disabled={saving} className="bg-accent text-accent-foreground px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 disabled:opacity-60 shadow-sm">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Cadastrar Ativo
          </button>
        </div>
      </form>
    </div>
  );
}
