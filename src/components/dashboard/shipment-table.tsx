"use client";

import type { ReactNode } from "react";
import { STATUS_CONFIG } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getTransitAging, type TransitAging } from "@/lib/transit";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, PhoneCall } from "lucide-react";
import type { Shipment, ShipmentStatus } from "@/lib/types";

export type SortKey = "company" | "shipment_date" | "age";
export type SortDirection = "asc" | "desc";
export type ColumnSort = { key: SortKey; direction: SortDirection };

const headClass =
  "sticky top-0 z-10 border-b border-orange-600 bg-orange-500 px-3 py-2.5 text-left text-xs font-bold whitespace-nowrap text-zinc-950";

const pillClass =
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold whitespace-nowrap tabular-nums";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function StatusPill({ status }: { status: ShipmentStatus }) {
  return <span className={cn(pillClass, STATUS_CONFIG[status].badgeClass)}>{STATUS_CONFIG[status].label}</span>;
}

function TransitAge({ aging }: { aging: TransitAging }) {
  return (
    <span
      title={plural(aging.businessDays, "business day")}
      className={cn(pillClass, aging.pillClass)}
    >
      {plural(aging.calendarDays, "day")}
      {aging.level === "critical" && (
        <>
          <PhoneCall className="size-3" /> Call courier
        </>
      )}
    </span>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: ColumnSort | null;
  onSort: (key: SortKey) => void;
}) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  const ariaSort = !active ? "none" : sort.direction === "asc" ? "ascending" : "descending";

  return (
    <th aria-sort={ariaSort} className={headClass}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 rounded underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950",
          active && "underline"
        )}
      >
        {label}
        <Icon className={cn("size-3", !active && "opacity-60")} />
      </button>
    </th>
  );
}

function Cell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("h-11 px-3 py-1.5 align-middle whitespace-nowrap", className)}>{children}</td>
  );
}

/** A single-line cell value, truncated with the full text on hover. */
function Text({ value, className }: { value: string | null; className?: string }) {
  return (
    <span title={value ?? undefined} className={cn("block truncate", className)}>
      {value ?? "—"}
    </span>
  );
}

export function ShipmentTable({
  shipments,
  todayKey,
  canSortByAge,
  sort,
  onSort,
  activeId,
  pendingIds,
  onOpenDetails,
}: {
  shipments: Shipment[];
  todayKey: string;
  /** False on status tabs where no row can have a transit age. */
  canSortByAge: boolean;
  /** The active column sort, or null while the priority view is on. */
  sort: ColumnSort | null;
  onSort: (key: SortKey) => void;
  activeId: string | null;
  pendingIds: Set<string>;
  onOpenDetails: (shipment: Shipment) => void;
}) {
  if (shipments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Inbox className="size-8 text-muted-foreground" />
        <p className="font-medium">No shipments found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Try adjusting your filters, or add a new shipment to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[calc(100dvh-19rem)] min-h-80 overflow-auto">
      <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <SortHeader label="Date" sortKey="shipment_date" sort={sort} onSort={onSort} />
            <th className={headClass}>OCA No</th>
            <SortHeader label="Name of Customer" sortKey="company" sort={sort} onSort={onSort} />
            <th className={headClass}>Item</th>
            <th className={headClass}>Transporter Name</th>
            <th className={headClass}>Tracking Number</th>
            {canSortByAge ? (
              <SortHeader label="Transit / Status" sortKey="age" sort={sort} onSort={onSort} />
            ) : (
              <th className={headClass}>Transit / Status</th>
            )}
          </tr>
        </thead>
        <tbody>
          {shipments.map((shipment) => {
            const aging = getTransitAging(shipment, todayKey);
            return (
              <tr
                key={shipment.id}
                onClick={() => onOpenDetails(shipment)}
                className={cn(
                  "cursor-pointer transition-colors [&>td]:border-b [&>td]:border-orange-200/60",
                  aging?.rowClass ?? "hover:bg-orange-100/60",
                  shipment.id === activeId && "outline-2 -outline-offset-2 outline-tangerine-600",
                  pendingIds.has(shipment.id) && "pointer-events-none opacity-60"
                )}
              >
                <Cell className="tabular-nums">{formatDate(shipment.shipment_date)}</Cell>
                <Cell className="max-w-40">
                  <Text value={shipment.cost_center_oca} />
                </Cell>
                <Cell className="max-w-72">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetails(shipment);
                    }}
                    title={shipment.company_name}
                    className="focus-tangerine block max-w-full truncate rounded text-left font-semibold text-foreground hover:underline"
                  >
                    {shipment.company_name}
                  </button>
                </Cell>
                <Cell className="max-w-56">
                  <Text value={shipment.particulars} />
                </Cell>
                <Cell className="max-w-48">
                  <Text value={shipment.transporter_name} />
                </Cell>
                <Cell className="max-w-48">
                  <Text value={shipment.tracking_number} className="font-mono text-xs" />
                </Cell>
                <Cell>
                  {aging ? <TransitAge aging={aging} /> : <StatusPill status={shipment.status} />}
                </Cell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
