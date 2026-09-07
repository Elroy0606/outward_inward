import * as XLSX from "xlsx";
import {
  DATE_FIELDS,
  EXCEL_COLUMN_MAP,
  IGNORED_HEADERS,
  NUMERIC_FIELDS,
  REQUIRED_IMPORT_FIELDS,
} from "@/lib/constants";
import { shipmentInsertSchema } from "@/lib/validations";
import type { ShipmentInsert, ShipmentStatus, ShipmentType } from "@/lib/types";

export interface ParsedImportRowError {
  rowNumber: number;
  message: string;
}

export interface ParsedImportResult {
  validRows: ShipmentInsert[];
  errorRows: ParsedImportRowError[];
  matchedHeaders: string[];
  unmatchedHeaders: string[];
  sheetName: string;
}

export interface ParseShipmentFileOptions {
  type: ShipmentType;
  /** Explicit status for every imported row, or "AUTO" to infer per row from the data. */
  status: ShipmentStatus | "AUTO";
}

/** Lowercases, trims, collapses whitespace, and drops periods so header matching is forgiving. */
export function normalizeHeader(header: string): string {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Converts an Excel serial date number to a calendar Date (UTC), per the SheetJS-documented formula. */
function excelSerialToDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

function coerceDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : formatDateOnly(value);
  }

  if (typeof value === "number") {
    return formatDateOnly(excelSerialToDate(value));
  }

  const str = String(value).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Day-first formats (DD/MM/YYYY, DD-MM-YYYY) — matches the source spreadsheet's locale.
  const dayFirst = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dayFirst) {
    const [, dd, mm, yyyy] = dayFirst;
    const year = yyyy.length === 2 ? Number(yyyy) + 2000 : Number(yyyy);
    const day = Number(dd);
    const month = Number(mm);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return formatDateOnly(new Date(Date.UTC(year, month - 1, day)));
    }
  }

  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : formatDateOnly(parsed);
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

function coerceText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

export async function parseShipmentFile(
  file: File,
  options: ParseShipmentFileOptions
): Promise<ParsedImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  const headerRow =
    (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as unknown[] | undefined) ?? [];
  const sourceHeaders =
    rawRows.length > 0 ? Object.keys(rawRows[0]) : headerRow.map((h) => String(h));

  const headerFieldMap = new Map<string, string>();
  const matchedHeaders: string[] = [];
  const unmatchedHeaders: string[] = [];

  for (const header of sourceHeaders) {
    const normalized = normalizeHeader(header);
    if (IGNORED_HEADERS.has(normalized)) continue;
    const field = EXCEL_COLUMN_MAP[normalized];
    if (field) {
      headerFieldMap.set(header, field);
      matchedHeaders.push(header);
    } else if (normalized) {
      unmatchedHeaders.push(header);
    }
  }

  const validRows: ShipmentInsert[] = [];
  const errorRows: ParsedImportRowError[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2; // +1 for header row, +1 for 1-indexing
    const mapped: Record<string, unknown> = {
      type: options.type,
      status: options.status === "AUTO" ? "PENDING" : options.status,
    };

    for (const [sourceHeader, field] of headerFieldMap) {
      const value = raw[sourceHeader];
      if (NUMERIC_FIELDS.has(field)) {
        mapped[field] = coerceNumber(value);
      } else if (DATE_FIELDS.has(field)) {
        mapped[field] = coerceDate(value);
      } else if (field === "cost_center_oca") {
        // "Cost Center" and "OCA No" are separate source columns that both feed this one
        // merged field — join rather than overwrite when a row has both.
        const text = coerceText(value);
        const existing = mapped.cost_center_oca as string | null | undefined;
        mapped.cost_center_oca = existing && text ? `${existing} / ${text}` : (existing ?? text);
      } else {
        mapped[field] = coerceText(value);
      }
    }

    // Skip fully blank rows (common trailing rows in exported sheets).
    const hasAnyValue = Object.entries(mapped).some(
      ([key, value]) => key !== "type" && key !== "status" && value !== null && value !== ""
    );
    if (!hasAnyValue) return;

    if (options.status === "AUTO") {
      if (mapped.delivery_date) mapped.status = "DELIVERED";
      else if (mapped.tracking_number) mapped.status = "IN_TRANSIT";
      else mapped.status = "PENDING";
    }

    const missingRequired = REQUIRED_IMPORT_FIELDS.filter((field) => !mapped[field]);
    if (missingRequired.length > 0) {
      errorRows.push({
        rowNumber,
        message: `Missing required field(s): ${missingRequired.join(", ")}`,
      });
      return;
    }

    const result = shipmentInsertSchema.safeParse(mapped);
    if (!result.success) {
      errorRows.push({
        rowNumber,
        message: result.error.issues.map((issue) => issue.message).join("; "),
      });
      return;
    }

    validRows.push(result.data);
  });

  return { validRows, errorRows, matchedHeaders, unmatchedHeaders, sheetName };
}

export function exportRowsToCsv<T extends object>(rows: T[]): string {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(worksheet);
}
