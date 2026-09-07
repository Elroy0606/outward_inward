"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { MotionButton } from "@/components/motion/motion-button";
import { buttonVariants } from "@/components/ui/button";
import { updateShipmentAcknowledgment, updateShipmentPhotos } from "@/lib/actions";
import { uploadShipmentPhoto } from "@/lib/storage";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Truck, UserCheck, CheckCircle2, Loader2, ImagePlus, X, Camera } from "lucide-react";
import type { Shipment } from "@/lib/types";

/** One manual acknowledgment control (armed confirm -> confirmed badge with an undo). */
function AcknowledgmentCard({
  icon: Icon,
  title,
  description,
  confirmed,
  confirmedAt,
  confirmLabel,
  onConfirm,
  onUndo,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  confirmed: boolean;
  confirmedAt: string | null;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onUndo: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick(action: () => Promise<void>) {
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-5">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          confirmed
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        <div className="mt-3">
          {confirmed ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5" />
                Confirmed {formatDateTime(confirmedAt)}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleClick(onUndo)}
                className="focus-tangerine rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
              >
                {pending ? "Undoing..." : "Undo"}
              </button>
            </div>
          ) : (
            <MotionButton
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => handleClick(onConfirm)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="gap-1.5"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {confirmLabel}
            </MotionButton>
          )}
        </div>
      </div>
    </div>
  );
}

/** Upload + thumbnail grid for one photo slot (pre-shipping or post-delivery). */
function PhotoUploadSection({
  title,
  description,
  photos,
  shipmentId,
  kind,
  onSaved,
}: {
  title: string;
  description: string;
  photos: string[];
  shipmentId: string;
  kind: "pre" | "post";
  onSaved?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputId = `shipment-photo-${kind}-${shipmentId}`;

  async function savePhotos(nextPhotos: string[]) {
    const result = await updateShipmentPhotos(
      shipmentId,
      kind === "pre" ? { pre_shipping_photos: nextPhotos } : { post_delivery_photos: nextPhotos }
    );
    if (!result.success) {
      toast.error("Couldn't save photo", { description: result.error });
      return false;
    }
    onSaved?.();
    return true;
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(fileList)) {
        uploaded.push(await uploadShipmentPhoto(file, shipmentId, kind));
      }
      const ok = await savePhotos([...photos, ...uploaded]);
      if (ok) toast.success(uploaded.length > 1 ? "Photos uploaded" : "Photo uploaded");
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(url: string) {
    await savePhotos(photos.filter((p) => p !== url));
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h5 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {title}
          </h5>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Label
          htmlFor={inputId}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0 cursor-pointer gap-1.5",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          Add photo
        </Label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={uploading}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {photos.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border/70 py-6 text-center">
          <Camera className="size-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No photos yet</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((url) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border/70 bg-muted"
            >
              <a href={url} target="_blank" rel="noopener noreferrer" className="block size-full">
                <Image
                  src={url}
                  alt=""
                  fill
                  unoptimized
                  sizes="120px"
                  className="object-cover"
                />
              </a>
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3" />
                <span className="sr-only">Remove photo</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ShipmentAcknowledgmentsTab({
  shipment,
  onSaved,
}: {
  shipment: Shipment;
  onSaved?: () => void;
}) {
  // Defensive: until migration 0005 has been applied, rows selected with `select("*")` simply
  // omit these columns, so they arrive as `undefined` at runtime despite the non-nullable
  // `Shipment` type — without these fallbacks, `photos.length` etc. below throws and the tab
  // renders a client-side error.
  const preShippingPhotos = shipment.pre_shipping_photos ?? [];
  const postDeliveryPhotos = shipment.post_delivery_photos ?? [];
  const carrierDeliveryConfirmed = shipment.carrier_delivery_confirmed ?? false;
  const clientReceiptConfirmed = shipment.client_receipt_confirmed ?? false;

  async function handleAck(input: {
    carrier_delivery_confirmed?: boolean;
    client_receipt_confirmed?: boolean;
  }) {
    const result = await updateShipmentAcknowledgment(shipment.id, input);
    if (!result.success) {
      toast.error("Couldn't update acknowledgment", { description: result.error });
      return;
    }
    toast.success("Acknowledgment updated");
    onSaved?.();
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AcknowledgmentCard
          icon={Truck}
          title="Shipping Company Delivery Acknowledgment"
          description="Manually confirm the carrier has marked this package as delivered."
          confirmed={carrierDeliveryConfirmed}
          confirmedAt={shipment.carrier_delivery_confirmed_at ?? null}
          confirmLabel="Confirm Carrier Delivery"
          onConfirm={() => handleAck({ carrier_delivery_confirmed: true })}
          onUndo={() => handleAck({ carrier_delivery_confirmed: false })}
        />
        <AcknowledgmentCard
          icon={UserCheck}
          title="Client Receipt Acknowledgment"
          description="Confirm the client has received the package, even if the courier hasn't updated its status yet."
          confirmed={clientReceiptConfirmed}
          confirmedAt={shipment.client_receipt_confirmed_at ?? null}
          confirmLabel="Confirm Client Receipt"
          onConfirm={() => handleAck({ client_receipt_confirmed: true })}
          onUndo={() => handleAck({ client_receipt_confirmed: false })}
        />
      </div>

      <section className="rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-5">
        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Camera className="size-3.5" />
          Photo Verification &amp; Proof
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <PhotoUploadSection
            title="Pre-Shipping Photos"
            description="Condition of the items before dispatch."
            photos={preShippingPhotos}
            shipmentId={shipment.id}
            kind="pre"
            onSaved={onSaved}
          />
          <PhotoUploadSection
            title="Post-Delivery / Receipt Photos"
            description="Proof of arrival from the courier or client."
            photos={postDeliveryPhotos}
            shipmentId={shipment.id}
            kind="post"
            onSaved={onSaved}
          />
        </div>
      </section>
    </div>
  );
}
