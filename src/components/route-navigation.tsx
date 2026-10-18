import { useLayoutEffect, useRef } from "react"
import { useLocation, useNavigationType } from "react-router-dom"
import { capture_navigation_snapshot, start_navigation_restoration } from "@/lib/navigation/navigation"
import type { NavigationLocation, NavigationSnapshot } from "@/lib/navigation/types"

/**
 * Coordina el desplazamiento y el foco de las rutas sin guardar datos de compra ni crear otro contexto.
 * Distingue las entradas nuevas de Atrás y Adelante y conserva la posición al cambiar solo parámetros de consulta.
 * @returns No renderiza contenido visible.
 */
export function RouteNavigation() {
  const { key, pathname } = useLocation()
  const navigation_type = useNavigationType()
  const snapshots = useRef(new Map<string, NavigationSnapshot>())
  const current_key = useRef(key)
  const previous_location = useRef<NavigationLocation | null>(null)

  useLayoutEffect(() => {
    const previous_restoration = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"

    /**
     * Conserva el último desplazamiento y foco de la entrada activa del historial.
     * @returns No retorna ningún valor.
     */
    function capture_view(): void {
      snapshots.current.set(current_key.current, capture_navigation_snapshot())
    }

    window.addEventListener("scroll", capture_view, true)
    document.addEventListener("focusin", capture_view)
    return () => {
      window.history.scrollRestoration = previous_restoration
      window.removeEventListener("scroll", capture_view, true)
      document.removeEventListener("focusin", capture_view)
    }
  }, [])

  useLayoutEffect(() => {
    const previous = previous_location.current
    const same_screen = previous?.pathname === pathname && previous.key !== key
    current_key.current = key
    previous_location.current = { key, pathname }
    if (same_screen && navigation_type !== "POP") {
      snapshots.current.set(key, capture_navigation_snapshot())
      return
    }
    const snapshot = navigation_type === "POP" ? snapshots.current.get(key) : undefined
    return start_navigation_restoration(snapshot)
  }, [key, navigation_type, pathname])

  return null
}
