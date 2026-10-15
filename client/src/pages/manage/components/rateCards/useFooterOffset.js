import { useEffect, useState } from "react"

// The app footer (components/Footer.jsx) is position: fixed to the bottom of
// the window. Sticky action bars on the rate card screens must sit above it,
// so measure its real height (it changes with zoom / wrapping) and expose it
// as a CSS custom property for RateCards.css to offset against.
export const useFooterOffset = () => {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const footer = document.querySelector("footer.footer")
    if (!footer) return undefined
    const measure = () => {
      const fixed = getComputedStyle(footer).position === "fixed"
      setHeight(fixed ? footer.getBoundingClientRect().height : 0)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(footer)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  return { "--rc-footer-offset": `${Math.ceil(height)}px` }
}
