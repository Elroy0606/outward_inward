"use client";

import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShipmentType } from "@/lib/types";

const TABS: { type: ShipmentType; label: string; icon: typeof ArrowDownToLine }[] = [
  { type: "INWARD", label: "Inward Shipments", icon: ArrowDownToLine },
  { type: "OUTWARD", label: "Outward Shipments", icon: ArrowUpFromLine },
];

export function TypeTabs({
  value,
  onChange,
  counts,
}: {
  value: ShipmentType;
  onChange: (type: ShipmentType) => void;
  counts: Record<ShipmentType, number>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Shipment direction"
      className="glass-card relative inline-flex w-full items-center gap-1 rounded-xl p-1 sm:w-auto"
    >
      {TABS.map(({ type, label, icon: Icon }) => {
        const active = value === type;
        return (
          <button
            key={type}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(type)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-initial",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg bg-primary glow-tangerine"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="size-4" />
              {label}
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  active ? "bg-black/15" : "bg-foreground/5"
                )}
              >
                {counts[type]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
