import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Edit, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/organizacoes")({
  component: OrganizacoesPage,
  head: () => ({ meta: [{ title: "Organizações — Asset Companion" }] }),
});

function OrganizacoesPage() {
  const { isTenantMaster, isLoading: roleLoading } = useRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["organizacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizacoes")
        .select("*, plano:planos(nome, slug), assinaturas(estado, plano_id, valor, ciclo)")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: planos = [] } = useQuery({
    queryKey: ["planos"],
    queryFn: async () => (await supabase.from("planos").select("*").order("ordem")).data ?? [],
  });

  if (roleLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!isTenantMaster) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="mt-2 text-sm text-muted-foreground">Apenas o Tenant Master pode gerir organizações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Building2 className="size-6" />Organizações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão de tenants da plataforma.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEdit(null)}><Plus className="size-4 mr-2" />Nova organização</Button>
          </DialogTrigger>
          <OrgForm planos={planos} edit={edit} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["organizacoes"] }); }} />
        </Dialog>
      </div>

      {isLoading ? (
        <Loader2 className="animate-spin mx-auto mt-12" />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Organização</th>
                <th className="text-left px-4 py-3">Sigla</th>
                <th className="text-left px-4 py-3">Plano</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Master</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o: any) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{o.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.sigla}</td>
                  <td className="px-4 py-3">{o.plano?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${o.estado === "ativa" ? "bg-green-500/15 text-green-600" : o.estado === "suspensa" ? "bg-yellow-500/15 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
                      {o.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">{o.is_tenant_master ? <Check className="size-4 text-green-600" /> : <X className="size-4 text-muted-foreground" />}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEdit(o); setOpen(true); }}>
                      <Edit className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Cada organização tem isolamento total de dados. Veja <Link to="/planos" className="underline">planos</Link> e <Link to="/billing" className="underline">billing</Link>.
      </p>
    </div>
  );
}

function OrgForm({ planos, edit, onSaved }: { planos: any[]; edit: any; onSaved: () => void }) {
  const [nome, setNome] = useState(edit?.nome ?? "");
  const [sigla, setSigla] = useState(edit?.sigla ?? "");
  const [planoId, setPlanoId] = useState(edit?.plano_id ?? planos[0]?.id ?? "");
  const [estado, setEstado] = useState(edit?.estado ?? "ativa");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!nome || !sigla) { toast.error("Nome e sigla obrigatórios"); return; }
    setSaving(true);
    try {
      if (edit) {
        const { error } = await supabase.from("organizacoes")
          .update({ nome, sigla, plano_id: planoId, estado }).eq("id", edit.id);
        if (error) throw error;
        toast.success("Organização atualizada");
      } else {
        const { error } = await supabase.from("organizacoes")
          .insert({ nome, sigla, plano_id: planoId, estado });
        if (error) throw error;
        toast.success("Organização criada");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{edit ? "Editar organização" : "Nova organização"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div><Label>Sigla</Label><Input value={sigla} onChange={(e) => setSigla(e.target.value.toUpperCase())} maxLength={10} /></div>
        <div>
          <Label>Plano</Label>
          <Select value={planoId} onValueChange={setPlanoId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Estado</Label>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="suspensa">Suspensa</SelectItem>
              <SelectItem value="inativa">Inativa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
