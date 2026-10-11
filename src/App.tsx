import { Routes, Route, Navigate } from "react-router-dom"
import Catalog from "@/features/catalog/Catalog"
import CartPage from "@/features/cart/CartPage"
import Checkout from "@/features/checkout/Checkout"
import ProductDetailPage from "@/features/product-detail/ProductDetailPage"
import { useCart } from "@/lib/context/useCart"
import "@/utils/supabase"
import "@/App.css"

function App() {
  const { cart } = useCart()

  return (
    <Routes>
      <Route path="/" element={<Catalog />} />
      <Route path="/carrito" element={<CartPage />} />
      <Route
        path="/checkout"
        element={cart.length === 0 ? <Navigate to="/carrito" replace /> : <Checkout />}
      />
      <Route path="/producto/:productId" element={<ProductDetailPage />} />
      
    </Routes>
  )
}

export default App
