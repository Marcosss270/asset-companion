import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

function UsuariosPage() {
  const { data = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, created_at, user_roles(role)")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground text-sm">Equipe com acesso ao sistema. Gestão completa de papéis na próxima fase.</p>
      </div>
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
            {data.map((u) => {
              const roles = (u.user_roles as { role: string }[] | null) ?? [];
              return (
                <tr key={u.id}>
                  <td className="px-6 py-3 text-sm font-medium">{u.nome}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-3">
                    {roles.map((r) => (
                      <span key={r.role} className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full font-semibold uppercase mr-1">
                        {r.role}
                      </span>
                    ))}
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
