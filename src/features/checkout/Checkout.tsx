import { Link } from "react-router-dom"
import { ArrowLeftIcon } from "lucide-react"
import { ShopHeader } from "@/components/shop-header"
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm"
import { CheckoutOrderSummary } from "@/features/checkout/components/CheckoutOrderSummary"

export default function Checkout() {
  return (
    <div className="min-h-dvh bg-background">
      <ShopHeader sticky />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
        <Link
          to="/carrito"
          className="mb-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Volver al carrito
        </Link>
        <h1 className="text-2xl font-semibold">Datos y resumen del pedido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Completa tus datos y revisa los productos de tu pedido.
        </p>
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <CheckoutForm />
          <CheckoutOrderSummary />
        </div>
      </main>
    </div>
  )
}
