import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  UserPlus,
  KeyRound,
  Power,
  Loader2,
  X,
  Pencil,
  Search,
  History,
  ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole, type AppRole } from "@/hooks/use-role";
import { EmptyState } from "@/components/empty-state";
import {
  listUsersAdmin,
  createUserAdmin,
  updateUserAdmin,
  setUserAtivoAdmin,
  setUserPasswordAdmin,
  getUserAuditLog,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

const ROLE_OPTIONS: AppRole[] = ["admin", "manager", "viewer"];
const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  manager: "Técnico / Gestor",
  viewer: "Visualizador",
  tenant_master: "Tenant Master",
};

const ACTION_LABELS: Record<string, string> = {
  criacao: "Utilizador criado",
  edicao: "Dados alterados",
  alteracao_senha: "Senha redefinida",
  desativacao: "Utilizador desativado",
  reativacao: "Utilizador reativado",
};

type Modal =
  | { kind: "create" }
  | { kind: "edit"; id: string; nome: string; role: AppRole }
  | { kind: "password"; id: string; email: string }
  | { kind: "history"; id: string; nome: string }
  | null;

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function UsuariosPage() {
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const listFn = useServerFn(listUsersAdmin);

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["profiles-with-roles"],
    queryFn: async () => {
      const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email, ativo, created_at").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byUser = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => {
        const arr = byUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        byUser.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
    },
  });

  const { data: authUsers = [] } = useQuery({
    queryKey: ["auth-users-admin"],
    enabled: isAdmin,
    queryFn: () => listFn(),
  });

  const authMap = new Map(authUsers.map((u) => [u.id, u]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = q
      ? profiles.filter(
          (p) => p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
        )
      : profiles.slice();
    arr.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortDir === "asc" ? da - db : db - da;
    });
    return arr;
  }, [profiles, search, sortDir]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["profiles-with-roles"] });
    qc.invalidateQueries({ queryKey: ["auth-users-admin"] });
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    if (!confirm(current ? "Desativar este utilizador?" : "Reativar este utilizador?")) return;
    try {
      await setUserAtivoAdmin({ data: { id, ativo: !current } });
      toast.success(current ? "Utilizador desativado" : "Utilizador reativado");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilizadores</h1>
          <p className="text-muted-foreground text-sm">
            Gestão de equipe e papéis no sistema. {!isAdmin && "(Somente administradores podem alterar.)"}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal({ kind: "create" })}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90"
          >
            <UserPlus className="size-4" /> Novo utilizador
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <RoleCard icon={ShieldCheck} label="Administrador" desc="Acesso total: gerencia usuários, configurações e exclui registros." />
          <RoleCard icon={ShieldAlert} label="Técnico" desc="Pode criar e editar ativos, consumíveis e manutenções." />
          <RoleCard icon={ShieldOff} label="Visualizador" desc="Acesso somente leitura ao inventário." />
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome ou email..."
            className="w-full pl-9 pr-3 py-2 bg-secondary border-none rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none"
          />
        </div>
        <button
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="px-3 py-2 rounded-lg bg-secondary text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary/70"
        >
          <ArrowUpDown className="size-3.5" />
          Data: {sortDir === "asc" ? "mais antigos" : "mais recentes"}
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead>
              <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3">Estado</th>
                {isAdmin && <th className="px-4 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingProfiles ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={UserPlus} title="Nenhum utilizador" description={search ? "Sem resultados para a pesquisa." : "Crie o primeiro utilizador para começar."} /></td></tr>
              ) : filtered.map((u) => {
                const current = u.roles[0] ?? "viewer";
                const auth = authMap.get(u.id);
                const last = auth?.last_sign_in_at;
                return (
                  <tr key={u.id} className={u.ativo ? "" : "opacity-60"}>
                    <td className="px-4 py-3 text-sm font-medium">{u.nome}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full font-semibold uppercase whitespace-nowrap">
                        {ROLE_LABELS[current as AppRole]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">{fmtDate(last)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${u.ativo ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button title="Histórico" onClick={() => setModal({ kind: "history", id: u.id, nome: u.nome })} className="p-1.5 hover:bg-secondary rounded">
                            <History className="size-3.5" />
                          </button>
                          <button title="Editar" onClick={() => setModal({ kind: "edit", id: u.id, nome: u.nome, role: current as AppRole })} className="p-1.5 hover:bg-secondary rounded">
                            <Pencil className="size-3.5" />
                          </button>
                          <button title="Alterar senha" onClick={() => setModal({ kind: "password", id: u.id, email: u.email })} className="p-1.5 hover:bg-secondary rounded">
                            <KeyRound className="size-3.5" />
                          </button>
                          <button title={u.ativo ? "Desativar" : "Reativar"} onClick={() => handleToggleActive(u.id, u.ativo)} className={`p-1.5 hover:bg-secondary rounded ${u.ativo ? "text-destructive" : "text-emerald-600"}`}>
                            <Power className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.kind === "create" && <CreateModal onClose={() => setModal(null)} onDone={invalidate} />}
      {modal?.kind === "edit" && <EditModal user={modal} onClose={() => setModal(null)} onDone={invalidate} />}
      {modal?.kind === "password" && <PasswordModal user={modal} onClose={() => setModal(null)} />}
      {modal?.kind === "history" && <HistoryModal user={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function RoleCard({ icon: Icon, label, desc }: { icon: typeof ShieldCheck; label: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="size-4 text-accent" />
        <p className="text-sm font-bold">{label}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function ModalShell({ title, children, onClose, size = "md" }: { title: string; children: React.ReactNode; onClose: () => void; size?: "md" | "lg" }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-card border border-border rounded-xl shadow-xl w-full ${size === "lg" ? "max-w-2xl" : "max-w-md"} p-6 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 bg-secondary/40 border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none";
const labelCls = "text-xs font-semibold uppercase tracking-wider";

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nome: "", email: "", password: "", role: "viewer" as AppRole });
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createUserAdmin({ data: form });
      toast.success("Utilizador criado");
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };
  return (
    <ModalShell title="Novo utilizador" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className={labelCls}>Nome</label><input required className={`${inputCls} mt-1`} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div><label className={labelCls}>Email</label><input type="email" required className={`${inputCls} mt-1`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className={labelCls}>Senha temporária</label><input type="text" required minLength={6} className={`${inputCls} mt-1 font-mono`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div>
          <label className={labelCls}>Papel</label>
          <select className={`${inputCls} mt-1 cursor-pointer`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <button disabled={loading} className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 className="size-4 animate-spin" />} Criar utilizador
        </button>
      </form>
    </ModalShell>
  );
}

function EditModal({ user, onClose, onDone }: { user: { id: string; nome: string; role: AppRole }; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nome: user.nome, role: user.role });
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserAdmin({ data: { id: user.id, nome: form.nome, role: form.role } });
      toast.success("Utilizador atualizado");
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };
  return (
    <ModalShell title="Editar utilizador" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className={labelCls}>Nome</label><input required className={`${inputCls} mt-1`} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div>
          <label className={labelCls}>Papel</label>
          <select className={`${inputCls} mt-1 cursor-pointer`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <button disabled={loading} className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 className="size-4 animate-spin" />} Salvar
        </button>
      </form>
    </ModalShell>
  );
}

function PasswordModal({ user, onClose }: { user: { id: string; email: string }; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setUserPasswordAdmin({ data: { id: user.id, password } });
      toast.success("Senha redefinida");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };
  return (
    <ModalShell title={`Nova senha — ${user.email}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className={labelCls}>Nova senha (mín. 6)</label><input type="text" required minLength={6} className={`${inputCls} mt-1 font-mono`} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button disabled={loading} className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 className="size-4 animate-spin" />} Redefinir senha
        </button>
      </form>
    </ModalShell>
  );
}

function HistoryModal({ user, onClose }: { user: { id: string; nome: string }; onClose: () => void }) {
  const fn = useServerFn(getUserAuditLog);
  const { data = [], isLoading } = useQuery({
    queryKey: ["user-audit", user.id],
    queryFn: () => fn({ data: { id: user.id } }),
  });
  return (
    <ModalShell title={`Histórico — ${user.nome}`} onClose={onClose} size="lg">
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Carregando...
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={History} title="Sem registos" description="Ainda não há eventos de auditoria para este utilizador." />
      ) : (
        <ol className="space-y-2">
          {data.map((row) => (
            <li key={row.id} className="border border-border rounded-lg p-3 bg-secondary/30">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{ACTION_LABELS[row.action] ?? row.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    por <span className="font-medium">{row.actor_email ?? "—"}</span>
                  </p>
                  {row.details && Object.keys(row.details as object).length > 0 && (
                    <pre className="text-[10px] mt-2 font-mono text-muted-foreground bg-background/60 p-2 rounded border border-border overflow-x-auto">
                      {JSON.stringify(row.details, null, 2)}
                    </pre>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{fmtDate(row.created_at)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ModalShell>
  );
}
