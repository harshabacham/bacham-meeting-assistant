import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import { cn } from "@/shared/utils/cn"

export type TransitionVariant =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "rectangle"
  | "star"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
  variant?: TransitionVariant
  /** When true, the transition expands from the viewport center instead of the button center. */
  fromCenter?: boolean
  /**
   * Controlled theme value. When provided, the parent owns persistence
   * (e.g. `next-themes`) and this component will not write to localStorage.
   */
  theme?: "light" | "dark" | "system"
  /** Called on toggle. Pair with `theme` for controlled usage. */
  onThemeChange?: (theme: "light" | "dark" | "system") => void
}

function polygonCollapsed(point: string, vertexCount: number): string {
  const pairs = Array.from({ length: vertexCount }, () => point).join(", ")
  return `polygon(${pairs})`
}

// All coordinates are percentages of the snapshot reference box: Chrome 150
// renders absolute px clip-path coordinates on ::view-transition-new(root)
// unscaled on fractional display scales (e.g. Windows 150%) for the first
// transition after load, so px values land at the wrong position (#989).
function getThemeTransitionClipPaths(
  variant: TransitionVariant,
  cx: number,
  cy: number,
  maxRadius: number,
  viewportWidth: number,
  viewportHeight: number
): [string, string] {
  const toX = (x: number) => `${(x / viewportWidth) * 100}%`
  const toY = (y: number) => `${(y / viewportHeight) * 100}%`
  const point = (x: number, y: number) => `${toX(x)} ${toY(y)}`
  // circle() percentage radii resolve against hypot(w, h) / sqrt(2) of the reference box.
  const toRadius = (r: number) =>
    `${(r / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100}%`

  switch (variant) {
    case "circle":
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ]
    case "square": {
      const halfW = Math.max(cx, viewportWidth - cx)
      const halfH = Math.max(cy, viewportHeight - cy)
      const halfSide = Math.max(halfW, halfH) * 1.05
      const end = [
        point(cx - halfSide, cy - halfSide),
        point(cx + halfSide, cy - halfSide),
        point(cx + halfSide, cy + halfSide),
        point(cx - halfSide, cy + halfSide),
      ].join(", ")
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`]
    }
    case "triangle": {
      const scale = maxRadius * 2.2
      const dx = (Math.sqrt(3) / 2) * scale
      const verts = [
        point(cx, cy - scale),
        point(cx + dx, cy + scale * 0.5),
        point(cx - dx, cy + scale * 0.5),
      ].join(", ")
      return [polygonCollapsed(point(cx, cy), 3), `polygon(${verts})`]
    }
    case "diamond": {
      const scale = maxRadius * 1.05
      const verts = [
        point(cx, cy - scale),
        point(cx + scale, cy),
        point(cx, cy + scale),
        point(cx - scale, cy),
      ].join(", ")
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${verts})`]
    }
    case "hexagon": {
      const scale = maxRadius * 1.05
      const cos30 = Math.cos(Math.PI / 6)
      const sin30 = 0.5
      const verts = [
        point(cx, cy - scale),
        point(cx + scale * cos30, cy - scale * sin30),
        point(cx + scale * cos30, cy + scale * sin30),
        point(cx, cy + scale),
        point(cx - scale * cos30, cy + scale * sin30),
        point(cx - scale * cos30, cy - scale * sin30),
      ].join(", ")
      return [polygonCollapsed(point(cx, cy), 6), `polygon(${verts})`]
    }
    case "rectangle": {
      const end = [
        point(0, 0),
        point(viewportWidth, 0),
        point(viewportWidth, viewportHeight),
        point(0, viewportHeight),
      ].join(", ")
      return [polygonCollapsed(point(cx, cy), 4), `polygon(${end})`]
    }
    case "star": {
      const outerR = maxRadius * 1.15
      const innerR = outerR * 0.382
      const points: string[] = []
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2
        const r = i % 2 === 0 ? outerR : innerR
        points.push(point(cx + r * Math.cos(angle), cy + r * Math.sin(angle)))
      }
      return [polygonCollapsed(point(cx, cy), 10), `polygon(${points.join(", ")})`]
    }
    default:
      return [
        `circle(0% at ${point(cx, cy)})`,
        `circle(${toRadius(maxRadius)} at ${point(cx, cy)})`,
      ]
  }
}

