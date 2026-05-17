import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatQuantity(qty: number | null | undefined): string {
  if (qty == null) return "0";
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(qty);
}
