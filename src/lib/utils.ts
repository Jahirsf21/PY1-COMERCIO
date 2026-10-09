import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un importe con la moneda indicada y dos decimales
 * 
 * @param {number} value Importe que se mostrará.
 * @param {string} currency Código de moneda del importe
 * @returns {string} Importe formateado con su símbolo de moneda y dos decimales.
 */
export function format_price(value: number, currency: string): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
