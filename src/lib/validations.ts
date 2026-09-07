import { z } from "zod";
import type { Shipment, ShipmentInsert } from "@/lib/types";

const shipmentTypeEnum = z.enum(["INWARD", "OUTWARD"]);
const shipmentStatusEnum = z.enum(["PENDING", "IN_TRANSIT", "DELIVERED", "CANCELLED"]);

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Form-facing schema: every field is a plain string (as HTML inputs produce),
 * with light format checks. Use `formValuesToShipmentInsert` to convert a
 * validated result into the typed payload the server actions expect.
 */
export const shipmentFormSchema = z.object({
  type: shipmentTypeEnum,
  status: shipmentStatusEnum,
  company_name: z.string().trim().min(1, "Company name is required").max(200),
  cost_center_oca: z.string().trim().max(240).optional(),
  shipment_date: z
    .string()
    .min(1, "Shipment date is required")
    .refine((v) => isoDatePattern.test(v), "Enter a valid date"),
  invoice_number: z.string().trim().max(120).optional(),
  particulars: z.string().trim().min(1, "Particulars are required").max(2000),
  shipping_address: z.string().trim().max(2000).optional(),
  taken_out_by: z.string().trim().max(200).optional(),
  transporter_name: z.string().trim().max(200).optional(),
  tracking_number: z.string().trim().max(200).optional(),
  delivery_date: z
    .string()
    .optional()
    .refine((v) => !v || isoDatePattern.test(v), "Enter a valid date"),
  confirmed_with: z.string().trim().max(200).optional(),
  shipping_charges: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), "Must be a number"),
  weight_kg: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), "Must be a number"),
  volume_cbm: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), "Must be a number"),
  contact_person: z.string().trim().max(200).optional(),
  contact_number: z.string().trim().max(60).optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email"),
  remarks: z.string().trim().max(2000).optional(),
});

export type ShipmentFormValues = z.infer<typeof shipmentFormSchema>;

/** Converts a DB row into the string-typed shape the form (and its zod resolver) expects. */
export function shipmentToFormValues(shipment: Shipment): ShipmentFormValues {
  return {
    type: shipment.type,
    status: shipment.status,
    company_name: shipment.company_name,
    cost_center_oca: shipment.cost_center_oca ?? "",
    shipment_date: shipment.shipment_date,
    invoice_number: shipment.invoice_number ?? "",
    particulars: shipment.particulars,
    shipping_address: shipment.shipping_address ?? "",
    taken_out_by: shipment.taken_out_by ?? "",
    transporter_name: shipment.transporter_name ?? "",
    tracking_number: shipment.tracking_number ?? "",
    delivery_date: shipment.delivery_date ?? "",
    confirmed_with: shipment.confirmed_with ?? "",
    shipping_charges: shipment.shipping_charges?.toString() ?? "",
    weight_kg: shipment.weight_kg?.toString() ?? "",
    volume_cbm: shipment.volume_cbm?.toString() ?? "",
    contact_person: shipment.contact_person ?? "",
    contact_number: shipment.contact_number ?? "",
    email: shipment.email ?? "",
    remarks: shipment.remarks ?? "",
  };
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toNumberOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export function formValuesToShipmentInsert(values: ShipmentFormValues): ShipmentInsert {
  return {
    type: values.type,
    status: values.status,
    company_name: values.company_name.trim(),
    cost_center_oca: emptyToNull(values.cost_center_oca),
    shipment_date: values.shipment_date,
    invoice_number: emptyToNull(values.invoice_number),
    particulars: values.particulars.trim(),
    shipping_address: emptyToNull(values.shipping_address),
    taken_out_by: emptyToNull(values.taken_out_by),
    transporter_name: emptyToNull(values.transporter_name),
    tracking_number: emptyToNull(values.tracking_number),
    delivery_date: emptyToNull(values.delivery_date),
    confirmed_with: emptyToNull(values.confirmed_with),
    shipping_charges: toNumberOrNull(values.shipping_charges),
    weight_kg: toNumberOrNull(values.weight_kg),
    volume_cbm: toNumberOrNull(values.volume_cbm),
    contact_person: emptyToNull(values.contact_person),
    contact_number: emptyToNull(values.contact_number),
    email: emptyToNull(values.email),
    remarks: emptyToNull(values.remarks),
  };
}

/** Validated on the server before every insert/update, regardless of source (form or import). */
export const shipmentInsertSchema = z.object({
  type: shipmentTypeEnum,
  status: shipmentStatusEnum,
  company_name: z.string().trim().min(1).max(200),
  cost_center_oca: z.string().trim().max(240).nullable(),
  shipment_date: z.string().refine((v) => isoDatePattern.test(v), "Invalid date"),
  invoice_number: z.string().trim().max(120).nullable(),
  particulars: z.string().trim().min(1).max(2000),
  shipping_address: z.string().trim().max(2000).nullable(),
  taken_out_by: z.string().trim().max(200).nullable(),
  transporter_name: z.string().trim().max(200).nullable(),
  tracking_number: z.string().trim().max(200).nullable(),
  delivery_date: z
    .string()
    .nullable()
    .refine((v) => !v || isoDatePattern.test(v), "Invalid date"),
  confirmed_with: z.string().trim().max(200).nullable(),
  shipping_charges: z.number().nonnegative().nullable(),
  weight_kg: z.number().nonnegative().nullable(),
  volume_cbm: z.number().nonnegative().nullable(),
  contact_person: z.string().trim().max(200).nullable(),
  contact_number: z.string().trim().max(60).nullable(),
  email: z.string().trim().max(200).nullable(),
  remarks: z.string().trim().max(2000).nullable(),
});

export const shipmentUpdateSchema = shipmentInsertSchema.partial();
