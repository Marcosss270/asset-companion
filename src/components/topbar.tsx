import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Search, Plus, Menu, Building2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/use-org";
import { useRole } from "@/hooks/use-role";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { isTenantMaster } = useRole();
  const { data: org } = useOrg();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: allOrgs = [] } = useQuery({
    queryKey: ["all-orgs-switch"],
    enabled: isTenantMaster,
    queryFn: async () => (await supabase.from("organizacoes").select("id, nome, sigla").order("nome")).data ?? [],
  });

  const switchOrg = async (orgId: string) => {
    const { error } = await supabase.rpc("switch_organization", { _org_id: orgId });
    if (error) { toast.error(error.message); return; }
    toast.success("Organização alterada");
    await qc.invalidateQueries();
    navigate({ to: "/dashboard" });
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-3 md:px-8 sticky top-0 z-30 backdrop-blur-md bg-card/95 print:hidden">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button onClick={onMenuClick} className="md:hidden p-2 -ml-1 text-foreground rounded-md hover:bg-secondary transition-colors" aria-label="Abrir menu">
          <Menu className="size-5" />
        </button>
        <div className="hidden sm:block w-full max-w-sm relative">
          <Search className="absolute inset-y-0 left-3 h-full w-4 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder="Buscar ativos, séries ou responsáveis..."
            className="w-full pl-10 pr-4 py-2 bg-secondary border-none rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none placeholder:text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        {isTenantMaster && org && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-secondary text-sm">
              <Building2 className="size-4 text-accent" />
              <span className="hidden md:inline font-medium">{org.sigla}</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Trocar organização</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allOrgs.map((o: any) => (
                <DropdownMenuItem key={o.id} onClick={() => switchOrg(o.id)} className={o.id === org.id ? "bg-accent/10" : ""}>
                  <Building2 className="size-3.5 mr-2" />
                  <span className="flex-1">{o.nome}</span>
                  <span className="text-xs text-muted-foreground">{o.sigla}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Link to="/alertas" className="relative text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="size-5" />
          <span className="absolute -top-0.5 -right-0.5 size-2 bg-destructive rounded-full ring-2 ring-card" />
        </Link>
        <Link to="/ativos/novo" className="bg-accent hover:bg-accent/90 text-accent-foreground px-3 md:px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Novo Ativo</span>
        </Link>
      </div>
    </header>
  );
}
