"use client";

import { useCallback, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/motion/motion-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseShipmentFile, type ParsedImportResult } from "@/lib/excel-parser";
import { bulkInsertShipments } from "@/lib/actions";
import { SHIPMENT_STATUSES, STATUS_CONFIG, TYPE_CONFIG } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import type { ShipmentStatus, ShipmentType } from "@/lib/types";

export function UploadSheet({
  open,
  onOpenChange,
  defaultType,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType: ShipmentType;
  onImported: () => void;
}) {
  const [type, setType] = useState<ShipmentType>(defaultType);
  const [statusMode, setStatusMode] = useState<ShipmentStatus | "AUTO">("AUTO");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParsedImportResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, startImporting] = useTransition();

  // Re-seed the form from `defaultType` each time the sheet transitions to open,
  // without the extra render (and lint warning) a useEffect-based reset would cost.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setType(defaultType);
      setStatusMode("AUTO");
      setFile(null);
      setResult(null);
    }
  }

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const picked = accepted[0];
      if (!picked) return;
      setFile(picked);
      setResult(null);
      setIsParsing(true);
      try {
        const parsed = await parseShipmentFile(picked, { type, status: statusMode });
        setResult(parsed);
      } catch {
        toast.error("Couldn't read that file", {
          description: "Make sure it's a valid .xlsx, .xls, or .csv export.",
        });
        setFile(null);
      } finally {
        setIsParsing(false);
      }
    },
    [type, statusMode]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
  });

  function reset() {
    setFile(null);
    setResult(null);
  }

  async function reparse(nextType: ShipmentType, nextStatus: ShipmentStatus | "AUTO") {
    if (!file) return;
    setIsParsing(true);
    try {
      const parsed = await parseShipmentFile(file, { type: nextType, status: nextStatus });
      setResult(parsed);
    } finally {
      setIsParsing(false);
    }
  }

  function handleImport() {
    if (!result || result.validRows.length === 0) return;
    startImporting(async () => {
      const res = await bulkInsertShipments(result.validRows);
      if (!res.success) {
        toast.error("Import failed", { description: res.error });
        return;
      }
      toast.success(`Imported ${res.data?.insertedCount ?? 0} shipment(s)`);
      onOpenChange(false);
      reset();
      onImported();
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <SheetContent side="right" className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Import from Excel / CSV</SheetTitle>
          <SheetDescription>
            Drop the company&apos;s tracker export. Headers are matched automatically —
            &quot;Sr.No&quot; is ignored since the database assigns its own ID.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5">Import as</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  const next = v as ShipmentType;
                  setType(next);
                  reparse(next, statusMode);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INWARD">{TYPE_CONFIG.INWARD.label}</SelectItem>
                  <SelectItem value="OUTWARD">{TYPE_CONFIG.OUTWARD.label}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Default status</Label>
              <Select
                value={statusMode}
                onValueChange={(v) => {
                  const next = v as ShipmentStatus | "AUTO";
                  setStatusMode(next);
                  reparse(type, next);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">Auto-detect from data</SelectItem>
                  {SHIPMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!file && (
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-10 text-center transition-colors",
                isDragActive && "border-tangerine-500 bg-tangerine-50 dark:bg-tangerine-950/40"
              )}
            >
              <input {...getInputProps()} />
              <UploadCloud className="size-8 text-tangerine-600" />
              <p className="text-sm font-medium">
                {isDragActive ? "Drop the file here" : "Drag & drop your Excel/CSV file"}
              </p>
              <p className="text-xs text-muted-foreground">or click to browse — .xlsx, .xls, .csv</p>
            </div>
          )}

          {file && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileSpreadsheet className="size-4 shrink-0 text-tangerine-600" />
                <span className="truncate text-sm font-medium">{file.name}</span>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={reset}>
                <X className="size-4" />
              </Button>
            </div>
          )}

          {isParsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Reading file…
            </div>
          )}

          {result && !isParsing && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="gap-1.5 bg-status-delivered text-status-delivered-foreground">
                  <CheckCircle2 className="size-3" />
                  {result.validRows.length} row(s) ready
                </Badge>
                {result.errorRows.length > 0 && (
                  <Badge className="gap-1.5 bg-status-cancelled text-status-cancelled-foreground">
                    <AlertTriangle className="size-3" />
                    {result.errorRows.length} row(s) skipped
                  </Badge>
                )}
                {result.unmatchedHeaders.length > 0 && (
                  <Badge variant="outline" className="gap-1.5">
                    {result.unmatchedHeaders.length} column(s) not mapped
                  </Badge>
                )}
              </div>

              {result.unmatchedHeaders.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ignored columns: {result.unmatchedHeaders.join(", ")}
                </p>
              )}

              {result.validRows.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Particulars</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.validRows.slice(0, 25).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="max-w-40 truncate">{row.company_name}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(row.shipment_date)}
                          </TableCell>
                          <TableCell className="max-w-56 truncate">{row.particulars}</TableCell>
                          <TableCell>
                            <StatusBadge status={row.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {result.validRows.length > 25 && (
                    <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                      + {result.validRows.length - 25} more row(s) not shown
                    </p>
                  )}
                </div>
              )}

              {result.errorRows.length > 0 && (
                <div className="max-h-40 overflow-auto rounded-lg border border-status-cancelled bg-status-cancelled/10 p-3">
                  <p className="mb-1 text-xs font-semibold text-status-cancelled-foreground">
                    Skipped rows
                  </p>
                  <ul className="space-y-0.5 text-xs text-status-cancelled-foreground">
                    {result.errorRows.slice(0, 20).map((err) => (
                      <li key={err.rowNumber}>
                        Row {err.rowNumber}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <MotionButton
            type="button"
            disabled={!result || result.validRows.length === 0 || isImporting}
            onClick={handleImport}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="gap-1.5"
          >
            {isImporting && <Loader2 className="size-3.5 animate-spin" />}
            Import {result?.validRows.length ?? 0} Shipment(s)
          </MotionButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
