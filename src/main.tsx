import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { CartProvider } from '@/lib/cart/cartProvider'
import { OrdersProvider } from '@/lib/orders/ordersProvider'
import { Toaster } from '@/components/ui/toast'
import '@/index.css'
import App from '@/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CartProvider>
      <OrdersProvider>
        <HashRouter>
          <Toaster>
            <App />
          </Toaster>
        </HashRouter>
      </OrdersProvider>
    </CartProvider>
  </StrictMode>
)
