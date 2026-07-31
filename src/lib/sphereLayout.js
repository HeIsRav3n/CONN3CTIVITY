/**
 * Concentric orbital rings (XZ plane) — readable solar-system layout for the map.
 */

/** Stable hash → [0,1) */
export function hash01(str) {
  let h = 2166136261
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

/**
 * Pack members onto flat concentric rings with even angular spacing.
 * Mutates each member with `_base`, `_ring`, `_angle`, `_radius`.
 */
export function assignOrbitalRings(members, opts = {}) {
  const list = Array.isArray(members) ? members : []
  if (!list.length) return list

  const baseRadius = opts.baseRadius ?? 2.6
  const ringGap = opts.ringGap ?? 1.05
  const arcSpacing = opts.arcSpacing ?? 0.62
  const maxRings = opts.maxRings ?? 12

  let idx = 0
  let ring = 0

  while (idx < list.length && ring < maxRings) {
    const R = baseRadius + ring * ringGap
    const capacity = Math.max(10, Math.floor((2 * Math.PI * R) / arcSpacing))
    const count = Math.min(capacity, list.length - idx)
    const angleOffset = ring * 0.22 + hash01(`ring-${ring}`) * 0.4
    const yLift = ((ring % 3) - 1) * 0.08

    for (let i = 0; i < count; i++) {
      const m = list[idx + i]
      const a = (i / count) * Math.PI * 2 + angleOffset
      m._ring = ring
      m._angle = a
      m._radius = R
      m._base = {
        x: Math.cos(a) * R,
        y: yLift,
        z: Math.sin(a) * R,
      }
    }

    idx += count
    ring += 1
  }

  // Overflow → outermost ring squeezed (rare)
  if (idx < list.length) {
    const R = baseRadius + (ring - 1) * ringGap
    const left = list.length - idx
    for (let i = 0; i < left; i++) {
      const m = list[idx + i]
      const a = (i / left) * Math.PI * 2
      m._ring = ring
      m._angle = a
      m._radius = R + 0.4
      m._base = { x: Math.cos(a) * m._radius, y: 0, z: Math.sin(a) * m._radius }
    }
  }

  return list
}

/** @deprecated use assignOrbitalRings */
export function assignSphereShells(members, opts = {}) {
  return assignOrbitalRings(members, {
    baseRadius: opts.baseRadius,
    ringGap: opts.shellGap,
    arcSpacing: 0.55,
  })
}
