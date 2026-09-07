import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ShipmentStatus } from "@/lib/types";

export function StatusBadge({
  status,
  className,
}: {
  status: ShipmentStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge className={cn(config.badgeClass, "gap-1.5 font-semibold", className)}>
      <span className={cn("size-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </Badge>
  );
}
