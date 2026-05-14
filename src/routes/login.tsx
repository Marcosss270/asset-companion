import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { nome },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 bg-primary text-primary-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-accent rounded-lg flex items-center justify-center font-bold italic text-xl shadow-lg">N</div>
          <div>
            <p className="text-lg font-bold tracking-tight">NEXUS <span className="font-light opacity-60">ASSET</span></p>
            <p className="text-[10px] uppercase tracking-widest opacity-50">Inventory Console</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Controle total dos seus<br />ativos corporativos.
          </h1>
          <p className="text-primary-foreground/60 mt-4 max-w-md">
            Cadastre, rastreie e gerencie equipamentos de TI, periféricos e consumíveis com QR Code, alertas inteligentes e auditoria completa.
          </p>
          <div className="grid grid-cols-3 gap-6 mt-12 max-w-md">
            <div>
              <p className="text-2xl font-bold">100%</p>
              <p className="text-xs text-primary-foreground/50 uppercase tracking-wider mt-1">Rastreável</p>
            </div>
            <div>
              <p className="text-2xl font-bold">QR</p>
              <p className="text-xs text-primary-foreground/50 uppercase tracking-wider mt-1">Auto Code</p>
            </div>
            <div>
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-xs text-primary-foreground/50 uppercase tracking-wider mt-1">Monitoramento</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-primary-foreground/40">© 2026 Nexus Asset. All rights reserved.</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="size-9 bg-accent rounded-lg flex items-center justify-center font-bold italic text-xl text-accent-foreground">N</div>
            <span className="text-lg font-bold tracking-tight">NEXUS ASSET</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">
            {mode === "login" ? "Entrar na conta" : "Criar conta"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Acesse o painel de gestão de ativos."
              : "O primeiro usuário cadastrado se torna administrador."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Nome completo</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 bg-card border border-input rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            {mode === "login" ? "Ainda não tem conta? " : "Já possui conta? "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-accent font-semibold hover:underline"
            >
              {mode === "login" ? "Criar agora" : "Entrar"}
            </button>
          </p>
          <p className="text-xs text-center text-muted-foreground mt-4">
            <Link to="/dashboard" className="hover:text-foreground">← Voltar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
