import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useHasFeature } from "@/hooks/use-org";

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  silent?: boolean;
}

export function FeatureGate({ feature, children, fallback, silent }: FeatureGateProps) {
  const allowed = useHasFeature(feature);
  if (allowed) return <>{children}</>;
  if (silent) return null;
  if (fallback) return <>{fallback}</>;
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
      <Lock className="size-4" />
      <span>Funcionalidade indisponível no seu plano atual.</span>
    </div>
  );
}
