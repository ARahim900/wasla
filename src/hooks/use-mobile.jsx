import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Reliable mobile detection hook.
 * - Initializes synchronously from window.innerWidth (no undefined flash)
 * - Uses matchMedia listener for efficient resize tracking
 * - Also detects touch-primary devices via pointer: coarse
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < MOBILE_BREAKPOINT
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = (e) => setIsMobile(e.matches)

    // Sync initial value (in case SSR hydration differs)
    setIsMobile(mql.matches)

    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

/**
 * Detect if the device has a coarse pointer (touch screen).
 * Useful for adjusting touch target sizes independently of screen width.
 */
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(pointer: coarse)").matches
  })

  React.useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)")
    const onChange = (e) => setIsTouch(e.matches)
    setIsTouch(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isTouch
}

export { MOBILE_BREAKPOINT }
