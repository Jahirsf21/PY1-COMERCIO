import type { Hit } from "instantsearch.js"

export type SalesChannel = "b2c" | "b2b"

export type StockBySite = {
  site_province: string
  stock_quantity: number
}
export type ColorVariant = {
  color: string
  image_url: string[]
}

export type ProductFacets = {
  colors: ColorVariant[]
  size: string[]
  materials: string[]
  technology?: string
  recommend_use?: string[]
  gender: string[]
}

export type ProductRecord = {
  objectID: string
  title: string
  description: string
  brand: string
  categories: string[]
  image_url: string
  sales_channels: SalesChannel[]
  in_stock: boolean
  total_stock_quantity: number
  b2c_price: number
  b2c_stock_quantity: number
  b2c_reserved_quantity: number
  b2c_min_order_quantity: number
  b2c_max_order_quantity: number
  b2c_step_quantity: number
  b2b_price: number
  b2b_stock_quantity: number
  b2b_reserved_quantity: number
  b2b_min_order_quantity: number
  b2b_max_order_quantity: number
  b2b_step_quantity: number
  currency: string
  site_provinces: string[]
  total_stock_by_site: StockBySite[]
  facets: [ProductFacets]
  keywords: string[]
}

export type ProductHit = Hit<ProductRecord>
