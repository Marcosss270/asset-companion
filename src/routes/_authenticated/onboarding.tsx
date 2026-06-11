import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Check, Building2, Settings as SettingsIcon, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingWizard,
  head: () => ({ meta: [{ title: "Bem-vindo — Asset Companion" }] }),
});

const STEPS = [
  { id: "welcome", label: "Bem-vindo", icon: Sparkles },
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "config", label: "Configuração", icon: SettingsIcon },
  { id: "import", label: "Importação", icon: Upload },
  { id: "finalizar", label: "Finalizar", icon: Check },
];

function OnboardingWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: org, isLoading } = useOrg();
  const [step, setStep] = useState(0);

  // Empresa
  const [nome, setNome] = useState(org?.nome ?? "");
  const [sigla, setSigla] = useState(org?.sigla ?? "");
  const [moeda, setMoeda] = useState(org?.moeda ?? "EUR");
  const [pais, setPais] = useState(org?.pais ?? "");
  const [setor, setSetor] = useState(org?.setor ?? "");
  // Config
  const [depto, setDepto] = useState("");
  const [cc, setCC] = useState("");
  const [forn, setForn] = useState("");

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">A carregar…</div>;
  if (!org) return null;

  const progress = ((step + 1) / STEPS.length) * 100;

  const saveEmpresa = async () => {
    const { error } = await supabase.from("organizacoes")
      .update({ nome, sigla: sigla.toUpperCase(), moeda, pais, setor }).eq("id", org.id);
    if (error) { toast.error(error.message); return false; }
    qc.invalidateQueries({ queryKey: ["current-org"] });
    return true;
  };

  const saveConfig = async () => {
    const ops = [];
    if (depto) ops.push(supabase.from("departamentos").insert({ nome: depto }));
    if (cc) ops.push(supabase.from("centros_custo").insert({ nome: cc }));
    if (forn) ops.push(supabase.from("fornecedores").insert({ nome_empresa: forn }));
    await Promise.all(ops);
    return true;
  };

  const finalizar = async () => {
    await supabase.from("organizacoes").update({ onboarding_completo: true }).eq("id", org.id);
    qc.invalidateQueries({ queryKey: ["current-org"] });
    toast.success("Setup concluído!");
    navigate({ to: "/dashboard" });
  };

  const next = async () => {
    if (step === 1) { if (!(await saveEmpresa())) return; }
    if (step === 2) { await saveConfig(); }
    if (step === STEPS.length - 1) { await finalizar(); return; }
    setStep(step + 1);
  };

  const Icon = STEPS[step].icon;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-sm font-medium text-muted-foreground">Passo {step + 1} de {STEPS.length}</h1>
          <button onClick={() => navigate({ to: "/dashboard" })} className="text-xs text-muted-foreground hover:underline">
            Continuar depois
          </button>
        </div>
        <Progress value={progress} />
        <div className="flex justify-between mt-3 text-xs">
          {STEPS.map((s, i) => (
            <span key={s.id} className={i <= step ? "text-foreground font-medium" : "text-muted-foreground"}>{s.label}</span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8">
        <Icon className="size-10 text-accent mb-4" />
        <h2 className="text-2xl font-bold tracking-tight">{STEPS[step].label}</h2>

        {step === 0 && (
          <div className="mt-4 space-y-4 text-sm text-muted-foreground">
            <p>Bem-vindo ao <strong className="text-foreground">Asset Companion</strong>! Vamos configurar a sua organização em alguns passos.</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Configurar dados da empresa</li>
              <li>Criar estrutura inicial (departamentos, centros de custo, fornecedores)</li>
              <li>Importar ativos via Excel (opcional)</li>
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Nome da empresa</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>Sigla</Label><Input value={sigla} onChange={(e) => setSigla(e.target.value.toUpperCase())} maxLength={6} /></div>
            <div><Label>Moeda</Label><Input value={moeda} onChange={(e) => setMoeda(e.target.value.toUpperCase())} maxLength={3} /></div>
            <div><Label>País</Label><Input value={pais} onChange={(e) => setPais(e.target.value)} placeholder="Portugal" /></div>
            <div><Label>Setor</Label><Input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Tecnologia" /></div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <div><Label>Primeiro departamento</Label><Input value={depto} onChange={(e) => setDepto(e.target.value)} placeholder="TI" /></div>
            <div><Label>Centro de custo</Label><Input value={cc} onChange={(e) => setCC(e.target.value)} placeholder="CC-001" /></div>
            <div><Label>Fornecedor inicial</Label><Input value={forn} onChange={(e) => setForn(e.target.value)} placeholder="Dell Portugal" /></div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Faça download dos modelos Excel e importe os seus dados quando estiver pronto. Pode fazê-lo agora ou mais tarde em Configurações.</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {["ativos", "consumiveis", "fornecedores"].map((t) => (
                <a key={t} href={`/templates/${t}.csv`} download className="rounded-lg border border-border bg-muted/30 p-4 hover:bg-muted/60 transition-colors text-center capitalize">
                  📥 {t}.csv
                </a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">A importação completa estará disponível na próxima atualização.</p>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm">Tudo pronto! Pode começar a usar o Asset Companion agora.</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Empresa configurada</li>
              <li>✓ Estrutura inicial criada</li>
              <li>→ Próximo: adicionar utilizadores e ativos</li>
            </ul>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          {step > 0 ? <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button> : <div />}
          <Button onClick={next}>
            {step === STEPS.length - 1 ? "Concluir" : <>Próximo <ChevronRight className="size-4 ml-1" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}
