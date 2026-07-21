/**
 * Fibonacci sphere packing across nested shells for the Conn3ctor orbital map.
 */

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** Unit vectors evenly distributed on a sphere (fibonacci / sunflower). */
export function fibonacciSphere(count) {
  const pts = []
  const n = Math.max(1, count)
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = GOLDEN_ANGLE * i
    pts.push({
      x: Math.cos(theta) * radiusAtY,
      y,
      z: Math.sin(theta) * radiusAtY,
    })
  }
  return pts
}

/**
 * Distribute members across nested spherical shells.
 * @param {Array} members - member objects (mutated with _shell, _pos, _base)
 * @param {{ shellCount?: number, baseRadius?: number, shellGap?: number }} opts
 */
export function assignSphereShells(members, opts = {}) {
  const shellCount = opts.shellCount ?? 4
  const baseRadius = opts.baseRadius ?? 3.2
  const shellGap = opts.shellGap ?? 1.35
  const list = Array.isArray(members) ? members : []
  if (!list.length) return list

  const perShell = Math.ceil(list.length / shellCount)

  for (let s = 0; s < shellCount; s++) {
    const slice = list.slice(s * perShell, (s + 1) * perShell)
    if (!slice.length) break
    const unit = fibonacciSphere(slice.length)
    const R = baseRadius + s * shellGap
    slice.forEach((m, i) => {
      const u = unit[i]
      m._shell = s
      m._radius = R
      m._base = { x: u.x * R, y: u.y * R, z: u.z * R }
      m._pos = { ...m._base }
    })
  }
  return list
}

/** Stable hash → [0,1) for deterministic jitter / color accents */
export function hash01(str) {
  let h = 2166136261
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}
