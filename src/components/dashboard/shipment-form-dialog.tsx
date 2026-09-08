"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, Controller, type UseFormRegisterReturn } from "react-hook-form";
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
import { buildFieldSuggestions, findLatestShipmentForCompany } from "@/lib/suggestions";
import { Loader2 } from "lucide-react";
import type { Shipment, ShipmentType } from "@/lib/types";

/** Invisible native `<datalist>` — pair its `id` with an `Input`'s `list` prop for suggestions. */
function SuggestionList({ id, options }: { id: string; options: string[] }) {
  return (
    <datalist id={id}>
      {options.map((option) => (
        <option key={option} value={option} />
      ))}
    </datalist>
  );
}

/**
 * Type-to-filter autocomplete for fields where a native `<datalist>` can't attach (e.g. a
 * `Textarea`) — filters the address history against whatever's typed so far and shows only
 * a handful of matches in a scrollable dropdown, so it stays usable no matter how many past
 * addresses pile up. Reflects new addresses automatically since `options` comes straight
 * from the (auto-refreshing) shipment history.
 */
function AddressAutocomplete({
  registerProps,
  value,
  options,
  onSelect,
}: {
  registerProps: UseFormRegisterReturn<"shipping_address">;
  value: string | undefined;
  options: string[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const query = value?.trim().toLowerCase() ?? "";
  const filtered = (query ? options.filter((o) => o.toLowerCase().includes(query)) : options).slice(
    0,
    8
  );

  return (
    <div className="relative">
      <Textarea
        id="shipping_address"
        rows={2}
        autoComplete="off"
        {...registerProps}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          registerProps.onBlur(e);
          setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              // Prevents the textarea from blurring (and the dropdown closing) before the click registers.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(option);
                setOpen(false);
              }}
              title={option}
              className="block w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-tangerine-50 hover:text-tangerine-700 dark:hover:bg-tangerine-950/40 dark:hover:text-tangerine-400"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  history = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment?: Shipment | null;
  defaultType: ShipmentType;
  onSaved: () => void;
  /** Past shipments, used to power autocomplete suggestions and company auto-fill. */
  history?: Shipment[];
}) {
  const isEdit = Boolean(shipment);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentFormSchema),
    defaultValues: emptyDefaults(defaultType),
  });

  useEffect(() => {
    if (!open) return;
    reset(shipment ? shipmentToFormValues(shipment) : emptyDefaults(defaultType));
  }, [open, shipment, defaultType, reset]);

  const companySuggestions = useMemo(() => buildFieldSuggestions(history, "company_name"), [history]);
  const costCenterSuggestions = useMemo(
    () => buildFieldSuggestions(history, "cost_center_oca"),
    [history]
  );
  const addressSuggestions = useMemo(
    () => buildFieldSuggestions(history, "shipping_address"),
    [history]
  );
  const takenOutBySuggestions = useMemo(
    () => buildFieldSuggestions(history, "taken_out_by"),
    [history]
  );
  const transporterSuggestions = useMemo(
    () => buildFieldSuggestions(history, "transporter_name"),
    [history]
  );
  const confirmedWithSuggestions = useMemo(
    () => buildFieldSuggestions(history, "confirmed_with"),
    [history]
  );
  const contactPersonSuggestions = useMemo(
    () => buildFieldSuggestions(history, "contact_person"),
    [history]
  );
  const contactNumberSuggestions = useMemo(
    () => buildFieldSuggestions(history, "contact_number"),
    [history]
  );
  const emailSuggestions = useMemo(() => buildFieldSuggestions(history, "email"), [history]);

  const watchedCompanyName = watch("company_name");
  const watchedType = watch("type");

  // When the company name matches one shipped before (for the same direction, when possible),
  // fill in whatever address/contact/transporter fields the user hasn't already typed —
  // never overwrites a field that already has a value. Create-mode only, so editing an
  // existing shipment never gets silently rewritten.
  useEffect(() => {
    if (isEdit || !open) return;
    const trimmed = watchedCompanyName?.trim();
    if (!trimmed) return;
    const match = findLatestShipmentForCompany(history, trimmed, watchedType);
    if (!match) return;

    const current = getValues();
    if (!current.shipping_address && match.shipping_address) {
      setValue("shipping_address", match.shipping_address);
    }
    if (!current.contact_person && match.contact_person) {
      setValue("contact_person", match.contact_person);
    }
    if (!current.contact_number && match.contact_number) {
      setValue("contact_number", match.contact_number);
    }
    if (!current.email && match.email) {
      setValue("email", match.email);
    }
    if (!current.transporter_name && match.transporter_name) {
      setValue("transporter_name", match.transporter_name);
    }
    if (!current.cost_center_oca && match.cost_center_oca) {
      setValue("cost_center_oca", match.cost_center_oca);
    }
  }, [watchedCompanyName, watchedType, isEdit, open, history, getValues, setValue]);

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
              <Input
                id="company_name"
                {...register("company_name")}
                placeholder="Acme Pvt Ltd"
                list="company-name-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="company-name-suggestions" options={companySuggestions} />
            </Field>

            <Field label="Shipment Date" htmlFor="shipment_date" error={errors.shipment_date?.message}>
              <Input id="shipment_date" type="date" {...register("shipment_date")} />
            </Field>
            <Field label="Cost Center OCA" htmlFor="cost_center_oca">
              <Input
                id="cost_center_oca"
                {...register("cost_center_oca")}
                placeholder="CC-101 / OCA1234r"
                list="cost-center-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="cost-center-suggestions" options={costCenterSuggestions} />
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
              <AddressAutocomplete
                registerProps={register("shipping_address")}
                value={watch("shipping_address")}
                options={addressSuggestions}
                onSelect={(value) => setValue("shipping_address", value, { shouldDirty: true })}
              />
            </Field>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <Field label="Transporter" htmlFor="transporter_name">
              <Input
                id="transporter_name"
                {...register("transporter_name")}
                list="transporter-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="transporter-suggestions" options={transporterSuggestions} />
            </Field>
            <Field label="Tracking No." htmlFor="tracking_number">
              <Input id="tracking_number" {...register("tracking_number")} />
            </Field>
            <Field label="Goods Taken Out By" htmlFor="taken_out_by">
              <Input
                id="taken_out_by"
                {...register("taken_out_by")}
                list="taken-out-by-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="taken-out-by-suggestions" options={takenOutBySuggestions} />
            </Field>
            <Field label="Delivery Confirmed With" htmlFor="confirmed_with">
              <Input
                id="confirmed_with"
                {...register("confirmed_with")}
                list="confirmed-with-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="confirmed-with-suggestions" options={confirmedWithSuggestions} />
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
              <Input
                id="contact_person"
                {...register("contact_person")}
                list="contact-person-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="contact-person-suggestions" options={contactPersonSuggestions} />
            </Field>
            <Field label="Contact Number" htmlFor="contact_number">
              <Input
                id="contact_number"
                {...register("contact_number")}
                list="contact-number-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="contact-number-suggestions" options={contactNumberSuggestions} />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email?.message} className="col-span-2">
              <Input
                id="email"
                type="email"
                {...register("email")}
                list="email-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="email-suggestions" options={emailSuggestions} />
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
