"use client";

import { STATUS_CONFIG, SHIPMENT_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ShipmentStatus } from "@/lib/types";

export type StatusFilter = ShipmentStatus | "ALL";

export function StatusTabs({
  value,
  onChange,
  counts,
  warningCount,
  criticalCount,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
  warningCount: number;
  criticalCount: number;
}) {
  const tabs: { value: StatusFilter; label: string; dotClass?: string }[] = [
    { value: "ALL", label: "All" },
    ...SHIPMENT_STATUSES.map((status) => ({
      value: status,
      label: STATUS_CONFIG[status].label,
      dotClass: STATUS_CONFIG[status].dotClass,
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className="flex max-w-full min-w-0 flex-wrap items-center gap-1"
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "focus-tangerine flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.dotClass && (
              <span
                className={cn(
                  "size-2 rounded-full",
                  tab.dotClass,
                  active && "ring-1 ring-primary-foreground"
                )}
              />
            )}
            {tab.label}
            <span className="text-xs tabular-nums opacity-70">{counts[tab.value]}</span>
            {tab.value === "IN_TRANSIT" && warningCount > 0 && (
              <span
                title={`${warningCount} delayed`}
                className="rounded-full bg-aging-warning px-1.5 text-[0.68rem] font-bold text-aging-warning-foreground tabular-nums ring-1 ring-white/70"
              >
                {warningCount}
              </span>
            )}
            {tab.value === "IN_TRANSIT" && criticalCount > 0 && (
              <span
                title={`${criticalCount} need a courier follow-up`}
                className="rounded-full bg-aging-critical px-1.5 text-[0.68rem] font-bold text-aging-critical-foreground tabular-nums ring-1 ring-white/70"
              >
                {criticalCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
