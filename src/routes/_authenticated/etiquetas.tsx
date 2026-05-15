import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Printer, CheckSquare, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etiquetas")({
  component: EtiquetasPage,
});

function EtiquetasPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

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

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Etiquetas QR Code</h1>
        <p className="text-muted-foreground text-sm">Selecione os ativos para impressão em lote (folha A4).</p>
      </div>

      {/* Tela de seleção (não imprime) */}
      <div className="print:hidden">
        <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-card flex flex-wrap gap-3 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ativos..."
            className="flex-1 min-w-[240px] px-4 py-2 bg-secondary border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button onClick={toggleAll} className="px-3 py-2 text-xs font-semibold bg-secondary rounded-lg hover:bg-secondary/70 flex items-center gap-2">
            {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
            {selected.size === filtered.length && filtered.length > 0 ? "Desmarcar todos" : "Marcar todos"}
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
          ) : (
            <ul className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {filtered.map((a) => {
                const checked = selected.has(a.id);
                return (
                  <li key={a.id}>
                    <button onClick={() => toggle(a.id)} className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-secondary/40">
                      {checked ? <CheckSquare className="size-4 text-accent" /> : <Square className="size-4 text-muted-foreground" />}
                      <span className="font-mono text-xs font-semibold w-32">{a.codigo_unico}</span>
                      <span className="text-sm flex-1 truncate">{a.nome}</span>
                      <span className="text-xs text-muted-foreground">{[a.marca, a.modelo].filter(Boolean).join(" ")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Folha de etiquetas (imprime) */}
      {selectedAtivos.length > 0 && (
        <div className="print-sheet">
          <div className="grid grid-cols-3 gap-4 print:gap-2">
            {selectedAtivos.map((a) => (
              <div key={a.id} className="border border-border rounded-lg p-3 flex items-center gap-3 break-inside-avoid bg-white text-black">
                <QRCodeSVG value={JSON.stringify({ codigo: a.codigo_unico, id: a.id })} size={80} level="M" />
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
