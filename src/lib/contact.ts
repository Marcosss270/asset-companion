// Helpers para contato rápido de fornecedores
import { toast } from "sonner";

// Normaliza número de telefone para formato internacional E.164 (sem +)
// Aceita variações com espaços, parênteses, traços, etc.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (digits.length < 6) return null;
  return digits;
}

export function waLink(phone: string | null | undefined, msg?: string): string | null {
  const n = normalizePhone(phone);
  if (!n) return null;
  const q = msg ? `?text=${encodeURIComponent(msg)}` : "";
  return `https://wa.me/${n}${q}`;
}

export function telLink(phone: string | null | undefined): string | null {
  const n = normalizePhone(phone);
  return n ? `tel:+${n}` : null;
}

export function mailLink(email: string | null | undefined, subject?: string, body?: string): string | null {
  if (!email) return null;
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${email}${params.length ? `?${params.join("&")}` : ""}`;
}

export async function copyToClipboard(text: string, label = "Contacto") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  } catch {
    toast.error("Falha ao copiar");
  }
}
