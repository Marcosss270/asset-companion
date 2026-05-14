import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/_authenticated/manutencao")({
  component: () => <Placeholder titulo="Manutenção" descricao="Registro de manutenções, técnicos e custos. Disponível na Etapa 3." />,
});

function Placeholder({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        <p className="text-muted-foreground text-sm">{descricao}</p>
      </div>
      <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
        <Wrench className="size-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Módulo em desenvolvimento.</p>
      </div>
    </div>
  );
}
