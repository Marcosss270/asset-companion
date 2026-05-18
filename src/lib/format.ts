// Currency formatting — Kwanza Angolano (KZ)
// Format: 15.000,00 KZ
const nf = new Intl.NumberFormat("pt-AO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatKZ(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `${nf.format(n)} KZ`;
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return nf.format(n);
}
