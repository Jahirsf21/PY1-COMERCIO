import { useEffect, useRef } from "react"
import { Routes, Route, Navigate, useMatch } from "react-router-dom"
import Catalog from "@/features/catalog/Catalog"
import CartPage from "@/features/cart/CartPage"
import Checkout from "@/features/checkout/Checkout"
import PaymentPage from "@/features/payments/PaymentPage"
import ProductDetailPage from "@/features/product-detail/ProductDetailPage"
import { clear_stored_checkout_form_data } from "@/lib/checkout/checkout"
import { useCart } from "@/lib/cart/cartContext"
import "@/App.css"

function App() {
  const { cart } = useCart()
  const isCheckoutPage = useMatch("/checkout") !== null
  const wasCheckoutPage = useRef(isCheckoutPage)

  useEffect(() => {
    if (wasCheckoutPage.current && !isCheckoutPage) {
      clear_stored_checkout_form_data()
    }
    wasCheckoutPage.current = isCheckoutPage
  }, [isCheckoutPage])

  return (
    <Routes>
      <Route path="/" element={<Catalog />} />
      <Route path="/carrito" element={<CartPage />} />
      <Route
        path="/checkout"
        element={cart.length === 0 ? <Navigate to="/carrito" replace /> : <Checkout />}
      />
      <Route path="/producto/:productId" element={<ProductDetailPage />} />
      <Route path="/pedido/:orderId/pago" element={<PaymentPage />} />
    </Routes>
  )
}

export default App
