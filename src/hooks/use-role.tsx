import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "admin" | "manager" | "viewer";

export function useRole() {
  const { user } = useAuth();
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
  return {
    roles,
    isAdmin: roles.includes("admin"),
    isManager: roles.includes("manager") || roles.includes("admin"),
    isLoading,
  };
}
