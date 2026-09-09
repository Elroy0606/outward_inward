import { SHIPMENT_STATUSES, SHIPMENT_TYPES, type ShipmentStatus, type ShipmentType } from "@/lib/types";

export { SHIPMENT_STATUSES, SHIPMENT_TYPES };

/**
 * Maps the company's exact Excel/CSV header names to `shipments` columns.
 * Keys are normalized with `normalizeHeader()` before lookup, so casing,
 * punctuation, and stray whitespace in the source file don't matter.
 * "Sr.No" (and other row-counter variants) is intentionally omitted —
 * the database generates its own `id`.
 */
export const EXCEL_COLUMN_MAP: Record<string, string> = {
  "company name": "company_name",
  "cost center": "cost_center_oca",
  "oca no": "cost_center_oca",
  date: "shipment_date",
  "invoce no": "invoice_number", // matches source sheet's spelling
  "invoice no": "invoice_number",
  "particular sent": "particulars",
  "shipped addres": "shipping_address",
  "shipped address": "shipping_address",
  "goods taken out by": "taken_out_by",
  "transporter name": "transporter_name",
  "tracking no": "tracking_number",
  "delivery date": "delivery_date",
  "delivery confirmed with": "confirmed_with",
  "shiping charges": "shipping_charges",
  "shipping charges": "shipping_charges",
  "weight of material": "weight_kg",
  "volume of material": "volume_cbm",
  "contact person": "contact_person",
  "contact number": "contact_number",
  "email id": "email",
  email: "email",
  remark: "remarks",
  remarks: "remarks",
};

/** Header keys that are always ignored, even if present in the source file. */
export const IGNORED_HEADERS = new Set(["sr no", "srno", "sr", "s no", "sl no"]);

export const REQUIRED_IMPORT_FIELDS = ["company_name", "shipment_date", "particulars"] as const;

export const NUMERIC_FIELDS = new Set(["shipping_charges", "weight_kg", "volume_cbm"]);
export const DATE_FIELDS = new Set(["shipment_date", "delivery_date"]);

export const STATUS_CONFIG: Record<
  ShipmentStatus,
  {
    label: string;
    /** Tinted badge used in read-only contexts (e.g. import preview). */
    badgeClass: string;
    /** Small status dot color. */
    dotClass: string;
    /** Colored ambient glow ring around the status badge on shipment cards. */
    glowClass: string;
    /** Vivid, high-contrast button style for the status popover's option list. */
    solidClass: string;
  }
> = {
  PENDING: {
    label: "Pending",
    badgeClass: "bg-status-pending text-status-pending-foreground border-transparent",
    dotClass: "bg-tangerine-500",
    glowClass: "status-glow-pending",
    solidClass: "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400",
  },
  IN_TRANSIT: {
    label: "In Transit",
    badgeClass: "bg-status-transit text-status-transit-foreground border-transparent",
    dotClass: "bg-sky-500",
    glowClass: "status-glow-transit",
    solidClass: "bg-sky-500 text-white hover:bg-sky-600 focus-visible:ring-sky-400",
  },
  DELIVERED: {
    label: "Delivered",
    badgeClass: "bg-status-delivered text-status-delivered-foreground border-transparent",
    dotClass: "bg-emerald-500",
    glowClass: "status-glow-delivered",
    solidClass: "bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-400",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-status-cancelled text-status-cancelled-foreground border-transparent",
    dotClass: "bg-rose-500",
    glowClass: "status-glow-cancelled",
    solidClass: "bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-400",
  },
};

/** Quick-pick categories shown in the delete confirmation dialog's reason dropdown. */
export const DELETION_REASONS = [
  "Duplicate entry",
  "Data entry error",
  "Shipment cancelled",
  "Customer/supplier request",
  "Other",
] as const;

export const TYPE_CONFIG: Record<ShipmentType, { label: string; description: string }> = {
  INWARD: {
    label: "Inward Shipments",
    description: "Goods being received from suppliers",
  },
  OUTWARD: {
    label: "Outward Shipments",
    description: "Goods being shipped out to customers/destinations",
  },
};
