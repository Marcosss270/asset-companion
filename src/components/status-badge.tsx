import { cn } from "@/lib/utils";
import { STATUS_LABELS, statusBadgeClass, type AtivoStatus } from "@/lib/asset-utils";

export function StatusBadge({ status, className }: { status: AtivoStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
        statusBadgeClass(status),
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
