import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { CartProvider } from '@/lib/context/cartProvider'
import { Toaster } from '@/components/ui/toast'
import '@/index.css'
import App from '@/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CartProvider>
      <HashRouter>
        <Toaster>
          <App />
        </Toaster>
      </HashRouter>
    </CartProvider>
  </StrictMode>
)
