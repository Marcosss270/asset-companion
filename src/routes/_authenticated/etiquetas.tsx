import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Printer, CheckSquare, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/etiquetas")({
  validateSearch: (search: Record<string, unknown>) => ({
    ids: typeof search.ids === "string" ? search.ids : undefined,
    autoprint: search.autoprint === "1" || search.autoprint === true,
  }),
  component: EtiquetasPage,
});

function EtiquetasPage() {
  const { ids: idsParam, autoprint } = useSearch({ from: "/_authenticated/etiquetas" });
  const preselected = useMemo(
    () => new Set((idsParam ?? "").split(",").map((s) => s.trim()).filter(Boolean)),
    [idsParam],
  );
  const [selected, setSelected] = useState<Set<string>>(preselected);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (preselected.size > 0) setSelected(preselected);
  }, [preselected]);

  const { data: ativos = [], isLoading } = useQuery({
    queryKey: ["ativos-etiquetas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos")
        .select("id, codigo_unico, nome, marca, modelo")
        .order("codigo_unico");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (autoprint && selected.size > 0 && !isLoading) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoprint, selected.size, isLoading]);

  const filtered = q
    ? ativos.filter((a) => [a.codigo_unico, a.nome, a.marca, a.modelo].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()))
    : ativos;

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const selectedAtivos = ativos.filter((a) => selected.has(a.id));
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="max-w-[1200px] mx-auto">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Etiquetas QR Code</h1>
        <p className="text-muted-foreground text-sm">Selecione os ativos para impressão em lote (folha A4). Cada QR abre a página do ativo ao ser escaneado.</p>
      </div>

      <div className="print:hidden">
        <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-card flex flex-wrap gap-3 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ativos..."
            className="flex-1 min-w-[200px] px-4 py-2 bg-secondary border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button onClick={toggleAll} className="px-3 py-2 text-xs font-semibold bg-secondary rounded-lg hover:bg-secondary/70 flex items-center gap-2">
            {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
            {selected.size === filtered.length && filtered.length > 0 ? "Desmarcar" : "Marcar todos"}
          </button>
          <button
            disabled={selected.size === 0}
            onClick={() => window.print()}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 disabled:opacity-50"
          >
            <Printer className="size-4" /> Imprimir {selected.size > 0 && `(${selected.size})`}
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden mb-8">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <EmptyState title="Nenhum ativo encontrado" description="Cadastre ativos para gerar etiquetas." />
          ) : (
            <ul className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {filtered.map((a) => {
                const checked = selected.has(a.id);
                return (
                  <li key={a.id}>
                    <button onClick={() => toggle(a.id)} className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-secondary/40">
                      {checked ? <CheckSquare className="size-4 text-accent" /> : <Square className="size-4 text-muted-foreground" />}
                      <span className="font-mono text-xs font-semibold w-32 truncate">{a.codigo_unico}</span>
                      <span className="text-sm flex-1 truncate">{a.nome}</span>
                      <span className="text-xs text-muted-foreground hidden md:inline">{[a.marca, a.modelo].filter(Boolean).join(" ")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {selectedAtivos.length > 0 && (
        <div className="print-sheet">
          <div className="grid grid-cols-3 gap-4 print:gap-2">
            {selectedAtivos.map((a) => (
              <div key={a.id} className="border border-border rounded-lg p-3 flex items-center gap-3 break-inside-avoid bg-white text-black">
                <QRCodeSVG value={`${origin}/ativos/${a.id}`} size={80} level="M" />
                <div className="text-xs flex-1 min-w-0">
                  <p className="font-mono font-bold">{a.codigo_unico}</p>
                  <p className="font-semibold truncate">{a.nome}</p>
                  <p className="text-[10px] text-gray-600 truncate">{[a.marca, a.modelo].filter(Boolean).join(" ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
