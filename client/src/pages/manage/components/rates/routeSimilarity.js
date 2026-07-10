// Helpers for catching misspelled driver-rate routes before they create a
// duplicate. All client-side: scored against the route list the form already
// loads. Keep the normalize rule identical to the server's de-dup rule in
// saveRoutePeriods (driverRatesModel.js) so suggestions stay consistent.

// Confidence gate for treating a typed route as a likely typo of an existing
// one. Tunable: a higher SIMILARITY or lower MAX_DISTANCE is stricter.
export const SIMILARITY_THRESHOLD = 0.82
export const MAX_DISTANCE = 3

// Collapse internal whitespace, trim, lowercase. "Cape  Town " -> "cape town".
export const normalize = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase()

// Standard iterative Levenshtein edit distance (two-row DP). Strings here are
// short route names, so this is cheap.
export const levenshtein = (a, b) => {
  a = a || ""
  b = b || ""
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prev = new Array(b.length + 1)
  let curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

// Length-normalized similarity in 0..1 (1 = identical).
export const similarity = (a, b) => {
  const maxLen = Math.max((a || "").length, (b || "").length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// Find the existing route most likely to be what the user meant to type.
// Scores the combined "startingpoint → destination" string so a typo in either
// field is caught. Skips the exact normalized match (that's handled separately
// as a hard "already exists" warning). Returns the original-cased candidate
// {startingpoint, destination} or null when nothing clears the confidence gate.
export const findClosestRoute = (startingpoint, destination, routeOptions) => {
  if (!startingpoint || !destination || !Array.isArray(routeOptions)) return null

  const typed = `${normalize(startingpoint)} → ${normalize(destination)}`

  let best = null
  let bestScore = -1

  for (const opt of routeOptions) {
    if (!opt || !opt.startingpoint || !opt.destination) continue
    const candidate = `${normalize(opt.startingpoint)} → ${normalize(opt.destination)}`
    if (candidate === typed) return null // exact match -> not a typo suggestion

    const dist = levenshtein(typed, candidate)
    if (dist > MAX_DISTANCE) continue
    const score = similarity(typed, candidate)
    if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
      bestScore = score
      best = opt
    }
  }

  return best
}
