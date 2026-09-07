"use client";

import { motion } from "framer-motion";
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, SHIPMENT_STATUSES } from "@/lib/constants";
import { Package, IndianRupee } from "lucide-react";
import type { Shipment, ShipmentKpis, ShipmentStatus } from "@/lib/types";

const DAYS = 14;
// Mirrors --color-tangerine-500 in globals.css — passed directly rather than via
// var(--color-tangerine-500), since SVG presentation attributes resolve CSS custom
// properties inconsistently across browsers.
const TANGERINE = "oklch(0.705 0.213 47.604)";
const TANGERINE_SOFT = "oklch(0.705 0.213 47.604 / 0.25)";

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Formats a recharts tooltip label (a `date` bucket key) as "12 Sep". */
function formatDayLabel(label: unknown): string {
  const str = String(label ?? "");
  const d = new Date(`${str}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? str
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** Buckets shipments by shipment_date into the last `DAYS` calendar days, zero-filled. */
function buildDailySeries(shipments: Shipment[]) {
  const counts = new Map<string, { count: number; charges: number }>();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    counts.set(dayKey(d), { count: 0, charges: 0 });
  }

  for (const s of shipments) {
    if (!s.shipment_date) continue;
    const bucket = counts.get(s.shipment_date);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.charges += s.shipping_charges ?? 0;
  }

  return Array.from(counts.entries()).map(([date, v]) => ({ date, ...v }));
}

function SidebarPanel({
  title,
  index,
  children,
}: {
  title: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
      className="glass-card rounded-2xl p-4"
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </motion.div>
  );
}

function StatusBreakdown({ kpis }: { kpis: ShipmentKpis }) {
  const counts: Record<ShipmentStatus, number> = {
    PENDING: kpis.pending,
    IN_TRANSIT: kpis.inTransit,
    DELIVERED: kpis.delivered,
    CANCELLED: kpis.cancelled,
  };
  const total = Math.max(kpis.total, 1);

  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {SHIPMENT_STATUSES.map((status) =>
          counts[status] > 0 ? (
            <div
              key={status}
              className={STATUS_CONFIG[status].dotClass}
              style={{ width: `${(counts[status] / total) * 100}%` }}
            />
          ) : null
        )}
      </div>
      <ul className="space-y-1.5">
        {SHIPMENT_STATUSES.map((status) => (
          <li key={status} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", STATUS_CONFIG[status].dotClass)} />
              {STATUS_CONFIG[status].label}
            </span>
            <span className="font-medium tabular-nums text-foreground">{counts[status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KpiSidebar({
  kpis,
  shipments,
  className,
}: {
  kpis: ShipmentKpis;
  shipments: Shipment[];
  className?: string;
}) {
  const series = buildDailySeries(shipments);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <SidebarPanel title="Shipment Overview" index={0}>
        <div className="mt-1 flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tangerine-100 text-tangerine-700 dark:bg-tangerine-950 dark:text-tangerine-300">
            <Package className="size-4.5" />
          </div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{kpis.total}</p>
          <span className="text-xs text-muted-foreground">total shipments</span>
        </div>
        <StatusBreakdown kpis={kpis} />
      </SidebarPanel>

      <SidebarPanel title={`Shipment Volume — Last ${DAYS} Days`} index={1}>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{kpis.total}</p>
        <div className="mt-2 h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="kpiVolumeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TANGERINE} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={TANGERINE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={false}
                contentStyle={{
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                  padding: "0.375rem 0.5rem",
                }}
                labelFormatter={formatDayLabel}
                formatter={(value: unknown) => [Number(value) || 0, "Shipments"] as [number, string]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={TANGERINE}
                strokeWidth={2}
                fill="url(#kpiVolumeFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SidebarPanel>

      <SidebarPanel title={`Shipping Charges — Last ${DAYS} Days`} index={2}>
        <div className="mt-1 flex items-center gap-2">
          <IndianRupee className="size-4 text-tangerine-600 dark:text-tangerine-400" />
          <p className="text-xl font-semibold tabular-nums text-foreground">
            {formatCurrency(kpis.totalShippingCharges)}
          </p>
        </div>
        <div className="mt-2 h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <Tooltip
                cursor={{ stroke: TANGERINE_SOFT, strokeWidth: 8 }}
                contentStyle={{
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                  padding: "0.375rem 0.5rem",
                }}
                labelFormatter={formatDayLabel}
                formatter={(value: unknown) =>
                  [formatCurrency(Number(value) || 0), "Charges"] as [string, string]
                }
              />
              <Line
                type="monotone"
                dataKey="charges"
                stroke={TANGERINE}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SidebarPanel>
    </div>
  );
}
