export type ShipmentType = "INWARD" | "OUTWARD";

export type ShipmentStatus = "PENDING" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

export const SHIPMENT_TYPES: ShipmentType[] = ["INWARD", "OUTWARD"];

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  "PENDING",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

/** Row shape as it comes back from the `shipments` table. */
export interface Shipment {
  id: string;
  type: ShipmentType;
  status: ShipmentStatus;
  company_name: string;
  cost_center_oca: string | null;
  shipment_date: string;
  invoice_number: string | null;
  particulars: string;
  shipping_address: string | null;
  taken_out_by: string | null;
  transporter_name: string | null;
  tracking_number: string | null;
  delivery_date: string | null;
  confirmed_with: string | null;
  shipping_charges: number | null;
  weight_kg: number | null;
  volume_cbm: number | null;
  contact_person: string | null;
  contact_number: string | null;
  email: string | null;
  remarks: string | null;
  carrier_delivery_confirmed: boolean;
  carrier_delivery_confirmed_at: string | null;
  client_receipt_confirmed: boolean;
  client_receipt_confirmed_at: string | null;
  pre_shipping_photos: string[];
  post_delivery_photos: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Acknowledgment/photo fields have DB defaults and aren't set by the create form or the
 * Excel importer, so they're excluded here — see `updateShipmentAcknowledgment` /
 * `updateShipmentPhotos` in `lib/actions.ts` for how they're written after the fact.
 */
export type ShipmentInsert = Omit<
  Shipment,
  | "id"
  | "created_at"
  | "updated_at"
  | "carrier_delivery_confirmed"
  | "carrier_delivery_confirmed_at"
  | "client_receipt_confirmed"
  | "client_receipt_confirmed_at"
  | "pre_shipping_photos"
  | "post_delivery_photos"
>;
export type ShipmentUpdate = Partial<ShipmentInsert>;

export interface ShipmentKpis {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  inwardCount: number;
  outwardCount: number;
  totalShippingCharges: number;
}
