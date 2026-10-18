import type { NavigationSnapshot } from "@/lib/navigation/types"

/**
 * Recupera los paneles de desplazamiento identificados explícitamente por la aplicación.
 * @returns Paneles de contenido asociados a sus identificadores estables.
 */
function get_navigation_panels(): Map<string, HTMLElement> {
  const panels = new Map<string, HTMLElement>()
  for (const root of document.querySelectorAll<HTMLElement>("[data-navigation-scroll]")) {
    const key = root.dataset.navigationScroll
    const viewport = root.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')
    if (key && viewport) panels.set(key, viewport)
  }
  return panels
}

/**
 * Captura la posición actual y una referencia al elemento enfocado, sin guardar datos de formularios.
 * @returns Estado visual de la entrada actual del historial.
 */
export function capture_navigation_snapshot(): NavigationSnapshot {
  const active_element = document.activeElement
  let focus_selector: string | null = null
  if (active_element instanceof HTMLElement && active_element !== document.body) {
    if (active_element.id) focus_selector = `#${CSS.escape(active_element.id)}`
    else if (active_element instanceof HTMLAnchorElement) focus_selector = `a[href=${JSON.stringify(active_element.getAttribute("href"))}]`
  }
  return {
    window_position: { left: window.scrollX, top: window.scrollY },
    panel_positions: Object.fromEntries([...get_navigation_panels()].map(([key, panel]) => [key, { left: panel.scrollLeft, top: panel.scrollTop }])),
    focus_selector,
  }
}

/**
 * Restaura el desplazamiento guardado o muestra el inicio al abrir una pantalla nueva.
 * @param snapshot Estado visual anterior, cuando se está volviendo a una entrada conocida del historial.
 * @returns true si el contenido ya permite alcanzar las posiciones solicitadas.
 */
function restore_navigation_scroll(snapshot?: NavigationSnapshot): boolean {
  const position = snapshot?.window_position ?? { left: 0, top: 0 }
  window.scrollTo({ ...position, behavior: "instant" })
  let is_restored = Math.abs(window.scrollY - position.top) <= 1 && Math.abs(window.scrollX - position.left) <= 1
  const panels = get_navigation_panels()
  for (const [key, panel] of panels) {
    const panel_position = snapshot?.panel_positions[key] ?? { left: 0, top: 0 }
    panel.scrollTo({ ...panel_position, behavior: "instant" })
    if (Math.abs(panel.scrollTop - panel_position.top) > 1 || Math.abs(panel.scrollLeft - panel_position.left) > 1) is_restored = false
  }
  if (snapshot && Object.keys(snapshot.panel_positions).some((key) => !panels.has(key))) is_restored = false
  return is_restored
}

/**
 * Enfoca el encabezado de una pantalla nueva o el elemento anterior al volver, sin desplazar la vista.
 * No interfiere con los cuadros de diálogo abiertos ni fuerza un encabezado al restaurar el historial.
 * @param snapshot Estado visual anterior si se está restaurando una entrada del historial.
 * @returns true si el foco ya se resolvió o no necesita cambiarse.
 */
function restore_navigation_focus(snapshot?: NavigationSnapshot): boolean {
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return true
  if (snapshot && !snapshot.focus_selector) return true
  const target = document.querySelector<HTMLElement>(snapshot?.focus_selector ?? "main h1, [data-navigation-focus]")
  if (!target || target.getClientRects().length === 0) return false
  if (!target.matches('a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]')) target.setAttribute("tabindex", "-1")
  target.focus({ preventScroll: true })
  return document.activeElement === target
}

/**
 * Abre una pantalla desde el inicio o restaura su posición al volver con el navegador.
 * Espera al contenido asíncrono y deja de intervenir en cuanto se restaura la vista o la persona interactúa.
 * @param snapshot Estado guardado de una entrada anterior; se omite en una navegación nueva.
 * @returns Acción que cancela la restauración y libera sus observadores y escuchas.
 */
export function start_navigation_restoration(snapshot?: NavigationSnapshot): () => void {
  let is_active = true
  let animation_frame = 0
  let is_focus_restored = false
  const interaction_events = ["pointerdown", "keydown", "wheel", "touchstart"] as const
  const mutation_observer = new MutationObserver(schedule_restoration)
  const resize_observer = new ResizeObserver(schedule_restoration)

  /**
   * Detiene la restauración sin impedir el desplazamiento o el foco elegidos por la persona.
   * @returns No retorna ningún valor.
   */
  function stop_restoration(): void {
    is_active = false
    window.cancelAnimationFrame(animation_frame)
    mutation_observer.disconnect()
    resize_observer.disconnect()
    for (const event_name of interaction_events) window.removeEventListener(event_name, stop_restoration, true)
  }

  /**
   * Intenta restaurar la vista cuando el contenido necesario está disponible.
   * @returns No retorna ningún valor.
   */
  function restore_view(): void {
    animation_frame = 0
    if (!is_active) return
    const is_scroll_restored = restore_navigation_scroll(snapshot)
    if (!is_focus_restored) is_focus_restored = restore_navigation_focus(snapshot)
    if (is_scroll_restored && is_focus_restored) stop_restoration()
  }

  /**
   * Agrupa los cambios de contenido en un solo intento de restauración por cuadro.
   * @returns No retorna ningún valor.
   */
  function schedule_restoration(): void {
    if (is_active && !animation_frame) animation_frame = window.requestAnimationFrame(restore_view)
  }

  mutation_observer.observe(document.body, { childList: true, subtree: true })
  resize_observer.observe(document.body)
  for (const event_name of interaction_events) window.addEventListener(event_name, stop_restoration, { capture: true, passive: true })
  restore_view()
  return stop_restoration
}
