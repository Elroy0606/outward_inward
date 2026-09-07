"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShipmentCard, cardGridVariants } from "@/components/dashboard/shipment-card";
import { Inbox } from "lucide-react";
import type { Shipment, ShipmentStatus } from "@/lib/types";

export function ShipmentCardGrid({
  shipments,
  onEdit,
  onDelete,
  onStatusChange,
  pendingIds,
  stackKey,
}: {
  shipments: Shipment[];
  onEdit: (shipment: Shipment) => void;
  onDelete: (shipment: Shipment) => void;
  onStatusChange: (shipment: Shipment, status: ShipmentStatus) => Promise<boolean>;
  pendingIds: Set<string>;
  /** Changing this replays the staggered entrance (e.g. on tab switch or status filter change). */
  stackKey: string;
}) {
  // Tracks the most recently viewed card so its highlight ring persists after the
  // details modal closes — only one card is "active" at a time.
  const [activeId, setActiveId] = useState<string | null>(null);

  if (shipments.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center gap-2 rounded-2xl border-dashed py-16 text-center">
        <Inbox className="size-8 text-muted-foreground" />
        <p className="font-medium">No shipments found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Try adjusting your filters, or add a new shipment to get started.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={stackKey}
      variants={cardGridVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3"
    >
      {/* `initial` defaults to true here on purpose: each `stackKey` change remounts this
          AnimatePresence instance, and we want that fresh batch of cards to play the
          staggered hidden->show entrance (inherited from the parent's variants) rather
          than snapping straight to their end state. */}
      <AnimatePresence mode="popLayout">
        {shipments.map((shipment) => (
          <ShipmentCard
            key={shipment.id}
            shipment={shipment}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            isPending={pendingIds.has(shipment.id)}
            isActive={shipment.id === activeId}
            onOpenDetails={() => setActiveId(shipment.id)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
