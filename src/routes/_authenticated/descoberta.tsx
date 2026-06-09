import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Radar, Check, EyeOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { aprovarDispositivo, ignorarDispositivo } from "@/lib/agents.functions";
import { EmptyState } from "@/components/empty-state";
import { useRole } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/descoberta")({
  component: DescobertaPage,
});

const TIPO_LABELS: Record<string, string> = {
  printer: "Impressora", computer: "Computador", switch: "Switch", router: "Router", ap: "Access Point", unknown: "Desconhecido",
};

function DescobertaPage() {
  const qc = useQueryClient();
  const { isManager } = useRole();
  const [estado, setEstado] = useState("novo");
  const [aprovar, setAprovar] = useState<{ id: string; nome: string; fab?: string; modelo?: string } | null>(null);

  const ignorarFn = useServerFn(ignorarDispositivo);
  const aprovarFn = useServerFn(aprovarDispositivo);

  const { data: items = [] } = useQuery({
    queryKey: ["descoberta", estado],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("dispositivos_descobertos").select("*").eq("estado", estado).order("descoberto_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: kpis } = useQuery({
    queryKey: ["descoberta-kpis"],
    refetchInterval: 30000,
    queryFn: async () => {
      const [novo, ign, aprov] = await Promise.all([
        supabase.from("dispositivos_descobertos").select("*", { count: "exact", head: true }).eq("estado", "novo"),
        supabase.from("dispositivos_descobertos").select("*", { count: "exact", head: true }).eq("estado", "ignorado"),
        supabase.from("dispositivos_descobertos").select("*", { count: "exact", head: true }).eq("estado", "aprovado"),
      ]);
      return { novo: novo.count ?? 0, ignorado: ign.count ?? 0, aprovado: aprov.count ?? 0 };
    },
  });

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Radar className="size-6" /> Descoberta de Rede</h1>
        <p className="text-muted-foreground text-sm">Dispositivos encontrados pelos agentes A3.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Kpi label="Novos" v={kpis?.novo ?? 0} cls="text-info" />
        <Kpi label="Ignorados" v={kpis?.ignorado ?? 0} cls="text-muted-foreground" />
        <Kpi label="Aprovados" v={kpis?.aprovado ?? 0} cls="text-success" />
      </div>

      <div className="flex gap-2 mb-4">
        {["novo","ignorado","aprovado"].map((s) => (
          <button key={s} onClick={() => setEstado(s)} className={`px-3 py-1.5 text-xs rounded-md border ${estado === s ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border text-muted-foreground"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Radar} title="Nada por aqui" description="Os agentes reportam novos dispositivos automaticamente." />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <tr><th className="px-4 py-3">IP / MAC</th><th className="px-4 py-3">Hostname</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Fabricante</th><th className="px-4 py-3">Descoberto</th><th className="px-4 py-3 text-right">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-2 text-xs font-mono">{d.ip}<br /><span className="text-muted-foreground">{d.mac}</span></td>
                  <td className="px-4 py-2 text-xs">{d.hostname ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{TIPO_LABELS[d.tipo_sugerido ?? "unknown"]}</td>
                  <td className="px-4 py-2 text-xs">{d.fabricante ?? "—"} {d.modelo}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(d.descoberto_em).toLocaleString("pt-PT")}</td>
                  <td className="px-4 py-2 text-right">
                    {isManager && estado === "novo" && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setAprovar({ id: d.id, nome: d.hostname || d.ip || "Dispositivo", fab: d.fabricante ?? undefined, modelo: d.modelo ?? undefined })} className="px-2 py-1 text-xs bg-success/10 text-success rounded border border-success/30 flex items-center gap-1"><Check className="size-3" /> Aprovar</button>
                        <button onClick={async () => { await ignorarFn({ data: { id: d.id } }); qc.invalidateQueries({ queryKey: ["descoberta"] }); qc.invalidateQueries({ queryKey: ["descoberta-kpis"] }); }} className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded border border-border flex items-center gap-1"><EyeOff className="size-3" /> Ignorar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aprovar && <AprovarModal info={aprovar} onClose={() => setAprovar(null)} onDone={() => { setAprovar(null); qc.invalidateQueries({ queryKey: ["descoberta"] }); qc.invalidateQueries({ queryKey: ["descoberta-kpis"] }); }} aprovarFn={aprovarFn} />}
    </div>
  );
}

function Kpi({ label, v, cls }: { label: string; v: number; cls: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${cls}`}>{v}</div>
    </div>
  );
}

function AprovarModal({ info, onClose, onDone, aprovarFn }: { info: { id: string; nome: string; fab?: string; modelo?: string }; onClose: () => void; onDone: () => void; aprovarFn: (a: { data: { id: string; nome: string; categoria_id: string; empresa_id: string } }) => Promise<unknown> }) {
  const [nome, setNome] = useState(info.nome);
  const [cat, setCat] = useState("");
  const [emp, setEmp] = useState("");
  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: async () => (await supabase.from("categorias").select("id,nome").order("nome")).data ?? [] });
  const { data: empresas = [] } = useQuery({ queryKey: ["empresas"], queryFn: async () => (await supabase.from("empresas").select("id,nome").order("nome")).data ?? [] });

  const submit = async () => {
    if (!cat || !emp) { toast.error("Selecione categoria e empresa"); return; }
    try {
      await aprovarFn({ data: { id: info.id, nome, categoria_id: cat, empresa_id: emp } });
      toast.success("Ativo criado");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center"><h2 className="font-bold">Aprovar dispositivo</h2><button onClick={onClose}><X className="size-4" /></button></div>
        <Input label="Nome" value={nome} onChange={setNome} />
        <Select label="Categoria" value={cat} onChange={setCat} options={categorias.map((c) => ({ v: c.id, l: c.nome }))} />
        <Select label="Empresa" value={emp} onChange={setEmp} options={empresas.map((e) => ({ v: e.id, l: e.nome }))} />
        <button onClick={submit} className="w-full py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium">Criar ativo</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
    </div>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm">
        <option value="">—</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
