"use client";

import { useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteShipment } from "@/lib/actions";
import { DELETION_REASONS } from "@/lib/constants";
import type { Shipment } from "@/lib/types";
import { Loader2 } from "lucide-react";

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
  const [reasonCategory, setReasonCategory] = useState("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  // Every deletion needs a fresh, explicit reason — never carry one over from a previously
  // deleted shipment. Reset during render (React's "adjusting state on prop change" pattern)
  // rather than in an effect, since this is purely derived from the `open` prop transition.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReasonCategory("");
      setReasonDetails("");
      setShowValidation(false);
    }
  }

  const trimmedDetails = reasonDetails.trim();
  const isReasonValid = reasonCategory !== "" && trimmedDetails.length >= 3;

  function handleDelete(event: React.MouseEvent) {
    // `AlertDialogAction` auto-closes the dialog on click (it wraps Radix's `Dialog.Close`) —
    // prevent that here so the dialog stays open until the reason is valid and the delete
    // actually succeeds.
    event.preventDefault();
    if (!shipment) return;

    if (!isReasonValid) {
      setShowValidation(true);
      return;
    }

    startTransition(async () => {
      const result = await deleteShipment(shipment.id, `${reasonCategory}: ${trimmedDetails}`);
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
            {shipment?.particulars}). This action can&apos;t be undone — a snapshot of the record
            and your reason are kept in the deletion audit log.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-left">
          <div>
            <Label htmlFor="delete_reason_category" className="mb-1.5">
              Reason for deletion
            </Label>
            <Select
              value={reasonCategory}
              onValueChange={(value) => {
                setReasonCategory(value);
                setShowValidation(false);
              }}
            >
              <SelectTrigger id="delete_reason_category" className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DELETION_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showValidation && reasonCategory === "" && (
              <p className="mt-1 text-xs text-destructive">Select a reason.</p>
            )}
          </div>
          <div>
            <Label htmlFor="delete_reason_details" className="mb-1.5">
              Details
            </Label>
            <Textarea
              id="delete_reason_details"
              rows={2}
              value={reasonDetails}
              onChange={(e) => {
                setReasonDetails(e.target.value);
                setShowValidation(false);
              }}
            />
            {showValidation && trimmedDetails.length < 3 && (
              <p className="mt-1 text-xs text-destructive">
                Add a few words explaining why this is being deleted.
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={handleDelete}
            className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
