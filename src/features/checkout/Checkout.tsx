import { ShopHeader } from "@/components/shop-header"
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm"
import { CheckoutOrderSummary } from "@/features/checkout/components/CheckoutOrderSummary"

export default function Checkout() {
  return (
    <div className="min-h-dvh bg-background">
      <ShopHeader sticky />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
        <h1 className="text-2xl font-semibold">Datos y resumen de la orden de compra</h1>
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
