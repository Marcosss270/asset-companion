import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Truck } from "lucide-react";
import { QuickContact } from "@/components/quick-contact";
import { formatKZ } from "@/lib/format";

type Fornecedor = {
  id: string;
  nome_empresa: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
};

type Link = {
  id: string;
  preco_medio: number | null;
  prazo_entrega_dias: number | null;
  fornecedor_preferencial: boolean;
  fornecedores: Fornecedor | null;
};

const FP = "fornecedor_produtos" as never;

type Props = {
  consumivelId?: string | null;
  ativoId?: string | null;
  produtoNome?: string | null;
  compact?: boolean;
};

export function FornecedoresProduto({ consumivelId, ativoId, produtoNome, compact }: Props) {
  const key = consumivelId ? `c-${consumivelId}` : `a-${ativoId}`;
  const { data = [], isLoading } = useQuery({
    queryKey: ["fp-produto", key],
    enabled: !!(consumivelId || ativoId),
    queryFn: async () => {
      const base = (supabase.from(FP) as unknown as {
        select: (q: string) => {
          order: (c: string, o: { ascending: boolean }) => {
            eq: (c: string, v: string) => Promise<{ data: unknown }>;
          };
        };
      })
        .select("id, preco_medio, prazo_entrega_dias, fornecedor_preferencial, fornecedores(id, nome_empresa, telefone, whatsapp, email)")
        .order("fornecedor_preferencial", { ascending: false });
      const col = consumivelId ? "consumivel_id" : "ativo_id";
      const val = (consumivelId ?? ativoId) as string;
      const { data } = await base.eq(col, val);
      return (data ?? []) as unknown as Link[];
    },
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-3 text-center">Carregando fornecedores...</p>;
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-center text-xs text-muted-foreground">
        Nenhum fornecedor vinculado a este produto.
      </div>
    );
  }

  if (compact) {
    return (
      <ul className="space-y-1.5">
        {data.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/40 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {l.fornecedor_preferencial && <Star className="size-3 fill-warning text-warning shrink-0" />}
              <span className="font-medium truncate">{l.fornecedores?.nome_empresa}</span>
              {l.preco_medio != null && <span className="font-mono text-muted-foreground">{formatKZ(l.preco_medio)}</span>}
            </div>
            <QuickContact
              nome={l.fornecedores?.nome_empresa}
              telefone={l.fornecedores?.telefone}
              whatsapp={l.fornecedores?.whatsapp}
              email={l.fornecedores?.email}
              mensagem={produtoNome ? `Olá, gostaria de cotar/repor: ${produtoNome}` : undefined}
              size="sm"
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((l) => (
        <div key={l.id} className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
          l.fornecedor_preferencial
            ? "border-warning/40 bg-warning/5"
            : "border-border bg-card"
        }`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {l.fornecedor_preferencial && (
                <span className="text-[10px] font-bold uppercase bg-warning/20 text-warning px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Star className="size-3 fill-warning" /> Preferencial
                </span>
              )}
              <p className="font-semibold text-sm truncate flex items-center gap-1">
                <Truck className="size-3.5 text-muted-foreground" /> {l.fornecedores?.nome_empresa}
              </p>
            </div>
            <div className="flex gap-4 mt-1 text-xs text-muted-foreground font-mono">
              {l.preco_medio != null && <span>Preço médio: <span className="text-foreground font-semibold">{formatKZ(l.preco_medio)}</span></span>}
              {l.prazo_entrega_dias != null && <span>Prazo: <span className="text-foreground font-semibold">{l.prazo_entrega_dias}d</span></span>}
            </div>
          </div>
          <QuickContact
            nome={l.fornecedores?.nome_empresa}
            telefone={l.fornecedores?.telefone}
            whatsapp={l.fornecedores?.whatsapp}
            email={l.fornecedores?.email}
            mensagem={produtoNome ? `Olá, gostaria de cotar/repor: ${produtoNome}` : undefined}
          />
        </div>
      ))}
    </div>
  );
}
