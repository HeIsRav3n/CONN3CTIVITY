import { useRef, useEffect, useCallback, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const GOLD = '#C9A96E'
const IN_FLOW = 'rgba(61,214,140,'
const OUT_FLOW = 'rgba(240,113,120,'

function hash01(id) {
  let h = 2166136261
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

/** Pack members onto concentric rings (circular pattern). */
function assignCircularOrbits(members) {
  let idx = 0
  let ring = 0
  const baseR = 88
  const ringGap = 38
  const spacing = 26

  while (idx < members.length) {
    const R = baseR + ring * ringGap
    const capacity = Math.max(12, Math.floor((2 * Math.PI * R) / spacing))
    const count = Math.min(capacity, members.length - idx)
    const angleOffset = ring * 0.19
    for (let i = 0; i < count; i++) {
      const m = members[idx + i]
      const jitter = ((i * 13) % 5) - 2
      m._ringR = R + jitter
      m._baseA = (i / count) * Math.PI * 2 + angleOffset
      m.x = Math.cos(m._baseA) * m._ringR
      m.y = Math.sin(m._baseA) * m._ringR
      m.vx = 0
      m.vy = 0
    }
    idx += count
    ring += 1
  }
}

function buildGraph(members) {
  const main = {
    id: 'main',
    name: 'CONN3CTIVITY',
    color: GOLD,
    avatar: '/map-logo.png',
    isHub: true,
    fx: 0,
    fy: 0,
    x: 0,
    y: 0,
  }

  const kids = members.map((m) => ({
    ...m,
    isHub: false,
    flow: hash01(m.id) > 0.5 ? 'in' : 'out',
  }))
  assignCircularOrbits(kids)

  const links = kids.map((m) => ({
    source: 'main',
    target: m.id,
    flow: m.flow,
    color: m.color || GOLD,
  }))

  return { nodes: [main, ...kids], links }
}

/** Sample a point on a quadratic bezier */
function quadAt(sx, sy, cpx, cpy, tx, ty, t) {
  const u = 1 - t
  return {
    x: u * u * sx + 2 * u * t * cpx + t * t * tx,
    y: u * u * sy + 2 * u * t * cpy + t * t * ty,
  }
}

/**
 * Circular yoyo map — orbit slots, elastic drag, animated moving strings.
 */
export function ArkhamGraph({
  members = [],
  width = 800,
  height = 700,
  collapsed = false,
  selectedId = null,
  hoveredId = null,
  focusId = null,
  onHover,
  onSelect,
  onHubClick,
}) {
  const fgRef = useRef(null)
  const collapsedRef = useRef(collapsed)
  const rotationRef = useRef(0)
  const lastTickRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0)
  const graphDataRef = useRef(null)
  const [graphData, setGraphData] = useState(() => buildGraph(members))
  const [imgTick, setImgTick] = useState(0)

  useEffect(() => { collapsedRef.current = collapsed }, [collapsed])
  useEffect(() => { graphDataRef.current = graphData }, [graphData])

  useEffect(() => {
    const fresh = buildGraph(members)
    setGraphData((old) => {
      if (!old?.nodes?.length) return fresh
      const oldMap = new Map(old.nodes.map(n => [n.id, n]))
      const freshIds = new Set(fresh.nodes.map(n => n.id))
      const membershipChanged =
        old.nodes.length !== fresh.nodes.length ||
        fresh.nodes.some(n => !oldMap.has(n.id)) ||
        old.nodes.some(n => !n.isHub && !freshIds.has(n.id))

      if (!membershipChanged) {
        for (const n of fresh.nodes) {
          const cur = oldMap.get(n.id)
          if (!cur) continue
          cur.name = n.name
          cur.color = n.color
          cur.discordHandle = n.discordHandle
          cur.xHandle = n.xHandle
          cur.flow = n.flow
          if (n._ringR != null) {
            cur._ringR = n._ringR
            cur._baseA = n._baseA
          }
          if (cur.avatar !== n.avatar) {
            cur.avatar = n.avatar
            cur.__img = undefined
          }
        }
        const hub = oldMap.get('main')
        if (hub) { hub.fx = 0; hub.fy = 0; hub.x = 0; hub.y = 0 }
        return old
      }

      const nodes = fresh.nodes.map(n => {
        const prev = oldMap.get(n.id)
        if (!prev) return n
        return {
          ...n,
          x: prev.x,
          y: prev.y,
          vx: prev.vx,
          vy: prev.vy,
          fx: n.isHub ? 0 : prev.fx,
          fy: n.isHub ? 0 : prev.fy,
          __img: prev.__img,
          _ringR: n._ringR ?? prev._ringR,
          _baseA: n._baseA ?? prev._baseA,
        }
      })
      const needOrbit = nodes.some(n => !n.isHub && n._baseA == null)
      if (needOrbit) assignCircularOrbits(nodes.filter(n => !n.isHub))
      const hub = nodes.find(n => n.isHub)
      if (hub) { hub.fx = 0; hub.fy = 0; hub.x = 0; hub.y = 0 }
      return { nodes, links: fresh.links }
    })
  }, [members])

  const applyYoyoForces = useCallback((isCollapsed) => {
    const fg = fgRef.current
    if (!fg) return

    fg.d3Force('center', null)
    fg.d3Force('x', null)
    fg.d3Force('y', null)

    const charge = fg.d3Force('charge')
    if (charge) {
      charge.strength(n => (n.isHub ? 0 : (isCollapsed ? -8 : -22)))
      if (typeof charge.distanceMax === 'function') charge.distanceMax(isCollapsed ? 70 : 110)
    }

    const link = fg.d3Force('link')
    if (link) {
      link
        .distance(l => {
          const t = typeof l.target === 'object' ? l.target : null
          return isCollapsed ? 24 : (t?._ringR || 120)
        })
        // Soft enough to stretch on drag (yoyo string), strong enough to snap home
        .strength(isCollapsed ? 0.95 : 0.22)
    }

    // Keep simmering so strings keep animating + orbit spins
    if (typeof fg.d3AlphaTarget === 'function') {
      fg.d3AlphaTarget(isCollapsed ? 0.12 : 0.06)
    }

    let nodeList = []
    const orbitForce = Object.assign(
      (alpha) => {
        const now = performance.now()
        const dt = Math.min(40, Math.max(0, now - lastTickRef.current))
        lastTickRef.current = now
        const collapsedNow = collapsedRef.current

        if (!collapsedNow) rotationRef.current += dt * 0.00016

        const rot = rotationRef.current
        nodeList.forEach((n, i) => {
          if (n.isHub) {
            n.fx = 0
            n.fy = 0
            n.x = 0
            n.y = 0
            n.vx = 0
            n.vy = 0
            return
          }
          // Being dragged — leave pin alone (string stretches)
          if (n.fx != null || n.fy != null) return

          if (n._baseA == null || n._ringR == null) {
            n._baseA = (i / Math.max(1, nodeList.length)) * Math.PI * 2
            n._ringR = 120
          }

          const R = collapsedNow ? 28 : n._ringR
          const A = n._baseA + rot
          const tx = Math.cos(A) * R
          const ty = Math.sin(A) * R

          // Yoyo spring back to circular slot
          const k = collapsedNow ? 0.28 : 0.11
          n.vx += (tx - (n.x || 0)) * k * (alpha + 0.14) * 14
          n.vy += (ty - (n.y || 0)) * k * (alpha + 0.14) * 14

          // Living shimmer
          const wobble = collapsedNow ? 0.08 : 0.35
          n.vx += Math.sin(now * 0.0017 + i * 0.71) * wobble * alpha
          n.vy += Math.cos(now * 0.0014 + i * 0.53) * wobble * alpha
        })
      },
      { initialize: (ns) => { nodeList = ns } },
    )

    fg.d3Force('orbit', orbitForce)
    fg.d3ReheatSimulation()
  }, [])

  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    const t = setTimeout(() => {
      const nodes = graphDataRef.current?.nodes || []
      if (nodes.some(n => !n.isHub && n._baseA == null)) {
        assignCircularOrbits(nodes.filter(n => !n.isHub))
      }
      applyYoyoForces(collapsedRef.current)
      fg.centerAt(0, 0, 0)
      try { fg.zoomToFit(700, 52) } catch { fg.zoom(0.95, 0) }
    }, 80)
    return () => clearTimeout(t)
  }, [applyYoyoForces, width, height, graphData.nodes.length])

  useEffect(() => {
    applyYoyoForces(collapsed)
    const fg = fgRef.current
    if (!fg) return
    // Clear leftover drag pins on collapse toggle
    ;(graphDataRef.current?.nodes || []).forEach(n => {
      if (n.isHub) { n.fx = 0; n.fy = 0 }
      else { n.fx = undefined; n.fy = undefined }
    })
    fg.centerAt(0, 0, 550)
    if (collapsed) fg.zoom(1.55, 550)
    else {
      try { fg.zoomToFit(700, 52) } catch { fg.zoom(0.95, 550) }
    }
  }, [collapsed, applyYoyoForces])

  useEffect(() => {
    if (!focusId || !fgRef.current) return
    const node = graphData.nodes.find(n => n.id === focusId)
    if (!node || !Number.isFinite(node.x)) return
    fgRef.current.centerAt(node.x, node.y, 700)
    fgRef.current.zoom(2.6, 700)
  }, [focusId, graphData.nodes])

  const drawNode = useCallback((node, ctx, globalScale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return
    const isHub = node.isHub
    const isHot = node.id === hoveredId || node.id === selectedId
    const r = isHub ? 30 : (isHot ? 13 : 8.5)

    if (isHub || isHot) {
      const grd = ctx.createRadialGradient(node.x, node.y, r * 0.25, node.x, node.y, r + 16)
      grd.addColorStop(0, isHub ? 'rgba(201,169,110,0.5)' : `${node.color || GOLD}66`)
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 16, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()
    }

    ctx.save()
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.fillStyle = '#0b0b10'
    ctx.fill()
    ctx.clip()

    if (!node.__img && node.avatar) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => setImgTick(v => v + 1)
      img.src = node.avatar
      node.__img = img
    }
    if (node.__img?.complete && node.__img.naturalWidth > 0) {
      ctx.drawImage(node.__img, node.x - r, node.y - r, r * 2, r * 2)
    }
    ctx.restore()

    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.strokeStyle = isHub ? GOLD : (isHot ? (node.color || GOLD) : 'rgba(180,180,190,0.35)')
    ctx.lineWidth = isHub ? 2.6 : (isHot ? 2 : 0.9)
    ctx.stroke()

    if (isHub || isHot || globalScale > 2.4) {
      const fs = Math.max((isHub ? 11 : 8.5) / globalScale, 3.5)
      ctx.font = `500 ${fs}px "Josefin Sans", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = isHub ? GOLD : 'rgba(237,232,220,0.92)'
      ctx.fillText(node.name || '', node.x, node.y + r + 3 / globalScale)
    }
  }, [hoveredId, selectedId, imgTick])

  const drawLink = useCallback((link, ctx) => {
    const s = link.source
    const t = link.target
    if (typeof s !== 'object' || typeof t !== 'object') return
    if (![s.x, s.y, t.x, t.y].every(Number.isFinite)) return

    const dx = t.x - s.x
    const dy = t.y - s.y
    const len = Math.hypot(dx, dy) || 1
    const isHot =
      t.id === hoveredId || t.id === selectedId ||
      s.id === hoveredId || s.id === selectedId
    const rest = t._ringR || 120
    const stretch = Math.max(0, Math.min(2, len / rest - 1))

    const nx = -dy / len
    const ny = dx / len
    const now = performance.now() * 0.001
    const seed = hash01(typeof t.id === 'string' ? t.id : String(t.id || 0)) * Math.PI * 2

    // Moving string: wave travels along the spoke
    const wave = Math.sin(now * 3.2 + seed) * (4 + stretch * 10) + (isHot ? 8 : 0)
    const bend = (isHot ? 14 : 6) + stretch * 18 + wave
    const cpx = (s.x + t.x) / 2 + nx * bend
    const cpy = (s.y + t.y) / 2 + ny * bend

    const grd = ctx.createLinearGradient(s.x, s.y, t.x, t.y)
    if (isHot || stretch > 0.15) {
      grd.addColorStop(0, 'rgba(201,169,110,0.95)')
      grd.addColorStop(1, `${t.color || GOLD}ee`)
    } else if (link.flow === 'in') {
      grd.addColorStop(0, `${IN_FLOW}0.08)`)
      grd.addColorStop(1, `${IN_FLOW}0.55)`)
    } else {
      grd.addColorStop(0, `${OUT_FLOW}0.08)`)
      grd.addColorStop(1, `${OUT_FLOW}0.52)`)
    }

    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.quadraticCurveTo(cpx, cpy, t.x, t.y)
    ctx.strokeStyle = grd
    ctx.lineWidth = isHot || stretch > 0.2 ? 1.8 : 0.7
    ctx.globalAlpha = collapsedRef.current ? 0.28 : 1
    ctx.stroke()

    // Traveling dots along the string (flow motion)
    if (!collapsedRef.current) {
      const dir = link.flow === 'in' ? -1 : 1
      const phase = (now * 0.55 * dir + seed) % 1
      for (let i = 0; i < 3; i++) {
        const tt = (phase + i / 3) % 1
        const p = quadAt(s.x, s.y, cpx, cpy, t.x, t.y, tt)
        const pulse = 1.2 + Math.sin(now * 6 + i) * 0.35
        ctx.beginPath()
        ctx.arc(p.x, p.y, (isHot ? 1.8 : 1.1) * pulse, 0, Math.PI * 2)
        ctx.fillStyle = link.flow === 'in'
          ? `rgba(61,214,140,${0.35 + (isHot ? 0.4 : 0)})`
          : `rgba(240,113,120,${0.35 + (isHot ? 0.4 : 0)})`
        ctx.fill()
      }
    }

    ctx.globalAlpha = 1
  }, [hoveredId, selectedId])

  const handleClick = useCallback((node) => {
    if (!node || node.isHub) {
      onHubClick?.()
      return
    }
    onSelect?.(node)
  }, [onHubClick, onSelect])

  const handleHover = useCallback((node) => {
    onHover?.(node && !node.isHub ? node : null)
    document.body.style.cursor = node ? 'pointer' : 'default'
  }, [onHover])

  const handleDrag = useCallback((node) => {
    if (!node || node.isHub) return
    node.fx = node.x
    node.fy = node.y
    // Keep simulation hot so the string stretches live
    const fg = fgRef.current
    if (fg) {
      fg.d3AlphaTarget?.(0.45)
      fg.d3ReheatSimulation()
    }
  }, [])

  const handleDragEnd = useCallback((node) => {
    if (!node || node.isHub) return
    // Release — yoyo spring snaps back to circular slot
    node.fx = undefined
    node.fy = undefined
    node.vx = (node.vx || 0) * 0.4
    node.vy = (node.vy || 0) * 0.4
    const fg = fgRef.current
    if (!fg) return
    fg.d3AlphaTarget?.(0.55)
    setTimeout(() => {
      fg.d3AlphaTarget?.(collapsedRef.current ? 0.12 : 0.06)
    }, 1100)
    fg.d3ReheatSimulation()
  }, [])

  return (
    <ForceGraph2D
      ref={fgRef}
      width={width}
      height={height}
      graphData={graphData}
      nodeId="id"
      nodeCanvasObject={drawNode}
      nodeCanvasObjectMode={() => 'replace'}
      linkCanvasObject={drawLink}
      linkCanvasObjectMode={() => 'replace'}
      backgroundColor="#0a0a0e"
      enableNodeDrag
      enableZoomPanInteraction
      onNodeClick={handleClick}
      onNodeHover={handleHover}
      onNodeDrag={handleDrag}
      onNodeDragEnd={handleDragEnd}
      autoPauseRedraw={false}
      cooldownTicks={Infinity}
      d3AlphaDecay={0.006}
      d3VelocityDecay={0.22}
      warmupTicks={40}
      nodeRelSize={6}
    />
  )
}
