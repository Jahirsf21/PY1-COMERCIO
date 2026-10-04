import { Link } from "react-router-dom"
import { BrandHeader } from "@/components/brand-header"
import { CartIndicator } from "@/features/cart/components/CartIndicator"

export function ShopHeader() {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-input px-4 py-3 lg:px-6">
      <Link to="/" aria-label="Ir al catálogo" className="min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <BrandHeader heading={false} />
      </Link>
      <CartIndicator />
    </header>
  )
}
