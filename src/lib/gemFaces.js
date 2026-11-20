import * as THREE from 'three'

// Six saturated gold tones with a wide lightness spread, used to colour
// the gem's faces so neighbouring faces always read differently.
export const GEM_TONES = ['#F0C14B', '#E8B84B', '#C9A96E', '#B98A2E', '#8A5E14', '#7A5518']

// Colour the faces of a non-indexed polyhedron geometry (one vertex run
// per face) so that no two faces sharing a vertex ever share a tone.
// DSATUR over the face-adjacency graph: always colour next the
// uncoloured face with the most distinct tones among its coloured
// neighbours (tie-break: highest degree), then take the lowest tone none
// of its neighbours uses. The face-adjacency graph of an icosahedron is
// the dodecahedral graph (chromatic number 3), so six tones colour it
// with zero conflicts. Returns the colour attribute plus the assignment,
// so tests can prove the separation. (A plain index-order greedy failed
// here: a late face can find all six tones among its twelve neighbours.)
export function colourPolyhedronFaces(geometry, tones = GEM_TONES) {
  const pos = geometry.attributes.position
  const faceCount = pos.count / 3
  const byVertex = new Map()
  for (let f = 0; f < faceCount; f++) {
    for (let v = 0; v < 3; v++) {
      const i = (f * 3 + v) * 3
      const key = `${pos.array[i].toFixed(4)},${pos.array[i + 1].toFixed(4)},${pos.array[i + 2].toFixed(4)}`
      if (!byVertex.has(key)) byVertex.set(key, [])
      byVertex.get(key).push(f)
    }
  }
  const neighbours = Array.from({ length: faceCount }, () => new Set())
  for (const faces of byVertex.values()) {
    for (const a of faces) {
      for (const b of faces) {
        if (a !== b) neighbours[a].add(b)
      }
    }
  }
  const toneOf = new Array(faceCount).fill(-1)
  const usedTones = (f) =>
    new Set([...neighbours[f]].map((n) => toneOf[n]).filter((t) => t >= 0))
  for (let coloured = 0; coloured < faceCount; coloured++) {
    let best = -1
    let bestSat = -1
    let bestDeg = -1
    for (let f = 0; f < faceCount; f++) {
      if (toneOf[f] >= 0) continue
      const sat = usedTones(f).size
      const deg = neighbours[f].size
      if (sat > bestSat || (sat === bestSat && deg > bestDeg)) {
        best = f
        bestSat = sat
        bestDeg = deg
      }
    }
    const used = usedTones(best)
    let pick = 0
    while (pick < tones.length && used.has(pick)) pick++
    if (pick >= tones.length) {
      // Should not happen for a 3-colourable graph with six tones;
      // fall back to the tone used by the fewest neighbours.
      let fewest = Infinity
      for (let t = 0; t < tones.length; t++) {
        let conflicts = 0
        for (const n of neighbours[best]) {
          if (toneOf[n] === t) conflicts++
        }
        if (conflicts < fewest) {
          fewest = conflicts
          pick = t
        }
      }
    }
    toneOf[best] = pick
  }
  const colors = new Float32Array(pos.count * 3)
  const tone = new THREE.Color()
  for (let f = 0; f < faceCount; f++) {
    tone.set(tones[toneOf[f]])
    for (let v = 0; v < 3; v++) {
      const i = (f * 3 + v) * 3
      colors[i] = tone.r
      colors[i + 1] = tone.g
      colors[i + 2] = tone.b
    }
  }
  return { attribute: new THREE.BufferAttribute(colors, 3), faceCount, toneOf, neighbours }
}
