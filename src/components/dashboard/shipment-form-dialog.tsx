"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { MotionButton } from "@/components/motion/motion-button";
import { Button } from "@/components/ui/button";
import { createShipment, updateShipment } from "@/lib/actions";
import {
  shipmentFormSchema,
  formValuesToShipmentInsert,
  shipmentToFormValues,
  type ShipmentFormValues,
} from "@/lib/validations";
import { SHIPMENT_STATUSES, SHIPMENT_TYPES, STATUS_CONFIG, TYPE_CONFIG } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import type { Shipment, ShipmentType } from "@/lib/types";

const emptyDefaults = (type: ShipmentType): ShipmentFormValues => ({
  type,
  status: "PENDING",
  company_name: "",
  cost_center_oca: "",
  shipment_date: new Date().toISOString().slice(0, 10),
  invoice_number: "",
  particulars: "",
  shipping_address: "",
  taken_out_by: "",
  transporter_name: "",
  tracking_number: "",
  delivery_date: "",
  confirmed_with: "",
  shipping_charges: "",
  weight_kg: "",
  volume_cbm: "",
  contact_person: "",
  contact_number: "",
  email: "",
  remarks: "",
});

function Field({
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
      <Label htmlFor={htmlFor} className="mb-1.5">
        {label}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ShipmentFormDialog({
  open,
  onOpenChange,
  shipment,
  defaultType,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment?: Shipment | null;
  defaultType: ShipmentType;
  onSaved: () => void;
}) {
  const isEdit = Boolean(shipment);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentFormSchema),
    defaultValues: emptyDefaults(defaultType),
  });

  useEffect(() => {
    if (!open) return;
    reset(shipment ? shipmentToFormValues(shipment) : emptyDefaults(defaultType));
  }, [open, shipment, defaultType, reset]);

  function onSubmit(values: ShipmentFormValues) {
    const payload = formValuesToShipmentInsert(values);
    startTransition(async () => {
      const result = isEdit
        ? await updateShipment(shipment!.id, payload)
        : await createShipment(payload);

      if (!result.success) {
        toast.error(isEdit ? "Couldn't update shipment" : "Couldn't create shipment", {
          description: result.error,
        });
        return;
      }

      toast.success(isEdit ? "Shipment updated" : "Shipment created", {
        description: payload.company_name,
      });
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] w-full flex-col gap-0 p-0 sm:max-w-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{isEdit ? "Edit Shipment" : "Add Shipment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the shipment record. Changes save immediately."
              : "Log a new inward or outward shipment."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="shipment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 space-y-6 overflow-y-auto px-6 py-4"
        >
          <section className="grid grid-cols-2 gap-4">
            <Field label="Direction" htmlFor="type">
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_CONFIG[t].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Status" htmlFor="status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-full">
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
            </Field>

            <Field
              label="Company Name"
              htmlFor="company_name"
              error={errors.company_name?.message}
              className="col-span-2"
            >
              <Input id="company_name" {...register("company_name")} placeholder="Acme Pvt Ltd" />
            </Field>

            <Field label="Shipment Date" htmlFor="shipment_date" error={errors.shipment_date?.message}>
              <Input id="shipment_date" type="date" {...register("shipment_date")} />
            </Field>
            <Field label="Cost Center OCA" htmlFor="cost_center_oca">
              <Input
                id="cost_center_oca"
                {...register("cost_center_oca")}
                placeholder="CC-101 / OCA1234r"
              />
            </Field>

            <Field label="Invoice No." htmlFor="invoice_number">
              <Input id="invoice_number" {...register("invoice_number")} />
            </Field>
          </section>

          <section className="space-y-4">
            <Field
              label="Particulars"
              htmlFor="particulars"
              error={errors.particulars?.message}
            >
              <Textarea
                id="particulars"
                rows={2}
                {...register("particulars")}
                placeholder="What's being shipped"
              />
            </Field>
            <Field label="Shipping Address" htmlFor="shipping_address">
              <Textarea id="shipping_address" rows={2} {...register("shipping_address")} />
            </Field>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <Field label="Transporter" htmlFor="transporter_name">
              <Input id="transporter_name" {...register("transporter_name")} />
            </Field>
            <Field label="Tracking No." htmlFor="tracking_number">
              <Input id="tracking_number" {...register("tracking_number")} />
            </Field>
            <Field label="Goods Taken Out By" htmlFor="taken_out_by">
              <Input id="taken_out_by" {...register("taken_out_by")} />
            </Field>
            <Field label="Delivery Confirmed With" htmlFor="confirmed_with">
              <Input id="confirmed_with" {...register("confirmed_with")} />
            </Field>
            <Field label="Delivery Date" htmlFor="delivery_date" error={errors.delivery_date?.message}>
              <Input id="delivery_date" type="date" {...register("delivery_date")} />
            </Field>
            <Field
              label="Shipping Charges"
              htmlFor="shipping_charges"
              error={errors.shipping_charges?.message}
            >
              <Input id="shipping_charges" inputMode="decimal" {...register("shipping_charges")} />
            </Field>
            <Field label="Weight (kg)" htmlFor="weight_kg" error={errors.weight_kg?.message}>
              <Input id="weight_kg" inputMode="decimal" {...register("weight_kg")} />
            </Field>
            <Field label="Volume (cbm)" htmlFor="volume_cbm" error={errors.volume_cbm?.message}>
              <Input id="volume_cbm" inputMode="decimal" {...register("volume_cbm")} />
            </Field>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <Field label="Contact Person" htmlFor="contact_person">
              <Input id="contact_person" {...register("contact_person")} />
            </Field>
            <Field label="Contact Number" htmlFor="contact_number">
              <Input id="contact_number" {...register("contact_number")} />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email?.message} className="col-span-2">
              <Input id="email" type="email" {...register("email")} />
            </Field>
            <Field label="Remarks" htmlFor="remarks" className="col-span-2">
              <Textarea id="remarks" rows={2} {...register("remarks")} />
            </Field>
          </section>
        </form>

        <DialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <MotionButton
            type="submit"
            form="shipment-form"
            disabled={isPending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Shipment"}
          </MotionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
