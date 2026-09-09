export function smoothWheelScroll(viewport: HTMLElement) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  let frame: number | null = null
  let target = viewport.scrollTop
  let expectedPosition = viewport.scrollTop
  let previousTime = 0

  function stop() {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
    target = viewport.scrollTop
    expectedPosition = viewport.scrollTop
  }

  function clamp(position: number) {
    return Math.max(0, Math.min(position, viewport.scrollHeight - viewport.clientHeight))
  }

  function animate(time: number) {
    const elapsed = Math.min(time - previousTime, 64)
    previousTime = time
    target = clamp(target)
    const remaining = target - viewport.scrollTop

    viewport.scrollTop = Math.abs(remaining) < 1
      ? target
      : viewport.scrollTop + Math.sign(remaining) * Math.min(
        Math.abs(remaining),
        Math.max(1, Math.abs(remaining) * (1 - Math.exp(-elapsed / 70))),
      )
    expectedPosition = viewport.scrollTop

    if (Math.abs(target - viewport.scrollTop) < 1) {
      viewport.scrollTop = target
      stop()
    } else {
      frame = requestAnimationFrame(animate)
    }
  }

  function onWheel(event: WheelEvent) {
    if (
      event.defaultPrevented || !event.cancelable || reducedMotion.matches ||
      event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
      Math.abs(event.deltaX) >= Math.abs(event.deltaY)
    ) {
      stop()
      return
    }

    const element = event.target instanceof Element ? event.target : null
    if (
      element?.closest('[data-slot="scroll-area-viewport"]') !== viewport ||
      element?.closest('input, textarea, select, [contenteditable="true"], [role="slider"]')
    ) return

    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? parseFloat(getComputedStyle(viewport).lineHeight) || 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? viewport.clientHeight : 1
    const delta = event.deltaY * unit

    if (frame === null || Math.sign(delta) !== Math.sign(target - viewport.scrollTop)) {
      target = viewport.scrollTop
    }
    target = clamp(target + delta)
    if (target === viewport.scrollTop) {
      stop()
      return
    }

    event.preventDefault()
    if (frame === null) {
      previousTime = performance.now()
      frame = requestAnimationFrame(animate)
    }
  }

  function onScroll() {
    if (frame !== null && Math.abs(viewport.scrollTop - expectedPosition) > 1) stop()
  }

  viewport.addEventListener("wheel", onWheel, { passive: false })
  viewport.addEventListener("scroll", onScroll, { passive: true })
  const root = viewport.closest('[data-slot="scroll-area"]') ?? viewport
  root.addEventListener("pointerdown", stop, true)
  root.addEventListener("touchstart", stop, { passive: true })
  root.addEventListener("keydown", stop, true)
  reducedMotion.addEventListener("change", stop)

  return () => {
    stop()
    viewport.removeEventListener("wheel", onWheel)
    viewport.removeEventListener("scroll", onScroll)
    root.removeEventListener("pointerdown", stop, true)
    root.removeEventListener("touchstart", stop)
    root.removeEventListener("keydown", stop, true)
    reducedMotion.removeEventListener("change", stop)
  }
}
