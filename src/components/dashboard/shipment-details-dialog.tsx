"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Package, Truck, Hash } from "lucide-react";
import type { Shipment } from "@/lib/types";

function DetailField({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={cn("mt-1 text-sm text-foreground", valueClassName)}>{value}</dd>
    </div>
  );
}

export function ShipmentDetailsDialog({
  shipment,
  open,
  onOpenChange,
}: {
  shipment: Shipment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isInward = shipment.type === "INWARD";
  const referenceNumber = shipment.cost_center_oca ?? shipment.invoice_number;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="gap-3 px-8 pt-8">
          <div className="flex items-start gap-3 pr-8">
            <div
              className={
                isInward
                  ? "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-tangerine-100 text-tangerine-700 dark:bg-tangerine-950 dark:text-tangerine-300"
                  : "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
              }
            >
              {isInward ? <Package className="size-5" /> : <Truck className="size-5" />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-xl">{shipment.company_name}</DialogTitle>
              {referenceNumber && (
                <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                  <Hash className="size-3.5" />
                  {referenceNumber}
                </p>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">
            Full shipment details for {shipment.company_name}
          </DialogDescription>
          <div className="flex items-center gap-3">
            <StatusBadge status={shipment.status} />
            <span className="text-sm text-muted-foreground">
              {formatDate(shipment.shipment_date)}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-8 py-6">
          <DetailField
            label="Particulars"
            value={shipment.particulars}
            valueClassName="text-base"
          />

          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border/70 pt-6 sm:grid-cols-3 lg:grid-cols-4">
            <DetailField label="Cost Center / OCA" value={shipment.cost_center_oca ?? "—"} />
            <DetailField label="Invoice No." value={shipment.invoice_number ?? "—"} />
            <DetailField label="Tracking No." value={shipment.tracking_number ?? "—"} />
            <DetailField label="Weight" value={formatNumber(shipment.weight_kg, "kg")} />
            <DetailField label="Volume" value={formatNumber(shipment.volume_cbm, "cbm")} />
            <DetailField label="Shipping Charges" value={formatCurrency(shipment.shipping_charges)} />
            <DetailField
              label={isInward ? "Goods Taken Out By" : "Delivery Confirmed With"}
              value={(isInward ? shipment.taken_out_by : shipment.confirmed_with) ?? "—"}
            />
            <DetailField label="Delivery Date" value={formatDate(shipment.delivery_date)} />
            <DetailField label="Transporter" value={shipment.transporter_name ?? "—"} />
            <DetailField label="Contact Person" value={shipment.contact_person ?? "—"} />
            <DetailField label="Contact Number" value={shipment.contact_number ?? "—"} />
            <DetailField label="Email" value={shipment.email ?? "—"} />
            <DetailField
              label="Shipping Address"
              value={shipment.shipping_address ?? "—"}
              className="col-span-2 sm:col-span-3 lg:col-span-2"
            />
            <DetailField
              label="Remarks"
              value={shipment.remarks ?? "—"}
              className="col-span-2 sm:col-span-3 lg:col-span-2"
            />
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
