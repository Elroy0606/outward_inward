"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { StatusPopover } from "@/components/dashboard/status-popover";
import { ShipmentDetailsDialog } from "@/components/dashboard/shipment-details-dialog";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Truck,
  Package,
  CalendarDays,
  Hash,
  IndianRupee,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Shipment, ShipmentStatus } from "@/lib/types";

export const cardGridVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

export const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.15 },
  },
};

export function ShipmentCard({
  shipment,
  onEdit,
  onDelete,
  onStatusChange,
  onSaved,
  isPending,
  isActive,
  onOpenDetails,
}: {
  shipment: Shipment;
  onEdit: (shipment: Shipment) => void;
  onDelete: (shipment: Shipment) => void;
  onStatusChange: (shipment: Shipment, status: ShipmentStatus) => Promise<boolean>;
  /** Called after a shipment is edited in-place from the details modal. */
  onSaved: () => void;
  isPending: boolean;
  /** Whether this card is the most recently viewed/selected one (persistent highlight ring). */
  isActive: boolean;
  /** Marks this card as the active one — called whenever its details are opened. */
  onOpenDetails: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isInward = shipment.type === "INWARD";
  const referenceNumber = shipment.cost_center_oca ?? shipment.invoice_number;

  function handleOpenDetails() {
    onOpenDetails();
    setDetailsOpen(true);
  }

  return (
    <motion.div
      layout
      variants={cardVariants}
      exit="exit"
      whileHover={{ y: -4 }}
      transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
      onClick={handleOpenDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpenDetails();
        }
      }}
      className={cn(
        "glass-card glass-card-hover flex cursor-pointer flex-col rounded-2xl p-4 transition-shadow duration-200 focus-tangerine",
        isActive && "ring-2 ring-tangerine-500 ring-offset-2 ring-offset-background",
        isPending && "pointer-events-none opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
              isInward
                ? "bg-tangerine-100 text-tangerine-700 dark:bg-tangerine-950 dark:text-tangerine-300"
                : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
            )}
          >
            {isInward ? <Package className="size-4" /> : <Truck className="size-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-base leading-snug font-semibold tracking-tight break-words text-foreground">
              {shipment.company_name}
            </h3>
            {referenceNumber && (
              <p className="mt-0.5 flex items-start gap-1 text-xs break-words text-muted-foreground">
                <Hash className="mt-0.5 size-3 shrink-0" />
                <span>{referenceNumber}</span>
              </p>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <StatusPopover
            status={shipment.status}
            onChange={(status) => onStatusChange(shipment, status)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(shipment)} className="gap-2">
                <Pencil className="size-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(shipment)}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-foreground/90">{shipment.particulars}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {formatDate(shipment.shipment_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <IndianRupee className="size-3.5" />
          {formatCurrency(shipment.shipping_charges)}
        </span>
        {(shipment.transporter_name || shipment.tracking_number) && (
          <span className="flex min-w-0 items-center gap-1.5">
            <Truck className="size-3.5 shrink-0" />
            <span className="truncate">
              {shipment.transporter_name ?? shipment.tracking_number}
            </span>
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenDetails();
        }}
        className="focus-tangerine mt-3 flex items-center justify-center gap-1 self-start rounded-lg px-2 py-1 text-xs font-medium text-tangerine-700 transition-colors hover:bg-tangerine-50 dark:text-tangerine-400 dark:hover:bg-tangerine-950/40"
      >
        More details
        <ChevronRight className="size-3.5" />
      </button>

      <ShipmentDetailsDialog
        shipment={shipment}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onSaved={onSaved}
      />
    </motion.div>
  );
}
