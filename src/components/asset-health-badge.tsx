import { SAUDE_COLORS, SAUDE_LABELS, type SaudeAtivo } from "@/lib/lifecycle";
import { Heart } from "lucide-react";

export function AssetHealthBadge({ saude }: { saude: SaudeAtivo }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${SAUDE_COLORS[saude]}`}>
      <Heart className="size-3" /> {SAUDE_LABELS[saude]}
    </span>
  );
}
