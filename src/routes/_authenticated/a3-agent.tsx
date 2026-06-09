import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Server, Plus, Trash2, Copy, X, Loader2, Cpu, MemoryStick, HardDrive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { criarAgente, removerAgente } from "@/lib/agents.functions";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/a3-agent")({
  component: A3AgentPage,
});

function A3AgentPage() {
  const qc = useQueryClient();
  const { isAdmin, isManager } = useRole();
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState("");
  const [novoToken, setNovoToken] = useState<{ id: string; token: string } | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const criarFn = useServerFn(criarAgente);
  const removerFn = useServerFn(removerAgente);

  const { data: agentes = [], isLoading } = useQuery({
    queryKey: ["agentes"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("agentes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleCreate = async () => {
    if (!nome.trim()) return;
    try {
      const r = await criarFn({ data: { nome: nome.trim() } });
      setNovoToken(r);
      setNome("");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["agentes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este agente? Ele perderá a comunicação imediatamente.")) return;
    try {
      await removerFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["agentes"] });
      toast.success("Agente removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Server className="size-6" /> A3 Agent</h1>
          <p className="text-muted-foreground text-sm">Agentes locais monitorizando equipamentos.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setCreating(true)} className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium flex items-center gap-2 hover:opacity-90">
            <Plus className="size-4" /> Novo agente
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground text-sm py-12"><Loader2 className="size-5 animate-spin inline" /></div>
      ) : agentes.length === 0 ? (
        <EmptyState icon={Server} title="Sem agentes" description="Crie um agente e instale-o num Windows para começar a monitorizar." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentes.map((a) => {
            const online = a.ultimo_contato && new Date(a.ultimo_contato).getTime() > Date.now() - 5 * 60 * 1000;
            return (
              <button key={a.id} onClick={() => setSelecionado(a.id)} className="text-left bg-card border border-border rounded-xl p-4 hover:border-accent transition">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{a.nome}</div>
                    <div className="text-xs text-muted-foreground font-mono">{a.hostname ?? "—"}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border ${online ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}>
                    <span className={`size-1.5 rounded-full ${online ? "bg-success" : "bg-muted-foreground"}`} /> {online ? "Online" : "Offline"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Último contato: {a.ultimo_contato ? new Date(a.ultimo_contato).toLocaleString("pt-PT") : "nunca"}</div>
                {isManager && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }} className="mt-3 text-xs text-destructive flex items-center gap-1 hover:underline">
                    <Trash2 className="size-3" /> Remover
                  </button>
                )}
              </button>
            );
          })}
        </div>
      )}

      {creating && (
        <Modal onClose={() => setCreating(false)} title="Novo agente">
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-widest text-muted-foreground font-bold">Nome</label>
            <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: PC-RECEPCAO" className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
            <button onClick={handleCreate} className="w-full py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium">Criar agente</button>
          </div>
        </Modal>
      )}

      {novoToken && <TokenModal token={novoToken.token} onClose={() => setNovoToken(null)} />}
      {selecionado && <DetalheModal id={selecionado} onClose={() => setSelecionado(null)} />}
    </div>
  );
}

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose}><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TokenModal({ token, onClose }: { token: string; onClose: () => void }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const installCmd = `iwr -useb ${baseUrl}/agent/a3-agent.ps1 | iex; Install-A3Agent -Url '${baseUrl}' -Token '${token}'`;
  return (
    <Modal title="Chave de instalação" onClose={onClose}>
      <div className="space-y-3">
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-md text-xs">
          Esta chave aparece apenas uma vez. Guarde-a já — não será mostrada novamente.
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Token</label>
          <div className="flex gap-2">
            <input readOnly value={token} className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-xs font-mono" />
            <button onClick={() => { navigator.clipboard.writeText(token); toast.success("Copiado"); }} className="px-3 bg-secondary rounded-md"><Copy className="size-4" /></button>
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Comando PowerShell</label>
          <div className="flex gap-2">
            <textarea readOnly value={installCmd} rows={3} className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-xs font-mono resize-none" />
            <button onClick={() => { navigator.clipboard.writeText(installCmd); toast.success("Copiado"); }} className="px-3 bg-secondary rounded-md self-start"><Copy className="size-4" /></button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DetalheModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: inv } = useQuery({
    queryKey: ["agente-inventario", id],
    queryFn: async () => {
      const { data } = await supabase.from("agente_inventarios").select("*").eq("agente_id", id).order("coletado_em", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  const { data: eventos = [] } = useQuery({
    queryKey: ["agente-eventos", id],
    queryFn: async () => {
      const { data } = await supabase.from("agente_eventos").select("*").eq("agente_id", id).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });
  return (
    <Modal title="Detalhes do agente" onClose={onClose}>
      {inv ? (
        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          <Field label="Hostname" v={inv.hostname} />
          <Field label="Utilizador" v={inv.usuario_atual} />
          <Field label="IP" v={inv.ip} />
          <Field label="MAC" v={inv.mac} />
          <Field label="SO" v={`${inv.so ?? ""} ${inv.so_versao ?? ""}`.trim()} />
          <Field label="CPU" v={inv.cpu} icon={<Cpu className="size-3" />} />
          <Field label="RAM" v={inv.ram_mb ? `${(inv.ram_mb / 1024).toFixed(1)} GB` : null} icon={<MemoryStick className="size-3" />} />
          <Field label="Disco" v={inv.disco_total_gb ? `${inv.disco_livre_gb?.toFixed(0)} / ${inv.disco_total_gb?.toFixed(0)} GB livre` : null} icon={<HardDrive className="size-3" />} />
        </div>
      ) : <p className="text-xs text-muted-foreground mb-4">Sem inventário ainda.</p>}

      <h3 className="text-xs uppercase tracking-widest font-bold mb-2">Eventos recentes</h3>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {eventos.map((e) => (
          <div key={e.id} className="text-xs flex gap-2 py-1 border-b border-border/60">
            <span className="text-muted-foreground font-mono shrink-0">{new Date(e.created_at).toLocaleString("pt-PT")}</span>
            <span className="font-medium">{e.tipo}</span>
            <span className="text-muted-foreground truncate">{e.ip_origem}</span>
          </div>
        ))}
        {eventos.length === 0 && <p className="text-xs text-muted-foreground">Sem eventos.</p>}
      </div>
    </Modal>
  );
}

function Field({ label, v, icon }: { label: string; v?: string | number | null; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">{icon}{label}</div>
      <div className="font-medium">{v || "—"}</div>
    </div>
  );
}
