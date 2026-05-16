import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole, type AppRole } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

const ROLE_OPTIONS: AppRole[] = ["admin", "manager", "viewer"];
const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  manager: "Técnico / Gestor",
  viewer: "Visualizador",
};

function UsuariosPage() {
  const qc = useQueryClient();
  const { isAdmin } = useRole();

  const { data = [], isLoading } = useQuery({
    queryKey: ["profiles-with-roles"],
    queryFn: async () => {
      const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email, created_at").order("created_at"),
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

  const setRole = async (userId: string, newRole: AppRole) => {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Papel atualizado");
    qc.invalidateQueries({ queryKey: ["profiles-with-roles"] });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Usuários & Permissões</h1>
        <p className="text-muted-foreground text-sm">
          Gestão de equipe e papéis no sistema. {!isAdmin && "(Somente administradores podem alterar papéis.)"}
        </p>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <RoleCard icon={ShieldCheck} label="Administrador" desc="Acesso total: gerencia usuários, categorias e exclui registros." />
          <RoleCard icon={ShieldAlert} label="Técnico" desc="Pode criar e editar ativos, consumíveis e manutenções." />
          <RoleCard icon={ShieldOff} label="Visualizador" desc="Acesso somente leitura ao inventário." />
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-secondary/60 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Papel</th>
              <th className="px-6 py-3">Cadastrado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">Sem usuários.</td></tr>
            ) : data.map((u) => {
              const current = u.roles[0] ?? "viewer";
              return (
                <tr key={u.id}>
                  <td className="px-6 py-3 text-sm font-medium">{u.nome}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-3">
                    {isAdmin ? (
                      <select
                        value={current}
                        onChange={(e) => setRole(u.id, e.target.value as AppRole)}
                        className="px-2 py-1 bg-secondary border border-input rounded text-xs font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-accent/30"
                      >
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full font-semibold uppercase">
                        {ROLE_LABELS[current as AppRole]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs text-muted-foreground font-mono">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
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
