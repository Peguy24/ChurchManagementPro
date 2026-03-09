/**
 * Utility functions for CSV export
 */

import { formatDateForDisplay } from "./date";

export interface CsvColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: any, row: T) => string;
}


/**
 * Convert data array to CSV string
 */
export function arrayToCsv<T extends Record<string, any>>(
  data: T[],
  columns: CsvColumn<T>[]
): string {
  if (!data || data.length === 0) {
    return "";
  }

  // Header row
  const headers = columns.map((col) => escapeCSVValue(col.header));
  const headerRow = headers.join(",");

  // Data rows
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        const key = col.key as string;
        const value = key.includes(".") 
          ? getNestedValue(row, key) 
          : row[key];
        
        if (col.formatter) {
          return escapeCSVValue(col.formatter(value, row));
        }
        return escapeCSVValue(formatValue(value));
      })
      .join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Format value for CSV
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "Oui" : "Non";
  }
  if (value instanceof Date) {
    return value.toLocaleDateString("fr-FR");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  if (!value) return "";
  
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download CSV file
 */
export function downloadCsv(csvContent: string, filename: string): void {
  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string
): void {
  const csvContent = arrayToCsv(data, columns);
  if (csvContent) {
    downloadCsv(csvContent, filename);
  }
}

/**
 * Format currency for CSV
 */
export function formatCurrencyForCsv(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0";
  return amount.toFixed(2);
}

/**
 * Format date for CSV
 */
export function formatDateForCsv(date: string | null | undefined): string {
  if (!date) return "";
  const formatted = formatDateForDisplay(date, "fr-FR");
  return formatted || date;
}

