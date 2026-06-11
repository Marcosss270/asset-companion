import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle, Book, Play, MessageCircle } from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/ajuda")({
  component: AjudaPage,
  head: () => ({ meta: [{ title: "Ajuda — Asset Companion" }] }),
});

const FAQS = [
  { q: "Como adicionar um novo ativo?", a: "Vá em Ativos → Novo Ativo. Preencha os campos e o código único é gerado automaticamente." },
  { q: "Como funciona a importação Excel?", a: "Durante o onboarding ou em Configurações, faça download do template, preencha e carregue o ficheiro. O sistema valida os dados antes de importar." },
  { q: "Quais planos estão disponíveis?", a: "Starter (até 100 ativos), Pro (até 1000) e Enterprise (ilimitado, com SNMP, Agent e Descoberta de rede)." },
  { q: "Como funciona o trial?", a: "Tem 14 dias gratuitos para experimentar todas as funcionalidades do plano selecionado." },
  { q: "Os meus dados estão isolados?", a: "Sim. Cada organização tem isolamento total. Apenas o Tenant Master pode aceder a múltiplas organizações." },
];

function AjudaPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><HelpCircle className="size-6" />Centro de Ajuda</h1>
        <p className="text-sm text-muted-foreground mt-1">Guias e perguntas frequentes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card icon={<Book />} title="Guias rápidos" desc="Tutoriais passo a passo." />
        <Card icon={<Play />} title="Vídeos" desc="Em breve." />
        <Card icon={<MessageCircle />} title="Contacto" desc="suporte@a3.pt" />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Perguntas Frequentes</h2>
        <Accordion type="single" collapsible className="rounded-lg border border-border bg-card px-4">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

function Card({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="text-accent">{icon}</div>
      <h3 className="font-semibold mt-3">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
