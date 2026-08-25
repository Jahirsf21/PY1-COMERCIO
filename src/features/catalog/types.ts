import type { Hit } from "instantsearch.js"

export type SalesChannel = "b2c" | "b2b"

export type Discount = {
  percentage: number
  starts_at: number
  ends_at: number
}
export type StockBySite = {
  site_province: string
  stock_quantity: number
  reserved_quantity: number
  available_quantity: number
}

export type ProductFacets = {
  color: string
  size: string
  materials: string[]
  technology?: string
  recommend_use?: string[]
  gender: string[]
}

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
  images_url: string[]
  image_url: string
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
  b2c_stock_by_site: StockBySite[]
  b2b_stock_quantity: number
  b2b_reserved_quantity: number
  b2b_available_quantity: number
  b2b_min_order_quantity: number
  b2b_max_order_quantity: number
  b2b_step_quantity: number
  b2b_stock_by_site: StockBySite[]
  site_provinces: string[]
  facets: [ProductFacets]
}

export type ProductHit = Hit<ProductRecord>
