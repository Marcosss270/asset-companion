import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Boxes,
  PackageOpen,
  ArrowLeftRight,
  Wrench,
  FileText,
  Users,
  LogOut,
  Settings,
  QrCode,
  Bell,
  Tag,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const inventoryNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ativos", label: "Ativos / Equipamentos", icon: Boxes },
  { to: "/consumiveis", label: "Consumíveis", icon: PackageOpen },
  { to: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
  { to: "/manutencao", label: "Manutenção", icon: Wrench },
  { to: "/alertas", label: "Alertas", icon: Bell },
] as const;

const operacoesNav = [
  { to: "/etiquetas", label: "Etiquetas QR", icon: QrCode },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
] as const;

const adminNav = [
  { to: "/empresas", label: "Empresas do Grupo", icon: Building2 },
  { to: "/categorias", label: "Categorias", icon: Tag },
  { to: "/usuarios", label: "Usuários", icon: Users },
] as const;

export function AppSidebar({ userName, userEmail }: { userName?: string | null; userEmail?: string | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground flex-shrink-0 flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="size-9 bg-accent rounded-lg flex items-center justify-center font-bold text-accent-foreground italic text-xl shadow-md">
          N
        </div>
        <div>
          <p className="text-base font-bold tracking-tight leading-none">
            GRUPO <span className="font-light opacity-60">A3</span>
          </p>
          <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mt-1">
            Asset Management
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto">
        <NavGroup label="Inventário" items={inventoryNav} pathname={pathname} />
        <NavGroup label="Operações" items={operacoesNav} pathname={pathname} />
        <NavGroup label="Administração" items={adminNav} pathname={pathname} />
      </nav>

      <div className="p-4 mt-auto border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-foreground ring-1 ring-white/10">
            {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="text-xs min-w-0 flex-1">
            <p className="font-semibold truncate">{userName ?? "Usuário"}</p>
            <p className="text-sidebar-foreground/40 uppercase tracking-tight truncate text-[10px]">
              {userEmail}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-md text-sidebar-foreground/60 hover:bg-white/5 transition-colors">
            <Settings className="size-3.5" />
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-md text-sidebar-foreground/60 hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <LogOut className="size-3.5" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

function NavGroup({ label, items, pathname }: { label: string; items: readonly NavItem[]; pathname: string }) {
  return (
    <>
      <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-3 py-2 mt-2">
        {label}
      </p>
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(to + "/");
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              active
                ? "bg-white/10 text-sidebar-foreground font-medium"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/5",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </>
  );
}
