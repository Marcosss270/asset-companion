import { Link } from "@tanstack/react-router";
import { Bell, Search, Plus } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 backdrop-blur-md bg-card/95">
      <div className="flex items-center gap-4 flex-1 max-w-sm">
        <div className="w-full relative">
          <Search className="absolute inset-y-0 left-3 h-full w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar ativos, séries ou responsáveis..."
            className="w-full pl-10 pr-4 py-2 bg-secondary border-none rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 md:gap-6">
        <button className="relative text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="size-5" />
          <span className="absolute -top-0.5 -right-0.5 size-2 bg-destructive rounded-full ring-2 ring-card" />
        </button>
        <Link
          to="/ativos/novo"
          className="bg-accent hover:bg-accent/90 text-accent-foreground px-3 md:px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Novo Ativo</span>
        </Link>
      </div>
    </header>
  );
}
