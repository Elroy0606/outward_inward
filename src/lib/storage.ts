import { createClient } from "@/lib/supabase/client";

const SHIPMENT_PHOTOS_BUCKET = "shipment-photos";

/** Uploads one shipment proof photo from a Client Component and returns its public URL. */
export async function uploadShipmentPhoto(
  file: File,
  shipmentId: string,
  kind: "pre" | "post"
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${shipmentId}/${kind}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error } = await supabase.storage.from(SHIPMENT_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(SHIPMENT_PHOTOS_BUCKET).getPublicUrl(path);
  return publicUrl;
}
