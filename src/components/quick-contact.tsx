import { MessageCircle, Phone, Mail, Copy } from "lucide-react";
import { waLink, telLink, mailLink, copyToClipboard } from "@/lib/contact";

type Props = {
  nome?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  mensagem?: string;
  size?: "sm" | "md";
};

export function QuickContact({ nome, telefone, whatsapp, email, mensagem, size = "md" }: Props) {
  const wa = waLink(whatsapp ?? telefone, mensagem);
  const tel = telLink(telefone ?? whatsapp);
  const mail = mailLink(email, nome ? `Reposição — ${nome}` : undefined, mensagem);
  const cls = size === "sm" ? "size-7" : "size-8";
  const ico = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div className="inline-flex items-center gap-1">
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          title="WhatsApp"
          className={`${cls} rounded-md bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors`}
        >
          <MessageCircle className={ico} />
        </a>
      )}
      {tel && (
        <a
          href={tel}
          title="Ligar"
          className={`${cls} rounded-md bg-info/10 text-info hover:bg-info/20 flex items-center justify-center transition-colors`}
        >
          <Phone className={ico} />
        </a>
      )}
      {mail && (
        <a
          href={mail}
          title="Email"
          className={`${cls} rounded-md bg-accent/10 text-accent hover:bg-accent/20 flex items-center justify-center transition-colors`}
        >
          <Mail className={ico} />
        </a>
      )}
      {(telefone || whatsapp || email) && (
        <button
          type="button"
          onClick={() => copyToClipboard([nome, telefone, whatsapp, email].filter(Boolean).join(" | "), "Contacto")}
          title="Copiar"
          className={`${cls} rounded-md bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 flex items-center justify-center transition-colors`}
        >
          <Copy className={ico} />
        </button>
      )}
    </div>
  );
}
