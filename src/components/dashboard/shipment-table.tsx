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

/**
 * Layout tiers: phone strips below `md`, a 5-column table from `md` to `lg`, and the 7-column
 * table from `lg`. Below 1440px (where long values could otherwise exceed the screen), the
 * table uses fixed columns so tablets in either orientation never scroll sideways.
 */
const headClass =
  "sticky top-0 z-10 border-b border-orange-600 bg-orange-500 px-3 py-2.5 text-left text-xs font-bold whitespace-nowrap text-zinc-950 max-[1146px]:px-2";

const DATE_COLUMN = "hidden lg:table-cell max-[1440px]:w-28";
const OCA_COLUMN = "max-[1440px]:w-32";
const TRACKING_COLUMN = "hidden lg:table-cell max-[1440px]:w-28";
const STATUS_COLUMN = "max-[1440px]:w-44";

const pillClass =
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold whitespace-nowrap tabular-nums";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function StatusPill({ status }: { status: ShipmentStatus }) {
  return <span className={cn(pillClass, STATUS_CONFIG[status].badgeClass)}>{STATUS_CONFIG[status].label}</span>;
}

function TransitAge({ aging, compact = false }: { aging: TransitAging; compact?: boolean }) {
  const critical = aging.level === "critical";
  return (
    <span
      title={plural(aging.businessDays, "business day")}
      className={cn(pillClass, aging.pillClass)}
    >
      {compact && critical ? `${aging.calendarDays}d •` : plural(aging.calendarDays, "day")}
      {critical && (
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
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: ColumnSort | null;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  const ariaSort = !active ? "none" : sort.direction === "asc" ? "ascending" : "descending";

  return (
    <th aria-sort={ariaSort} className={cn(headClass, className)}>
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
    <td className={cn("h-11 px-3 py-1.5 align-middle whitespace-nowrap max-[1146px]:px-2", className)}>
      {children}
    </td>
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

/** Phone layout: two-line rows that open the same details dialog as the table. */
function ShipmentStrips({
  shipments,
  todayKey,
  activeId,
  pendingIds,
  onOpenDetails,
}: {
  shipments: Shipment[];
  todayKey: string;
  activeId: string | null;
  pendingIds: Set<string>;
  onOpenDetails: (shipment: Shipment) => void;
}) {
  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between gap-3 border-b border-orange-200 bg-orange-100/70 px-3 py-1.5 text-xs font-bold text-orange-900">
        <span>OCA No / Customer</span>
        <span>Transit / Status</span>
      </div>
      <ul className="divide-y divide-orange-100">
        {shipments.map((shipment) => {
          const aging = getTransitAging(shipment, todayKey);
          return (
            <li key={shipment.id}>
              <button
                type="button"
                onClick={() => onOpenDetails(shipment)}
                disabled={pendingIds.has(shipment.id)}
                className={cn(
                  "focus-tangerine block w-full space-y-1 px-3 py-2 text-left transition-colors disabled:opacity-60",
                  aging?.rowClass ?? "hover:bg-orange-100/60",
                  shipment.id === activeId && "outline-2 -outline-offset-2 outline-tangerine-600"
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-baseline gap-1.5 text-sm">
                    {shipment.cost_center_oca && (
                      <span className="max-w-[45%] shrink-0 truncate font-bold">
                        {shipment.cost_center_oca}
                      </span>
                    )}
                    <span className="min-w-0 truncate font-semibold">{shipment.company_name}</span>
                  </span>
                  <span className="shrink-0">
                    {aging ? (
                      <TransitAge aging={aging} compact />
                    ) : (
                      <StatusPill status={shipment.status} />
                    )}
                  </span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">{shipment.particulars}</span>
                  {shipment.transporter_name && (
                    <>
                      <span aria-hidden className="shrink-0">•</span>
                      <span className="max-w-[35%] shrink-0 truncate">{shipment.transporter_name}</span>
                    </>
                  )}
                  <span aria-hidden className="shrink-0">•</span>
                  <span className="shrink-0 tabular-nums">{formatDate(shipment.shipment_date)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
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
    <>
    <ShipmentStrips
      shipments={shipments}
      todayKey={todayKey}
      activeId={activeId}
      pendingIds={pendingIds}
      onOpenDetails={onOpenDetails}
    />
    <div className="hidden max-h-[calc(100dvh-19rem)] min-h-80 overflow-auto md:block">
      <table className="w-full border-separate border-spacing-0 text-sm max-[1440px]:table-fixed min-[1440px]:min-w-[1080px]">
        <thead>
          <tr>
            <SortHeader
              label="Date"
              sortKey="shipment_date"
              sort={sort}
              onSort={onSort}
              className={DATE_COLUMN}
            />
            <th className={cn(headClass, OCA_COLUMN)}>OCA No</th>
            <SortHeader label="Name of Customer" sortKey="company" sort={sort} onSort={onSort} />
            <th className={headClass}>Item</th>
            <th className={headClass}>Transporter Name</th>
            <th className={cn(headClass, TRACKING_COLUMN)}>Tracking Number</th>
            {canSortByAge ? (
              <SortHeader
                label="Transit / Status"
                sortKey="age"
                sort={sort}
                onSort={onSort}
                className={STATUS_COLUMN}
              />
            ) : (
              <th className={cn(headClass, STATUS_COLUMN)}>Transit / Status</th>
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
                <Cell className="hidden tabular-nums lg:table-cell">
                  {formatDate(shipment.shipment_date)}
                </Cell>
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
                <Cell className="hidden max-w-48 lg:table-cell">
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
    </>
  );
}
