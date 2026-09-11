import type { Hit } from "instantsearch.js"

/**
 * Canales de venta disponibles
 */
export type SalesChannel = "b2c" | "b2b"

/**
 * Descuento porcentual vigente durante un rango de fechas
 */
export type Discount = {
  percentage: number
  starts_at: string
  ends_at: string
}

/**
 * Imagen con url y texto alternativo para accesibilidad
 */
export type ProductImage = {
  url: string
  alt: string
}

/**
 * Stock de un local puntual dentro de una provincia
 */
export type StockByLocation = {
  province: string
  locale_name: string
  stock_quantity: number
  reserved_quantity: number
  available_quantity: number
}

/**
 * Facetas del producto
 */
export type ProductFacets = {
  color: string
  size: string[]
  materials: string[]
  technology?: string
  recommend_use?: string[]
  gender: string[]
}

/**
 * Esquema del producto recibido
 */
export type ProductRecord = {
  objectID: string
  sku: string
  product_id: string
  title: string
  description: string
  brand: string
  categories: string[]
  sales_channels: SalesChannel[]
  currency: string
  keywords: string[]
  image: ProductImage
  images: ProductImage[]
  rating: number,
  b2c_price: number
  b2c_discount?: Discount
  on_discount: boolean
  b2b_price: number
  in_stock_b2c: boolean
  in_stock_b2b: boolean
  total_stock_quantity: number
  b2c_stock_quantity: number
  b2c_reserved_quantity: number
  b2c_available_quantity: number
  b2c_min_order_quantity: number
  b2c_max_order_quantity: number
  b2c_step_quantity: number
  b2c_stock_by_location: StockByLocation[]
  b2b_stock_quantity: number
  b2b_reserved_quantity: number
  b2b_available_quantity: number
  b2b_min_order_quantity: number
  b2b_max_order_quantity: number
  b2b_step_quantity: number
  b2b_stock_by_location: StockByLocation[]
  provinces: string[]
  facets: ProductFacets
}

export type ProductHit = Hit<ProductRecord>
