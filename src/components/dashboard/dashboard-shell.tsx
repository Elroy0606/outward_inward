"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeTabs } from "@/components/dashboard/type-tabs";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { StatusTabs, type StatusFilter } from "@/components/dashboard/status-tabs";
import {
  ShipmentTable,
  type ColumnSort,
  type SortDirection,
  type SortKey,
} from "@/components/dashboard/shipment-table";
import { ShipmentDetailsDialog } from "@/components/dashboard/shipment-details-dialog";
import { ShipmentFormDialog } from "@/components/dashboard/shipment-form-dialog";
import { UploadSheet } from "@/components/dashboard/upload-sheet";
import { DeleteShipmentDialog } from "@/components/dashboard/delete-shipment-dialog";
import { updateShipmentStatus } from "@/lib/actions";
import { exportRowsToCsv } from "@/lib/excel-parser";
import { getTodayKey, getTransitAging, getTransitStartKey } from "@/lib/transit";
import { cn } from "@/lib/utils";
import type { Shipment, ShipmentStatus, ShipmentType } from "@/lib/types";

const PAGE_SIZE = 50;
const DEFAULT_COLUMN_SORT: ColumnSort = { key: "shipment_date", direction: "desc" };

/** Keeps the date current in a tab left open past midnight. */
function subscribeToMinuteTick(onTick: () => void) {
  const interval = setInterval(onTick, 60_000);
  return () => clearInterval(interval);
}

/** Compares nullable strings, always placing empty values last. */
function compareNullable(a: string | null, b: string | null, direction: SortDirection) {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const result = a.localeCompare(b, undefined, { sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

/** In Transit first and oldest first, then everything else newest first. */
function comparePriority(a: Shipment, b: Shipment) {
  return (
    compareNullable(getTransitStartKey(a), getTransitStartKey(b), "asc") ||
    compareNullable(a.shipment_date, b.shipment_date, "desc")
  );
}

function compareColumn(a: Shipment, b: Shipment, { key, direction }: ColumnSort) {
  switch (key) {
    case "company":
      return compareNullable(a.company_name, b.company_name, direction);
    case "age":
      // Longest in transit means the earliest date, so the direction is inverted.
      return compareNullable(
        getTransitStartKey(a),
        getTransitStartKey(b),
        direction === "desc" ? "asc" : "desc"
      );
    default:
      return compareNullable(a.shipment_date, b.shipment_date, direction);
  }
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
  const todayKey = useSyncExternalStore(subscribeToMinuteTick, getTodayKey, getTodayKey);
  const [activeType, setActiveType] = useState<ShipmentType>("OUTWARD");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  // null means the priority view (oldest In Transit first) is on.
  const [columnSort, setColumnSort] = useState<ColumnSort | null>(null);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shipment | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const canSortByAge = statusFilter === "ALL" || statusFilter === "IN_TRANSIT";
  // Other tabs have no transit ages, so an age sort falls back to newest first there.
  const effectiveSort =
    columnSort?.key === "age" && !canSortByAge ? DEFAULT_COLUMN_SORT : columnSort;

  const typeShipments = useMemo(
    () => initialShipments.filter((s) => s.type === activeType),
    [initialShipments, activeType]
  );

  const { statusCounts, warningCount, criticalCount } = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      ALL: typeShipments.length,
      PENDING: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    let warning = 0;
    let critical = 0;
    for (const shipment of typeShipments) {
      counts[shipment.status] += 1;
      const level = getTransitAging(shipment, todayKey)?.level;
      if (level === "warning") warning += 1;
      if (level === "critical") critical += 1;
    }
    return { statusCounts: counts, warningCount: warning, criticalCount: critical };
  }, [typeShipments, todayKey]);

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = typeShipments.filter((s) => {
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
    return matches.sort((a, b) =>
      effectiveSort ? compareColumn(a, b, effectiveSort) : comparePriority(a, b)
    );
  }, [typeShipments, statusFilter, search, effectiveSort]);

  const pageCount = Math.max(1, Math.ceil(filteredShipments.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageShipments = filteredShipments.slice(pageStart, pageStart + PAGE_SIZE);

  // Looked up from live data so an open dialog reflects saves and status changes.
  const detailsShipment = initialShipments.find((s) => s.id === activeId) ?? null;

  function refresh() {
    router.refresh();
  }

  function handleTypeChange(type: ShipmentType) {
    setActiveType(type);
    setPage(1);
  }

  function handleStatusFilterChange(status: StatusFilter) {
    setStatusFilter(status);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSort(key: SortKey) {
    setPage(1);
    setColumnSort((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: key === "company" ? "asc" : "desc" };
    });
  }

  function handleTogglePriority() {
    setPage(1);
    setColumnSort((current) => (current ? null : DEFAULT_COLUMN_SORT));
  }

  function handleOpenDetails(shipment: Shipment) {
    setActiveId(shipment.id);
    setDetailsOpen(true);
  }

  function handleAdd() {
    setFormOpen(true);
  }

  function handleDelete(shipment: Shipment) {
    setDetailsOpen(false);
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
    <div className="w-full min-w-0 space-y-4">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <TypeTabs
          value={activeType}
          onChange={handleTypeChange}
          counts={{
            INWARD: initialShipments.filter((s) => s.type === "INWARD").length,
            OUTWARD: initialShipments.filter((s) => s.type === "OUTWARD").length,
          }}
        />
        <FiltersBar
          search={search}
          onSearchChange={handleSearchChange}
          onAdd={handleAdd}
          onImport={() => setUploadOpen(true)}
          onExport={handleExport}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-orange-200/70 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:border-slate-700/50 dark:bg-slate-900">
        <div className="flex min-w-0 flex-col items-start gap-2 border-b p-2 md:flex-row md:items-center md:justify-between">
          <StatusTabs
            value={statusFilter}
            onChange={handleStatusFilterChange}
            counts={statusCounts}
            warningCount={warningCount}
            criticalCount={criticalCount}
          />
          {canSortByAge && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={columnSort === null}
              onClick={handleTogglePriority}
              className={cn(
                "shrink-0 gap-1.5",
                columnSort === null &&
                  "border-tangerine-400 bg-tangerine-50 text-tangerine-800 hover:bg-tangerine-100 dark:bg-tangerine-950/50 dark:text-tangerine-300"
              )}
            >
              <Flame className="size-3.5" /> Oldest in transit first
            </Button>
          )}
        </div>

        <ShipmentTable
          shipments={pageShipments}
          todayKey={todayKey}
          canSortByAge={canSortByAge}
          sort={effectiveSort}
          onSort={handleSort}
          activeId={activeId}
          pendingIds={pendingIds}
          onOpenDetails={handleOpenDetails}
        />

        {filteredShipments.length > 0 && (
          <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {pageStart + 1}–{pageStart + pageShipments.length} of {filteredShipments.length}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous page"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="tabular-nums">
                  Page {currentPage} of {pageCount}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next page"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {detailsShipment && (
        <ShipmentDetailsDialog
          key={detailsShipment.id}
          shipment={detailsShipment}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onSaved={refresh}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      <ShipmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        shipment={null}
        defaultType={activeType}
        onSaved={refresh}
        history={initialShipments}
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
