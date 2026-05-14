import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: () => (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Exportação PDF e Excel com filtros avançados. Disponível na Etapa 2.</p>
      </div>
      <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
        <FileText className="size-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Módulo em desenvolvimento.</p>
      </div>
    </div>
  ),
});