export function useAnimatedTheme({ duration = 400, variant = "circle", fromCenter = false, theme, onThemeChange }: Omit<AnimatedThemeTogglerProps, "className"> = {}) {
  const shape = variant ?? "circle"
  const isControlled = theme !== undefined
  const [internalIsDark, setInternalIsDark] = useState(false)
  const isDark = isControlled 
    ? (theme === "dark" || (theme === "system" && (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches))) 
    : internalIsDark
  const isTransitioningRef = useRef(false)

  useEffect(() => {
    if (isControlled) return
    const updateTheme = () => setInternalIsDark(document.documentElement.classList.contains("dark"))
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [isControlled])

  const setTheme = useCallback((targetTheme: "light" | "dark" | "system", e?: React.MouseEvent | React.TouchEvent | HTMLElement) => {
    if (isTransitioningRef.current || document.documentElement.dataset.magicuiThemeVt === "active") {
      onThemeChange?.(targetTheme)
      return
    }

    const isSystemDark = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false
    const targetIsDark = targetTheme === "dark" || (targetTheme === "system" && isSystemDark)
    
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    
    if (!fromCenter) {
      if (e instanceof HTMLElement) {
        const rect = e.getBoundingClientRect()
        x = rect.left + rect.width / 2
        y = rect.top + rect.height / 2
      } else if (e && "clientX" in e) {
        x = (e as React.MouseEvent).clientX
        y = (e as React.MouseEvent).clientY
      } else if (e && "touches" in e) {
        x = (e as React.TouchEvent).touches[0].clientX
        y = (e as React.TouchEvent).touches[0].clientY
      }
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const maxRadius = Math.hypot(Math.max(x, viewportWidth - x), Math.max(y, viewportHeight - y))

    const applyTheme = () => {
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(targetIsDark ? "dark" : "light")
      if (isControlled) onThemeChange?.(targetTheme)
      else { setInternalIsDark(targetIsDark); localStorage.setItem("theme", targetTheme) }
    }

    if (typeof document.startViewTransition !== "function") {
      applyTheme()
      return
    }

    const clipPath = getThemeTransitionClipPaths(shape, x, y, maxRadius, viewportWidth, viewportHeight)
    const root = document.documentElement
    root.dataset.magicuiThemeVt = "active"
    root.style.setProperty("--magicui-theme-toggle-vt-duration", `${duration}ms`)
    root.style.setProperty("--magicui-theme-vt-clip-from", clipPath[0])
    
    const cleanup = () => {
      isTransitioningRef.current = false
      delete root.dataset.magicuiThemeVt
      root.style.removeProperty("--magicui-theme-toggle-vt-duration")
      root.style.removeProperty("--magicui-theme-vt-clip-from")
    }

    isTransitioningRef.current = true
    try {
      const transition = document.startViewTransition(() => { 
        try {
          flushSync(applyTheme) 
        } catch {
          applyTheme()
        }
      })
      if (typeof transition?.finished?.finally === "function") transition.finished.finally(cleanup).catch(() => {})
      else cleanup()

      const ready = transition?.ready
      if (ready && typeof ready.then === "function") {
        ready.then(() => {
          document.documentElement.animate({ clipPath }, {
            duration, easing: shape === "star" ? "linear" : "ease-in-out", fill: "forwards", pseudoElement: "::view-transition-new(root)"
          })
        }).catch(() => {})
      }
    } catch {
      cleanup()
      applyTheme()
    }
  }, [shape, fromCenter, duration, isControlled, onThemeChange])

  const toggleTheme = useCallback((e?: React.MouseEvent | React.TouchEvent | HTMLElement) => {
    setTheme(isDark ? "light" : "dark", e)
  }, [isDark, setTheme])

  return { isDark, toggleTheme, setTheme }
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  variant,
  fromCenter = false,
  theme,
  onThemeChange,
  ...props
}: AnimatedThemeTogglerProps) => {
  const shape = variant ?? "circle"
  const isControlled = theme !== undefined
  const [internalIsDark, setInternalIsDark] = useState(false)
  const isDark = isControlled ? theme === "dark" : internalIsDark
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isTransitioningRef = useRef(false)

  useEffect(() => {
    if (isControlled) return

    const updateTheme = () => {
      setInternalIsDark(document.documentElement.classList.contains("dark"))
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [isControlled])

  const toggleTheme = useCallback((e?: React.MouseEvent | React.TouchEvent | HTMLElement) => {
    const button = e instanceof HTMLElement ? e : (e?.currentTarget as HTMLElement | undefined) ?? buttonRef.current;
    if (
      (!button && !e) ||
      isTransitioningRef.current ||
      document.documentElement.dataset.magicuiThemeVt === "active"
    )
      return

    // innerWidth/innerHeight (not visualViewport): percentages must resolve
    // against the snapshot reference box, which includes classic scrollbars.
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x: number
    let y: number
    if (fromCenter) {
      x = viewportWidth / 2
      y = viewportHeight / 2
    } else if (button) {
      const { top, left, width, height } = button.getBoundingClientRect()
      x = left + width / 2
      y = top + height / 2
    } else {
      x = viewportWidth / 2
      y = viewportHeight / 2
    }

    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y)
    )

    const applyTheme = () => {
      const newTheme = !isDark
      // Always toggle the class synchronously so the View Transitions API
      // snapshots the new theme inside the startViewTransition callback.
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(newTheme ? "dark" : "light")
      if (isControlled) {
        onThemeChange?.(newTheme ? "dark" : "light")
      } else {
        setInternalIsDark(newTheme)
        localStorage.setItem("theme", newTheme ? "dark" : "light")
      }
    }

    if (typeof document.startViewTransition !== "function") {
      applyTheme()
      return
    }

    const clipPath = getThemeTransitionClipPaths(
      shape,
      x,
      y,
      maxRadius,
      viewportWidth,
      viewportHeight
    )

    const root = document.documentElement
    root.dataset.magicuiThemeVt = "active"
    root.style.setProperty(
      "--magicui-theme-toggle-vt-duration",
      `${duration}ms`
    )
    // Pin the collapsed clip-path via CSS so Firefox does not paint the new
    // theme unclipped between snapshot and the ready.then() JS animation.
    root.style.setProperty("--magicui-theme-vt-clip-from", clipPath[0])
    const cleanup = () => {
      isTransitioningRef.current = false
      delete root.dataset.magicuiThemeVt
      root.style.removeProperty("--magicui-theme-toggle-vt-duration")
      root.style.removeProperty("--magicui-theme-vt-clip-from")
    }

    isTransitioningRef.current = true
    try {
      const transition = document.startViewTransition(() => {
        try {
          flushSync(applyTheme)
        } catch {
          applyTheme()
        }
      })
      if (typeof transition?.finished?.finally === "function") {
        transition.finished.finally(cleanup).catch(() => {})
      } else {
        cleanup()
      }

      const ready = transition?.ready
      if (ready && typeof ready.then === "function") {
        ready
          .then(() => {
            document.documentElement.animate(
              {
                clipPath,
              },
              {
                duration,
                easing: shape === "star" ? "linear" : "ease-in-out",
                fill: "forwards",
                pseudoElement: "::view-transition-new(root)",
              }
            )
          })
          .catch(() => {})
      }
    } catch {
      cleanup()
      applyTheme()
    }
  }, [shape, fromCenter, duration, isDark, isControlled, onThemeChange])

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(className)}
      {...props}
    >
      {isDark ? <Sun /> : <Moon />}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}


