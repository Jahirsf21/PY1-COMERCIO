/**
 * Posición de desplazamiento de la ventana o de un panel de la aplicación.
 */
export type NavigationScrollPosition = {
  left: number
  top: number
}

/**
 * Identificador de una entrada del historial y pantalla a la que pertenece.
 */
export type NavigationLocation = {
  key: string
  pathname: string
}

/**
 * Desplazamiento y elemento enfocado de una entrada del historial, conservados solo en memoria.
 */
export type NavigationSnapshot = {
  window_position: NavigationScrollPosition
  panel_positions: Record<string, NavigationScrollPosition>
  focus_selector: string | null
}
