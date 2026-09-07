"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/motion/motion-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_CONFIG, SHIPMENT_STATUSES } from "@/lib/constants";
import { Search, Plus, UploadCloud, Download } from "lucide-react";
import type { ShipmentStatus } from "@/lib/types";

export function FiltersBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  onAdd,
  onImport,
  onExport,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  status: ShipmentStatus | "ALL";
  onStatusChange: (value: ShipmentStatus | "ALL") => void;
  onAdd: () => void;
  onImport: () => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search company, particulars, tracking…"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => onStatusChange(v as ShipmentStatus | "ALL")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {SHIPMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onExport}>
          <Download className="size-3.5" /> Export
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onImport}>
          <UploadCloud className="size-3.5" /> Import
        </Button>
        <MotionButton
          size="sm"
          className="gap-1.5"
          onClick={onAdd}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="size-3.5" /> Add Shipment
        </MotionButton>
      </div>
    </div>
  );
}
