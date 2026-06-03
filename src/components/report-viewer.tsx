import { useEffect, useState } from "react";
import { X, FileText, FileSpreadsheet, Printer, Loader2 } from "lucide-react";
import { downloadReportPDF, downloadReportXLSX, printReport, type ReportSpec } from "@/lib/reports/export";
import { loadOrgInfo } from "@/lib/org";
import { toast } from "sonner";

export function ReportViewer({ load, onClose }: { load: () => Promise<ReportSpec>; onClose: () => void }) {
  const [spec, setSpec] = useState<ReportSpec | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    load().then(setSpec).catch((e) => toast.error(e instanceof Error ? e.message : "Erro"));
  }, [load]);

  const wrap = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(null); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold">{spec?.titulo ?? "Carregando relatório..."}</h3>
          <div className="flex items-center gap-2">
            <button disabled={!spec || !!busy} onClick={() => wrap("pdf", async () => { if (spec) await downloadReportPDF(spec); })} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-foreground text-background flex items-center gap-1.5 disabled:opacity-50">
              {busy === "pdf" ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />} PDF
            </button>
            <button disabled={!spec || !!busy} onClick={() => wrap("xlsx", () => { if (spec) downloadReportXLSX(spec); })} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-success text-success-foreground flex items-center gap-1.5 disabled:opacity-50">
              <FileSpreadsheet className="size-3.5" /> Excel
            </button>
            <button disabled={!spec || !!busy} onClick={() => wrap("print", async () => { if (spec) printReport(spec, await loadOrgInfo()); })} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-border flex items-center gap-1.5 disabled:opacity-50">
              <Printer className="size-3.5" /> Imprimir
            </button>
            <button onClick={onClose} className="size-8 rounded hover:bg-secondary flex items-center justify-center"><X className="size-4" /></button>
          </div>
        </div>

        {!spec ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex-1 overflow-auto p-6">
            {spec.filtros && <p className="text-xs text-muted-foreground mb-3">{spec.filtros}</p>}
            {spec.linhas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados para os filtros selecionados.</p>
            ) : (
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-secondary/60 text-[10px] uppercase tracking-wider font-bold">
                      {spec.colunas.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {spec.linhas.map((r, i) => (
                      <tr key={i} className="hover:bg-secondary/30">
                        {r.map((c, j) => <td key={j} className="px-3 py-1.5 align-top">{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-3 py-2 text-[10px] text-muted-foreground bg-secondary/30 border-t border-border">{spec.linhas.length} linha(s)</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
