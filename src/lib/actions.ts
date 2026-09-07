"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { shipmentInsertSchema, shipmentUpdateSchema } from "@/lib/validations";
import type { Shipment, ShipmentInsert, ShipmentStatus, ShipmentUpdate } from "@/lib/types";

export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

const BULK_INSERT_CHUNK_SIZE = 250;

export async function createShipment(input: ShipmentInsert): Promise<ActionResult<Shipment>> {
  const parsed = shipmentInsertSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipments")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true, data: data as Shipment };
}

export async function updateShipment(
  id: string,
  input: ShipmentUpdate
): Promise<ActionResult<Shipment>> {
  const parsed = shipmentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipments")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true, data: data as Shipment };
}

export async function updateShipmentStatus(
  id: string,
  status: ShipmentStatus
): Promise<ActionResult<Shipment>> {
  return updateShipment(id, { status });
}

export async function deleteShipment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("shipments").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true };
}

const acknowledgmentInputSchema = z
  .object({
    carrier_delivery_confirmed: z.boolean().optional(),
    client_receipt_confirmed: z.boolean().optional(),
  })
  .refine(
    (v) => v.carrier_delivery_confirmed !== undefined || v.client_receipt_confirmed !== undefined,
    "Nothing to update"
  );

/** Sets a manual carrier-delivery and/or client-receipt acknowledgment, stamping the change time. */
export async function updateShipmentAcknowledgment(
  id: string,
  input: { carrier_delivery_confirmed?: boolean; client_receipt_confirmed?: boolean }
): Promise<ActionResult<Shipment>> {
  const parsed = acknowledgmentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const payload: Record<string, boolean | string | null> = {};
  if (parsed.data.carrier_delivery_confirmed !== undefined) {
    payload.carrier_delivery_confirmed = parsed.data.carrier_delivery_confirmed;
    payload.carrier_delivery_confirmed_at = parsed.data.carrier_delivery_confirmed
      ? new Date().toISOString()
      : null;
  }
  if (parsed.data.client_receipt_confirmed !== undefined) {
    payload.client_receipt_confirmed = parsed.data.client_receipt_confirmed;
    payload.client_receipt_confirmed_at = parsed.data.client_receipt_confirmed
      ? new Date().toISOString()
      : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipments")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true, data: data as Shipment };
}

const photosInputSchema = z.object({
  pre_shipping_photos: z.array(z.string().url()).optional(),
  post_delivery_photos: z.array(z.string().url()).optional(),
});

/** Replaces the pre-shipping and/or post-delivery photo URL list for a shipment. */
export async function updateShipmentPhotos(
  id: string,
  input: { pre_shipping_photos?: string[]; post_delivery_photos?: string[] }
): Promise<ActionResult<Shipment>> {
  const parsed = photosInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipments")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true, data: data as Shipment };
}

export async function bulkInsertShipments(
  rows: ShipmentInsert[]
): Promise<ActionResult<{ insertedCount: number }>> {
  if (rows.length === 0) {
    return { success: false, error: "No rows to import." };
  }

  const parsedRows: ShipmentInsert[] = [];
  for (const row of rows) {
    const parsed = shipmentInsertSchema.safeParse(row);
    if (!parsed.success) {
      return {
        success: false,
        error: `One or more rows failed validation: ${parsed.error.issues[0]?.message}`,
      };
    }
    parsedRows.push(parsed.data);
  }

  const supabase = await createClient();
  let insertedCount = 0;

  for (let i = 0; i < parsedRows.length; i += BULK_INSERT_CHUNK_SIZE) {
    const chunk = parsedRows.slice(i, i + BULK_INSERT_CHUNK_SIZE);
    const { error, count } = await supabase
      .from("shipments")
      .insert(chunk, { count: "exact" });

    if (error) {
      return {
        success: false,
        error: `Inserted ${insertedCount} row(s) before failing: ${error.message}`,
      };
    }
    insertedCount += count ?? chunk.length;
  }

  revalidatePath("/");
  return { success: true, data: { insertedCount } };
}
