"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/motion/motion-button";
import { Search, Plus, UploadCloud, Download } from "lucide-react";

export function FiltersBar({
  search,
  onSearchChange,
  onAdd,
  onImport,
  onExport,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search company, particulars, tracking…"
          aria-label="Search shipments"
          className="pl-8"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onExport}>
          <Download className="size-3.5" /> Export
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onImport}>
          <UploadCloud className="size-3.5" /> Import
        </Button>
        <MotionButton
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 text-white font-semibold shadow-md hover:brightness-105 transition [text-shadow:0_1px_2px_rgb(0_0_0/0.45)]"
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
