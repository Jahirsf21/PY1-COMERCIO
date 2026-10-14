import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un importe con la moneda indicada y dos decimales.
 * @param amount Importe que se mostrará.
 * @param currency Código de moneda del importe.
 * @returns Importe formateado con su símbolo de moneda y dos decimales.
 * @throws Si el código de moneda no tiene un formato admitido por Intl.NumberFormat.
 */
export function format_price(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
