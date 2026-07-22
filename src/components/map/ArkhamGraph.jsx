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

/**
 * Circular yoyo map with jellyfish strings — performant redraw loop.
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
  const hoveredRef = useRef(hoveredId)
  const selectedRef = useRef(selectedId)
  const draggingIdRef = useRef(null)
  const rotationRef = useRef(0)
  const lastTickRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0)
  const graphDataRef = useRef(null)
  const timeRef = useRef(0)
  const [graphData, setGraphData] = useState(() => buildGraph(members))
  const [imgTick, setImgTick] = useState(0)

  useEffect(() => { collapsedRef.current = collapsed }, [collapsed])
  useEffect(() => { hoveredRef.current = hoveredId }, [hoveredId])
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])
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
      if (nodes.some(n => !n.isHub && n._baseA == null)) {
        assignCircularOrbits(nodes.filter(n => !n.isHub))
      }
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
      charge.strength(n => (n.isHub ? 0 : (isCollapsed ? -6 : -18)))
      if (typeof charge.distanceMax === 'function') charge.distanceMax(isCollapsed ? 60 : 100)
    }

    const link = fg.d3Force('link')
    if (link) {
      link
        .distance(l => {
          const t = typeof l.target === 'object' ? l.target : null
          return isCollapsed ? 22 : (t?._ringR || 120)
        })
        .strength(isCollapsed ? 0.9 : 0.18)
    }

    // Low simmer — enough for slow spin, not a permanent CPU boil
    if (typeof fg.d3AlphaTarget === 'function') {
      fg.d3AlphaTarget(isCollapsed ? 0.05 : 0.025)
    }

    let nodeList = []
    const orbitForce = Object.assign(
      (alpha) => {
        const now = performance.now()
        const dt = Math.min(40, Math.max(0, now - lastTickRef.current))
        lastTickRef.current = now
        const collapsedNow = collapsedRef.current

        if (!collapsedNow) rotationRef.current += dt * 0.00014

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
          if (n.fx != null || n.fy != null) return

          if (n._baseA == null || n._ringR == null) {
            n._baseA = (i / Math.max(1, nodeList.length)) * Math.PI * 2
            n._ringR = 120
          }

          const R = collapsedNow ? 26 : n._ringR
          const A = n._baseA + rot
          const tx = Math.cos(A) * R
          const ty = Math.sin(A) * R

          const k = collapsedNow ? 0.26 : 0.1
          n.vx += (tx - (n.x || 0)) * k * (alpha + 0.12) * 12
          n.vy += (ty - (n.y || 0)) * k * (alpha + 0.12) * 12
        })
      },
      { initialize: (ns) => { nodeList = ns } },
    )

    fg.d3Force('orbit', orbitForce)
    fg.d3ReheatSimulation()
  }, [])

  // Lightweight visual refresh (~30fps) so strings keep jelly-waving without
  // forcing the physics engine to run at full tilt forever.
  useEffect(() => {
    let raf = 0
    let last = 0
    const loop = (ts) => {
      raf = requestAnimationFrame(loop)
      if (ts - last < 33) return
      last = ts
      timeRef.current = ts * 0.001
      const fg = fgRef.current
      if (fg && typeof fg.refresh === 'function') fg.refresh()
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
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
    ;(graphDataRef.current?.nodes || []).forEach(n => {
      if (n.isHub) { n.fx = 0; n.fy = 0 }
      else { n.fx = undefined; n.fy = undefined }
    })
    draggingIdRef.current = null
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
    const hid = hoveredRef.current
    const sid = selectedRef.current
    const isHot = node.id === hid || node.id === sid || node.id === draggingIdRef.current
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
  }, [imgTick])

  const drawLink = useCallback((link, ctx) => {
    const s = link.source
    const t = link.target
    if (typeof s !== 'object' || typeof t !== 'object') return
    if (![s.x, s.y, t.x, t.y].every(Number.isFinite)) return

    const dx = t.x - s.x
    const dy = t.y - s.y
    const len = Math.hypot(dx, dy) || 1
    const tid = t.id
    const isDrag = tid === draggingIdRef.current
    const isHot = tid === hoveredRef.current || tid === selectedRef.current || isDrag
    const rest = t._ringR || 120
    const stretch = Math.max(0, Math.min(2.5, len / rest - 1))
    const speed = Math.hypot(t.vx || 0, t.vy || 0)
    const nx = -dy / len
    const ny = dx / len
    const now = timeRef.current
    const seed = hash01(typeof tid === 'string' ? tid : String(tid || 0)) * Math.PI * 2

    // Jellyfish amplitude — big when dragging / stretched
    const amp =
      (isDrag ? 22 : 3) +
      stretch * 32 +
      (isHot ? 8 : 0) +
      Math.min(speed * 1.8, 18)

    const jelly = isDrag || stretch > 0.08 || isHot
    const segs = jelly ? 14 : 5

    const grd = ctx.createLinearGradient(s.x, s.y, t.x, t.y)
    if (isDrag || stretch > 0.12) {
      grd.addColorStop(0, 'rgba(201,169,110,0.95)')
      grd.addColorStop(0.5, link.flow === 'in' ? 'rgba(61,214,140,0.85)' : 'rgba(240,113,120,0.85)')
      grd.addColorStop(1, `${t.color || GOLD}ee`)
    } else if (link.flow === 'in') {
      grd.addColorStop(0, `${IN_FLOW}0.07)`)
      grd.addColorStop(1, `${IN_FLOW}0.5)`)
    } else {
      grd.addColorStop(0, `${OUT_FLOW}0.07)`)
      grd.addColorStop(1, `${OUT_FLOW}0.48)`)
    }

    ctx.beginPath()
    for (let i = 0; i <= segs; i++) {
      const u = i / segs
      // Envelope: 0 at hub & node, max in middle (true rubber string)
      const envelope = Math.sin(u * Math.PI)
      const wave =
        Math.sin(u * Math.PI * 3 + now * (isDrag ? 9 : 4.2) + seed) * amp * envelope +
        Math.sin(u * Math.PI * 5.5 - now * (isDrag ? 7 : 2.8) + seed * 1.7) * amp * 0.35 * envelope
      const x = s.x + dx * u + nx * wave
      const y = s.y + dy * u + ny * wave
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = grd
    ctx.lineWidth = isDrag || stretch > 0.2 ? 2.1 : (isHot ? 1.4 : 0.6)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.globalAlpha = collapsedRef.current ? 0.25 : 1
    ctx.stroke()

    // Flow pulse only on active strings (avoids hanging on 400×3 dots)
    if (!collapsedRef.current && (isDrag || isHot || stretch > 0.2)) {
      const dir = link.flow === 'in' ? -1 : 1
      const phase = (now * 0.7 * dir + seed) % 1
      for (let i = 0; i < 2; i++) {
        const u = (phase + i / 2) % 1
        const envelope = Math.sin(u * Math.PI)
        const wave = Math.sin(u * Math.PI * 3 + now * 5 + seed) * amp * envelope
        const x = s.x + dx * u + nx * wave
        const y = s.y + dy * u + ny * wave
        ctx.beginPath()
        ctx.arc(x, y, isDrag ? 2.4 : 1.5, 0, Math.PI * 2)
        ctx.fillStyle = link.flow === 'in'
          ? 'rgba(61,214,140,0.85)'
          : 'rgba(240,113,120,0.85)'
        ctx.fill()
      }
    }

    ctx.globalAlpha = 1
  }, [])

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
    draggingIdRef.current = node.id
    node.fx = node.x
    node.fy = node.y
    // Soft reheat only — do NOT spike alpha every pointer move (that caused hangs)
    const fg = fgRef.current
    if (fg && typeof fg.d3AlphaTarget === 'function') {
      const a = typeof fg.d3Alpha === 'function' ? fg.d3Alpha() : 0
      if (a < 0.15) {
        fg.d3AlphaTarget(0.2)
        fg.d3ReheatSimulation()
      }
    }
  }, [])

  const handleDragEnd = useCallback((node) => {
    if (!node || node.isHub) return
    draggingIdRef.current = null
    node.fx = undefined
    node.fy = undefined
    node.vx = (node.vx || 0) * 0.35
    node.vy = (node.vy || 0) * 0.35
    const fg = fgRef.current
    if (!fg) return
    fg.d3AlphaTarget?.(0.4)
    fg.d3ReheatSimulation()
    setTimeout(() => {
      fg.d3AlphaTarget?.(collapsedRef.current ? 0.05 : 0.025)
    }, 900)
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
      cooldownTicks={180}
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.28}
      warmupTicks={35}
      nodeRelSize={6}
    />
  )
}
