import { Routes, Route, Navigate } from "react-router-dom"
import { RouteNavigation } from "@/components/route-navigation"
import Catalog from "@/features/catalog/Catalog"
import CartPage from "@/features/cart/CartPage"
import Checkout from "@/features/checkout/Checkout"
import PaymentPage from "@/features/payments/PaymentPage"
import OrdersPage from "@/features/orders/OrdersPage"
import OrderDetailPage from "@/features/orders/OrderDetailPage"
import ProductDetailPage from "@/features/product-detail/ProductDetailPage"
import { useCart } from "@/lib/cart/cartContext"
import "@/App.css"

function App() {
  const { cart } = useCart()

  return (
    <>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/carrito" element={<CartPage />} />
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/pedido/:orderId" element={<OrderDetailPage />} />
        <Route
          path="/checkout"
          element={cart.length === 0 ? <Navigate to="/carrito" replace /> : <Checkout />}
        />
        <Route path="/producto/:productId" element={<ProductDetailPage />} />
        <Route path="/pedido/:orderId/pago" element={<PaymentPage />} />
      </Routes>
      <RouteNavigation />
    </>
  )
}

export default App
