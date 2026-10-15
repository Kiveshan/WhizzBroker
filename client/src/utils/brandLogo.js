/**
 * The company letterhead logo, shared by every document we generate.
 *
 * Two consumers with different needs:
 *   - jsPDF / ExcelJS want the raw bytes, so they get a base64 data URL fetched
 *     once and cached for the life of the page.
 *   - html2canvas-rendered documents just put BRAND_LOGO_SRC in an <img>; because
 *     it is served from our own origin the canvas stays untainted.
 *
 * Loading never throws. A document without its letterhead is still a usable
 * document, so callers treat a null logo as "draw the text header only".
 */

export const BRAND_LOGO_SRC = "/images/tda-logo.jpg"

// Intrinsic size of the asset. Kept here so callers can pick a width and derive
// the height without waiting for the image to decode.
export const BRAND_LOGO_WIDTH = 1245
export const BRAND_LOGO_HEIGHT = 478
export const BRAND_LOGO_ASPECT = BRAND_LOGO_WIDTH / BRAND_LOGO_HEIGHT

/** Height that keeps the logo undistorted at the given width (same unit in, same unit out). */
export const brandLogoHeight = (width) => width / BRAND_LOGO_ASPECT

let cached = null

/**
 * Resolves to { dataUrl, base64, extension } or null if the asset could not be
 * read. The promise itself is cached, so concurrent callers share one fetch.
 */
export function loadBrandLogo() {
  if (cached) return cached

  cached = (async () => {
    try {
      const response = await fetch(BRAND_LOGO_SRC)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })

      return {
        dataUrl,
        base64: String(dataUrl).split(",")[1],
        extension: "jpeg",
      }
    } catch (err) {
      console.warn("Brand logo unavailable, falling back to text header:", err)
      // Don't cache the failure — a transient network blip shouldn't strip the
      // letterhead from every document for the rest of the session.
      cached = null
      return null
    }
  })()

  return cached
}
