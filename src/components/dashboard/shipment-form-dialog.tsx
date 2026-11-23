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
  DialogClose,
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
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";
import type { Shipment, ShipmentType } from "@/lib/types";

/** White field surface that lifts off the warm modal body. */
const CONTROL_CLASS =
  "border-orange-200/80 bg-white shadow-sm focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20";

/** Fixed height, so long auto-filled text scrolls inside the field instead of growing the modal. */
const TEXTAREA_CLASS = cn(CONTROL_CLASS, "h-14 min-h-14 resize-none field-sizing-fixed");

/** White text needs this shadow to stay readable toward the yellow end of the gradient. */
const WHITE_ON_GRADIENT = "[text-shadow:0_1px_2px_rgb(0_0_0/0.45)]";

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
        className={TEXTAREA_CLASS}
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
      <Label htmlFor={htmlFor} className="mb-1 text-xs font-semibold whitespace-nowrap">
        {label}
      </Label>
      {children}
      {error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function FieldGroup({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("flex min-w-0 flex-col gap-2.5 rounded-lg border border-orange-200/70 p-3", className)}
    >
      <h3 className="text-xs font-bold tracking-wide text-orange-800 uppercase">{title}</h3>
      {children}
    </section>
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
  // existing shipment never gets silently rewritten. Cost Center / OCA is deliberately excluded:
  // it's unique per shipment, so it must never be copied from a prior shipment.
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
      // Clear immediately so the next "Add Shipment" always opens blank, regardless of
      // whether the open-state effect below has re-run yet.
      if (!isEdit) reset(emptyDefaults(watchedType));
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden bg-white p-0 sm:max-w-5xl [@media(min-width:64rem)_and_(min-height:38rem)]:max-h-none [@media(min-width:64rem)_and_(min-height:38rem)]:overflow-visible"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="relative shrink-0 gap-0.5 rounded-t-xl bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 px-5 py-3 pr-14 text-white shadow-sm">
          <DialogTitle className={cn("text-lg font-bold text-white", WHITE_ON_GRADIENT)}>
            {isEdit ? "Edit Shipment" : "Add Shipment"}
          </DialogTitle>
          <DialogDescription className={cn("text-xs font-medium text-white", WHITE_ON_GRADIENT)}>
            {isEdit
              ? "Update the shipment record. Changes save immediately."
              : "Log a new inward or outward shipment."}
          </DialogDescription>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-3 -translate-y-1/2 bg-black/30 text-white hover:bg-black/45 hover:text-white focus-visible:ring-white/70 dark:hover:bg-black/45"
            >
              <X />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        <form
          id="shipment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto bg-orange-50/40 p-4 md:grid-cols-2 lg:grid-cols-3 [@media(min-width:64rem)_and_(min-height:38rem)]:overflow-visible"
        >
          <FieldGroup title="Order & Direction">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Direction" htmlFor="type" className="col-span-2">
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="type" className={cn("w-full", CONTROL_CLASS)}>
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
                      <SelectTrigger id="status" className={cn("w-full", CONTROL_CLASS)}>
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
              <Field label="Shipment Date" htmlFor="shipment_date" error={errors.shipment_date?.message}>
                <Input id="shipment_date" type="date" className={CONTROL_CLASS} {...register("shipment_date")} />
              </Field>
              <Field label="Invoice No." htmlFor="invoice_number">
                <Input id="invoice_number" className={CONTROL_CLASS} {...register("invoice_number")} />
              </Field>
              <Field label="Cost Center OCA" htmlFor="cost_center_oca">
                <Input
                  id="cost_center_oca"
                  className={CONTROL_CLASS}
                  {...register("cost_center_oca")}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Shipping Charges"
                htmlFor="shipping_charges"
                error={errors.shipping_charges?.message}
                className="col-span-2"
              >
                <Input
                  id="shipping_charges"
                  inputMode="decimal"
                  className={CONTROL_CLASS}
                  {...register("shipping_charges")}
                />
              </Field>
            </div>
            <Field label="Remarks" htmlFor="remarks" className="flex flex-1 flex-col">
              <Textarea
                id="remarks"
                rows={2}
                className={cn(TEXTAREA_CLASS, "flex-1")}
                {...register("remarks")}
              />
            </Field>
          </FieldGroup>

          <FieldGroup title="Customer & Item">
            <Field label="Company Name" htmlFor="company_name" error={errors.company_name?.message}>
              <Input
                id="company_name"
                className={CONTROL_CLASS}
                {...register("company_name")}
                list="company-name-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="company-name-suggestions" options={companySuggestions} />
            </Field>
            <Field label="Particulars" htmlFor="particulars" error={errors.particulars?.message}>
              <Textarea id="particulars" rows={2} className={TEXTAREA_CLASS} {...register("particulars")} />
            </Field>
            <Field label="Shipping Address" htmlFor="shipping_address">
              <AddressAutocomplete
                registerProps={register("shipping_address")}
                value={watch("shipping_address")}
                options={addressSuggestions}
                onSelect={(value) => setValue("shipping_address", value, { shouldDirty: true })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Contact Person" htmlFor="contact_person">
                <Input
                  id="contact_person"
                  className={CONTROL_CLASS}
                  {...register("contact_person")}
                  list="contact-person-suggestions"
                  autoComplete="off"
                />
                <SuggestionList id="contact-person-suggestions" options={contactPersonSuggestions} />
              </Field>
              <Field label="Contact Number" htmlFor="contact_number">
                <Input
                  id="contact_number"
                  className={CONTROL_CLASS}
                  {...register("contact_number")}
                  list="contact-number-suggestions"
                  autoComplete="off"
                />
                <SuggestionList id="contact-number-suggestions" options={contactNumberSuggestions} />
              </Field>
            </div>
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                className={CONTROL_CLASS}
                {...register("email")}
                list="email-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="email-suggestions" options={emailSuggestions} />
            </Field>
          </FieldGroup>

          <FieldGroup title="Transport & Delivery" className="md:col-span-2 lg:col-span-1">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Transporter" htmlFor="transporter_name">
                <Input
                  id="transporter_name"
                  className={CONTROL_CLASS}
                  {...register("transporter_name")}
                  list="transporter-suggestions"
                  autoComplete="off"
                />
                <SuggestionList id="transporter-suggestions" options={transporterSuggestions} />
              </Field>
              <Field label="Tracking No." htmlFor="tracking_number">
                <Input id="tracking_number" className={CONTROL_CLASS} {...register("tracking_number")} />
              </Field>
              <Field label="Goods Taken Out By" htmlFor="taken_out_by">
                <Input
                  id="taken_out_by"
                  className={CONTROL_CLASS}
                  {...register("taken_out_by")}
                  list="taken-out-by-suggestions"
                  autoComplete="off"
                />
                <SuggestionList id="taken-out-by-suggestions" options={takenOutBySuggestions} />
              </Field>
              <Field label="Delivery Date" htmlFor="delivery_date" error={errors.delivery_date?.message}>
                <Input id="delivery_date" type="date" className={CONTROL_CLASS} {...register("delivery_date")} />
              </Field>
            </div>
            <Field label="Delivery Confirmed With" htmlFor="confirmed_with">
              <Input
                id="confirmed_with"
                className={CONTROL_CLASS}
                {...register("confirmed_with")}
                list="confirmed-with-suggestions"
                autoComplete="off"
              />
              <SuggestionList id="confirmed-with-suggestions" options={confirmedWithSuggestions} />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Weight (kg)" htmlFor="weight_kg" error={errors.weight_kg?.message}>
                <Input id="weight_kg" inputMode="decimal" className={CONTROL_CLASS} {...register("weight_kg")} />
              </Field>
              <Field label="Volume (cbm)" htmlFor="volume_cbm" error={errors.volume_cbm?.message}>
                <Input id="volume_cbm" inputMode="decimal" className={CONTROL_CLASS} {...register("volume_cbm")} />
              </Field>
            </div>
          </FieldGroup>
        </form>

        <DialogFooter className="mx-0 mb-0 shrink-0 flex-row justify-end gap-2 border-t border-orange-200/70 bg-white px-5 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <MotionButton
            type="submit"
            form="shipment-form"
            disabled={isPending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "gap-1.5 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 text-white font-semibold shadow-md hover:brightness-105 transition",
              WHITE_ON_GRADIENT
            )}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Shipment"}
          </MotionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
