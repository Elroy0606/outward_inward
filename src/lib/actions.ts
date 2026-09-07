"use server";

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
