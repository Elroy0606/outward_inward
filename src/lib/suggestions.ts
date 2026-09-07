import type { Shipment } from "@/lib/types";

/**
 * Field-level autocomplete suggestions, built from past shipments so the user retypes
 * as little as possible for repeat companies/transporters/contacts. Sorted most-recently
 * used first (by `created_at`), deduped case-insensitively while keeping the casing of
 * the most recent entry.
 */
export function buildFieldSuggestions(
  shipments: Shipment[],
  field: keyof Pick<
    Shipment,
    | "company_name"
    | "cost_center_oca"
    | "shipping_address"
    | "taken_out_by"
    | "transporter_name"
    | "confirmed_with"
    | "contact_person"
    | "contact_number"
    | "email"
  >,
  limit = 25
): string[] {
  const sorted = [...shipments].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const seen = new Set<string>();
  const values: string[] = [];
  for (const shipment of sorted) {
    const raw = shipment[field];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
    if (values.length >= limit) break;
  }
  return values;
}

/**
 * The most recently created shipment for a given company (optionally narrowed to one
 * shipment direction), used to auto-fill address/contact/transporter fields when the
 * user re-enters a company they've shipped with before.
 */
export function findLatestShipmentForCompany(
  shipments: Shipment[],
  companyName: string,
  type?: Shipment["type"]
): Shipment | null {
  const target = companyName.trim().toLowerCase();
  if (!target) return null;
  let latest: Shipment | null = null;
  for (const shipment of shipments) {
    if (shipment.company_name.trim().toLowerCase() !== target) continue;
    if (type && shipment.type !== type) continue;
    if (!latest || shipment.created_at > latest.created_at) latest = shipment;
  }
  if (!latest && type) return findLatestShipmentForCompany(shipments, companyName);
  return latest;
}
