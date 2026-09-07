"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteShipment } from "@/lib/actions";
import type { Shipment } from "@/lib/types";

export function DeleteShipmentDialog({
  shipment,
  open,
  onOpenChange,
  onDeleted,
}: {
  shipment: Shipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!shipment) return;
    startTransition(async () => {
      const result = await deleteShipment(shipment.id);
      if (!result.success) {
        toast.error("Couldn't delete shipment", { description: result.error });
        return;
      }
      toast.success("Shipment deleted", { description: shipment.company_name });
      onOpenChange(false);
      onDeleted();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this shipment?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the record for{" "}
            <span className="font-medium text-foreground">{shipment?.company_name}</span> (
            {shipment?.particulars}). This action can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
