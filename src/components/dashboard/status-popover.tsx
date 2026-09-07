"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, SHIPMENT_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { ShipmentStatus } from "@/lib/types";

const ARM_TIMEOUT_MS = 3000;

/**
 * Status badge that opens a floating menu of status options. Selecting a new
 * status "arms" it (shows a "Click again" confirm state); clicking the same
 * option a second time fires `onChange`. Prevents accidental one-click
 * status changes on a live shipment record.
 */
export function StatusPopover({
  status,
  onChange,
  className,
}: {
  status: ShipmentStatus;
  onChange: (status: ShipmentStatus) => Promise<boolean>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState<ShipmentStatus | null>(null);
  const [busy, setBusy] = useState<ShipmentStatus | null>(null);
  const [succeeded, setSucceeded] = useState<ShipmentStatus | null>(null);
  const armTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (armTimeoutRef.current) clearTimeout(armTimeoutRef.current);
    };
  }, []);

  const config = STATUS_CONFIG[status];

  function clearArmTimeout() {
    if (armTimeoutRef.current) {
      clearTimeout(armTimeoutRef.current);
      armTimeoutRef.current = null;
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setArmed(null);
      clearArmTimeout();
    }
  }

  async function handleOptionClick(next: ShipmentStatus) {
    if (next === status || busy) return;

    if (armed !== next) {
      setArmed(next);
      clearArmTimeout();
      armTimeoutRef.current = setTimeout(() => setArmed(null), ARM_TIMEOUT_MS);
      return;
    }

    clearArmTimeout();
    setBusy(next);
    const ok = await onChange(next);
    setBusy(null);
    setArmed(null);

    if (ok) {
      setSucceeded(next);
      setTimeout(() => {
        setSucceeded(null);
        setOpen(false);
      }, 550);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          className={cn("focus-tangerine shrink-0 rounded-full", className)}
        >
          <Badge
            className={cn(
              config.badgeClass,
              config.glowClass,
              "cursor-pointer gap-1.5 py-1 pr-1.5 pl-2.5 text-[0.7rem] font-semibold"
            )}
          >
            <span className={cn("size-1.5 rounded-full", config.dotClass)} />
            {config.label}
            <ChevronDown className="size-3 opacity-70" />
          </Badge>
        </motion.button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1.5 px-1.5 text-xs font-medium text-muted-foreground">Update status</p>
        <div className="flex flex-col gap-1">
          {SHIPMENT_STATUSES.map((s) => {
            const isCurrent = s === status;
            const isArmed = armed === s;
            const isBusy = busy === s;
            const isSucceeded = succeeded === s;
            const optionConfig = STATUS_CONFIG[s];

            return (
              <motion.button
                key={s}
                type="button"
                disabled={isCurrent || busy !== null}
                onClick={() => handleOptionClick(s)}
                layout
                whileHover={!isCurrent && !busy ? { scale: 1.02 } : undefined}
                whileTap={!isCurrent && !busy ? { scale: 0.98 } : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  isCurrent
                    ? "bg-muted text-muted-foreground"
                    : isArmed || isSucceeded
                      ? optionConfig.solidClass
                      : "text-foreground hover:bg-muted"
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isArmed || isSucceeded ? "bg-white" : optionConfig.dotClass
                    )}
                  />
                  {optionConfig.label}
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  {isCurrent ? (
                    <motion.span key="current" className="text-[0.7rem] opacity-70">
                      Current
                    </motion.span>
                  ) : isBusy ? (
                    <motion.span
                      key="busy"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className="size-3.5 animate-spin" />
                    </motion.span>
                  ) : isSucceeded ? (
                    <motion.span
                      key="success"
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.3, 1] }}
                      transition={{ duration: 0.35 }}
                    >
                      <Check className="size-3.5" />
                    </motion.span>
                  ) : isArmed ? (
                    <motion.span
                      key="confirm"
                      initial={{ opacity: 0, x: 4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[0.7rem]"
                    >
                      Click again
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
