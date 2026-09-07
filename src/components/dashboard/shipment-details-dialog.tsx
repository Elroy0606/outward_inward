"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/motion/motion-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { updateShipment } from "@/lib/actions";
import {
  shipmentFormSchema,
  shipmentToFormValues,
  formValuesToShipmentInsert,
  type ShipmentFormValues,
} from "@/lib/validations";
import { SHIPMENT_STATUSES, STATUS_CONFIG } from "@/lib/constants";
import {
  Package,
  Truck,
  Hash,
  Pencil,
  X,
  Loader2,
  MapPin,
  Users,
  ClipboardList,
} from "lucide-react";
import type { Shipment } from "@/lib/types";

/** Read-only key/value pair used in view mode. */
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

/** Section wrapper used for both view-mode fields and edit-mode inputs. */
function Section({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: React.ElementType;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-5",
        className
      )}
    >
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function EditField({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 text-xs">
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ShipmentDetailsDialog({
  shipment,
  open,
  onOpenChange,
  onSaved,
}: {
  shipment: Shipment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful edit save, so the parent can refresh server data. */
  onSaved?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isInward = shipment.type === "INWARD";
  const referenceNumber = shipment.cost_center_oca ?? shipment.invoice_number;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentFormSchema),
    defaultValues: shipmentToFormValues(shipment),
  });

  // Refresh the form's default values whenever the dialog is (re)opened, so a stale edit
  // (or an out-of-band update, e.g. via the status popover while this dialog was closed)
  // never lingers into the next time it's opened.
  useEffect(() => {
    if (!open) return;
    reset(shipmentToFormValues(shipment));
  }, [open, shipment, reset]);

  function handleCancelEdit() {
    reset(shipmentToFormValues(shipment));
    setIsEditing(false);
  }

  function onSubmit(values: ShipmentFormValues) {
    const payload = formValuesToShipmentInsert(values);
    startTransition(async () => {
      const result = await updateShipment(shipment.id, payload);
      if (!result.success) {
        toast.error("Couldn't update shipment", { description: result.error });
        return;
      }
      toast.success("Shipment updated", { description: payload.company_name });
      setIsEditing(false);
      onSaved?.();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isEditing) {
          // Closing mid-edit discards unsaved changes rather than silently losing the dialog.
          handleCancelEdit();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        {/* Tangerine brand header bar */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-tangerine-600 to-tangerine-500 px-6 py-5 text-white sm:px-8 sm:py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_100%_0%,rgba(255,255,255,0.18),transparent)]"
          />
          <div className="relative flex items-start gap-3 pr-10">
            <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30">
              {isInward ? <Package className="size-5" /> : <Truck className="size-5" />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-xl font-semibold text-white">
                {shipment.company_name}
              </DialogTitle>
              {referenceNumber && (
                <p className="mt-1 flex items-center gap-1 truncate text-sm text-white/80">
                  <Hash className="size-3.5" />
                  {referenceNumber}
                </p>
              )}
            </div>
            <DialogDescription className="sr-only">
              Full shipment details for {shipment.company_name}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white sm:top-5 sm:right-6"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Status / date / edit-toggle sub-header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/60 px-6 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <StatusBadge status={shipment.status} />
            <span className="text-sm text-muted-foreground">
              {formatDate(shipment.shipment_date)}
            </span>
          </div>
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <form
            id="shipment-edit-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 space-y-4 overflow-y-auto px-6 py-6 sm:px-8"
          >
            <Section icon={ClipboardList} title="Shipment Overview">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <EditField
                  label="Company Name"
                  htmlFor="edit_company_name"
                  error={errors.company_name?.message}
                  className="sm:col-span-2 lg:col-span-2"
                >
                  <Input id="edit_company_name" {...register("company_name")} />
                </EditField>
                <EditField label="Status" htmlFor="edit_status">
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="edit_status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHIPMENT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_CONFIG[s].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </EditField>
                <EditField
                  label="Shipment Date"
                  htmlFor="edit_shipment_date"
                  error={errors.shipment_date?.message}
                >
                  <Input id="edit_shipment_date" type="date" {...register("shipment_date")} />
                </EditField>
                <EditField label="Cost Center / OCA" htmlFor="edit_cost_center_oca">
                  <Input id="edit_cost_center_oca" {...register("cost_center_oca")} />
                </EditField>
                <EditField label="Invoice No." htmlFor="edit_invoice_number">
                  <Input id="edit_invoice_number" {...register("invoice_number")} />
                </EditField>
                <EditField
                  label="Particulars"
                  htmlFor="edit_particulars"
                  error={errors.particulars?.message}
                  className="sm:col-span-2 lg:col-span-4"
                >
                  <Textarea id="edit_particulars" rows={2} {...register("particulars")} />
                </EditField>
              </div>
            </Section>

            <Section icon={Truck} title="Logistics">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <EditField label="Transporter" htmlFor="edit_transporter_name">
                  <Input id="edit_transporter_name" {...register("transporter_name")} />
                </EditField>
                <EditField label="Tracking No." htmlFor="edit_tracking_number">
                  <Input id="edit_tracking_number" {...register("tracking_number")} />
                </EditField>
                <EditField
                  label="Delivery Date"
                  htmlFor="edit_delivery_date"
                  error={errors.delivery_date?.message}
                >
                  <Input id="edit_delivery_date" type="date" {...register("delivery_date")} />
                </EditField>
                <EditField
                  label={isInward ? "Goods Taken Out By" : "Delivery Confirmed With"}
                  htmlFor="edit_confirmed_field"
                >
                  <Input
                    id="edit_confirmed_field"
                    {...register(isInward ? "taken_out_by" : "confirmed_with")}
                  />
                </EditField>
                <EditField
                  label="Shipping Charges"
                  htmlFor="edit_shipping_charges"
                  error={errors.shipping_charges?.message}
                >
                  <Input id="edit_shipping_charges" inputMode="decimal" {...register("shipping_charges")} />
                </EditField>
                <EditField
                  label="Weight (kg)"
                  htmlFor="edit_weight_kg"
                  error={errors.weight_kg?.message}
                >
                  <Input id="edit_weight_kg" inputMode="decimal" {...register("weight_kg")} />
                </EditField>
                <EditField
                  label="Volume (cbm)"
                  htmlFor="edit_volume_cbm"
                  error={errors.volume_cbm?.message}
                >
                  <Input id="edit_volume_cbm" inputMode="decimal" {...register("volume_cbm")} />
                </EditField>
              </div>
            </Section>

            <Section icon={Users} title="Contact">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <EditField label="Contact Person" htmlFor="edit_contact_person">
                  <Input id="edit_contact_person" {...register("contact_person")} />
                </EditField>
                <EditField label="Contact Number" htmlFor="edit_contact_number">
                  <Input id="edit_contact_number" {...register("contact_number")} />
                </EditField>
                <EditField
                  label="Email"
                  htmlFor="edit_email"
                  error={errors.email?.message}
                  className="sm:col-span-2"
                >
                  <Input id="edit_email" type="email" {...register("email")} />
                </EditField>
              </div>
            </Section>

            <Section icon={MapPin} title="Address & Remarks">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EditField label="Shipping Address" htmlFor="edit_shipping_address">
                  <Textarea id="edit_shipping_address" rows={2} {...register("shipping_address")} />
                </EditField>
                <EditField label="Remarks" htmlFor="edit_remarks">
                  <Textarea id="edit_remarks" rows={2} {...register("remarks")} />
                </EditField>
              </div>
            </Section>
          </form>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6 sm:px-8">
            <Section icon={ClipboardList} title="Shipment Overview">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                <DetailField label="Cost Center / OCA" value={shipment.cost_center_oca ?? "—"} />
                <DetailField label="Invoice No." value={shipment.invoice_number ?? "—"} />
                <DetailField label="Weight" value={formatNumber(shipment.weight_kg, "kg")} />
                <DetailField label="Volume" value={formatNumber(shipment.volume_cbm, "cbm")} />
                <DetailField
                  label="Particulars"
                  value={shipment.particulars}
                  className="col-span-2 sm:col-span-4"
                  valueClassName="text-sm"
                />
              </dl>
            </Section>

            <Section icon={Truck} title="Logistics">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                <DetailField label="Transporter" value={shipment.transporter_name ?? "—"} />
                <DetailField label="Tracking No." value={shipment.tracking_number ?? "—"} />
                <DetailField label="Delivery Date" value={formatDate(shipment.delivery_date)} />
                <DetailField
                  label={isInward ? "Goods Taken Out By" : "Delivery Confirmed With"}
                  value={(isInward ? shipment.taken_out_by : shipment.confirmed_with) ?? "—"}
                />
                <DetailField label="Shipping Charges" value={formatCurrency(shipment.shipping_charges)} />
              </dl>
            </Section>

            <Section icon={Users} title="Contact">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                <DetailField label="Contact Person" value={shipment.contact_person ?? "—"} />
                <DetailField label="Contact Number" value={shipment.contact_number ?? "—"} />
                <DetailField label="Email" value={shipment.email ?? "—"} className="col-span-2" />
              </dl>
            </Section>

            <Section icon={MapPin} title="Address & Remarks">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <DetailField label="Shipping Address" value={shipment.shipping_address ?? "—"} />
                <DetailField label="Remarks" value={shipment.remarks ?? "—"} />
              </dl>
            </Section>
          </div>
        )}

        {isEditing && (
          <div className="flex shrink-0 flex-row justify-end gap-2 border-t border-border bg-muted/50 px-6 py-4 sm:px-8">
            <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isPending}>
              Cancel
            </Button>
            <MotionButton
              type="submit"
              form="shipment-edit-form"
              disabled={isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save Changes
            </MotionButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
