"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KpiSidebar } from "@/components/dashboard/kpi-sidebar";
import { TypeTabs } from "@/components/dashboard/type-tabs";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { ShipmentCardGrid } from "@/components/dashboard/shipment-card-grid";
import { ShipmentFormDialog } from "@/components/dashboard/shipment-form-dialog";
import { UploadSheet } from "@/components/dashboard/upload-sheet";
import { DeleteShipmentDialog } from "@/components/dashboard/delete-shipment-dialog";
import { updateShipmentStatus } from "@/lib/actions";
import { exportRowsToCsv } from "@/lib/excel-parser";
import type { Shipment, ShipmentKpis, ShipmentStatus, ShipmentType } from "@/lib/types";

function computeKpis(shipments: Shipment[]): ShipmentKpis {
  return shipments.reduce<ShipmentKpis>(
    (acc, s) => {
      acc.total += 1;
      if (s.status === "PENDING") acc.pending += 1;
      if (s.status === "IN_TRANSIT") acc.inTransit += 1;
      if (s.status === "DELIVERED") acc.delivered += 1;
      if (s.status === "CANCELLED") acc.cancelled += 1;
      if (s.type === "INWARD") acc.inwardCount += 1;
      if (s.type === "OUTWARD") acc.outwardCount += 1;
      acc.totalShippingCharges += s.shipping_charges ?? 0;
      return acc;
    },
    {
      total: 0,
      pending: 0,
      inTransit: 0,
      delivered: 0,
      cancelled: 0,
      inwardCount: 0,
      outwardCount: 0,
      totalShippingCharges: 0,
    }
  );
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function DashboardShell({ initialShipments }: { initialShipments: Shipment[] }) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<ShipmentType>("INWARD");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "ALL">("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shipment | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const typeShipments = useMemo(
    () => initialShipments.filter((s) => s.type === activeType),
    [initialShipments, activeType]
  );

  const kpis = useMemo(() => computeKpis(typeShipments), [typeShipments]);

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return typeShipments.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (!query) return true;
      return [
        s.company_name,
        s.particulars,
        s.tracking_number,
        s.invoice_number,
        s.cost_center_oca,
        s.transporter_name,
        s.contact_person,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query));
    });
  }, [typeShipments, statusFilter, search]);

  function refresh() {
    router.refresh();
  }

  function handleAdd() {
    setEditingShipment(null);
    setFormOpen(true);
  }

  function handleEdit(shipment: Shipment) {
    setEditingShipment(shipment);
    setFormOpen(true);
  }

  function handleDelete(shipment: Shipment) {
    setDeleteTarget(shipment);
    setDeleteOpen(true);
  }

  async function handleStatusChange(shipment: Shipment, status: ShipmentStatus): Promise<boolean> {
    if (shipment.status === status) return false;
    setPendingIds((prev) => new Set(prev).add(shipment.id));
    const result = await updateShipmentStatus(shipment.id, status);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(shipment.id);
      return next;
    });
    if (!result.success) {
      toast.error("Couldn't update status", { description: result.error });
      return false;
    }
    toast.success(`Status updated to ${status.replace("_", " ").toLowerCase()}`);
    refresh();
    return true;
  }

  function handleExport() {
    if (filteredShipments.length === 0) {
      toast.info("Nothing to export", { description: "Adjust your filters first." });
      return;
    }
    const csv = exportRowsToCsv(filteredShipments);
    downloadCsv(csv, `${activeType.toLowerCase()}-shipments-${Date.now()}.csv`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <TypeTabs
          value={activeType}
          onChange={setActiveType}
          counts={{
            INWARD: initialShipments.filter((s) => s.type === "INWARD").length,
            OUTWARD: initialShipments.filter((s) => s.type === "OUTWARD").length,
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="glass-card rounded-2xl p-3">
            <FiltersBar
              search={search}
              onSearchChange={setSearch}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              onAdd={handleAdd}
              onImport={() => setUploadOpen(true)}
              onExport={handleExport}
            />
          </div>

          <ShipmentCardGrid
            shipments={filteredShipments}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onSaved={refresh}
            pendingIds={pendingIds}
            stackKey={`${activeType}-${statusFilter}`}
          />
        </div>

        <KpiSidebar
          kpis={kpis}
          shipments={typeShipments}
          className="order-first xl:sticky xl:top-24 xl:order-none xl:self-start"
        />
      </div>

      <ShipmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        shipment={editingShipment}
        defaultType={activeType}
        onSaved={refresh}
      />

      <UploadSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultType={activeType}
        onImported={refresh}
      />

      <DeleteShipmentDialog
        shipment={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={refresh}
      />
    </div>
  );
}
