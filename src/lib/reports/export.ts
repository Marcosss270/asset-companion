import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { loadOrgInfo, urlToDataURL, type OrgInfo } from "@/lib/org";

export interface ReportSpec {
  titulo: string;
  filtros?: string;
  colunas: string[];
  linhas: (string | number)[][];
}

export async function downloadReportPDF(spec: ReportSpec) {
  const org = await loadOrgInfo();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();

  // Header
  let startY = 14;
  if (org.logo_url) {
    const dataUrl = await urlToDataURL(org.logo_url);
    if (dataUrl) {
      try { doc.addImage(dataUrl, "PNG", 12, 8, 22, 14); } catch { /* ignore */ }
    }
  }
  doc.setFont("helvetica", "bold").setFontSize(14).text(org.nome, 38, 14);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
  const contactLine = [org.email, org.telefone].filter(Boolean).join("  •  ");
  if (contactLine) doc.text(contactLine, 38, 19);
  if (org.endereco) doc.text(org.endereco, 38, 23);

  doc.setTextColor(0).setFontSize(11).setFont("helvetica", "bold");
  doc.text(spec.titulo, pageW - 12, 14, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
  doc.text(now.toLocaleString("pt-BR"), pageW - 12, 19, { align: "right" });
  if (spec.filtros) doc.text(`Filtros: ${spec.filtros}`, pageW - 12, 23, { align: "right" });

  startY = 30;
  autoTable(doc, {
    head: [spec.colunas],
    body: spec.linhas.map((r) => r.map((c) => (c == null ? "" : String(c)))),
    startY,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      const str = `Página ${doc.getNumberOfPages()}`;
      doc.setFontSize(8).setTextColor(120);
      doc.text(str, pageW - 12, doc.internal.pageSize.getHeight() - 6, { align: "right" });
      doc.text(`${org.nome} — Asset Companion`, 12, doc.internal.pageSize.getHeight() - 6);
      void data;
    },
  });

  doc.save(`${slug(spec.titulo)}-${now.toISOString().slice(0, 10)}.pdf`);
}

export function downloadReportXLSX(spec: ReportSpec) {
  const wb = XLSX.utils.book_new();
  const aoa = [spec.colunas, ...spec.linhas];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = spec.colunas.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, slug(spec.titulo).slice(0, 28) || "Relatorio");
  XLSX.writeFile(wb, `${slug(spec.titulo)}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function printReport(spec: ReportSpec, org: OrgInfo | null = null) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!w) return;
  const head = `<style>
    body{font-family:Arial,sans-serif;margin:24px;color:#111}
    h1{font-size:18px;margin:0}
    .meta{color:#666;font-size:11px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
    th{background:#1a1a1a;color:#fff}
    tr:nth-child(even) td{background:#f7f7f7}
    @media print{@page{size:A4 landscape;margin:12mm}}
  </style>`;
  const orgLine = org ? `<div class="meta">${org.nome}${org.email ? " • "+org.email : ""}${org.telefone ? " • "+org.telefone : ""}</div>` : "";
  w.document.write(`<!doctype html><html><head><title>${spec.titulo}</title>${head}</head><body>
    ${orgLine}
    <h1>${spec.titulo}</h1>
    <div class="meta">${new Date().toLocaleString("pt-BR")}${spec.filtros ? " • "+spec.filtros : ""}</div>
    <table>
      <thead><tr>${spec.colunas.map((c) => `<th>${escape(c)}</th>`).join("")}</tr></thead>
      <tbody>${spec.linhas.map((r) => `<tr>${r.map((c) => `<td>${escape(String(c ?? ""))}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
    <script>setTimeout(()=>window.print(),400);<\/script>
  </body></html>`);
  w.document.close();
}

function escape(s: string) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!); }
function slug(s: string) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
