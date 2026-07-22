import { useRef, useEffect, useCallback, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const GOLD = '#C9A96E'
const IN_FLOW = 'rgba(61,214,140,'   // Arkham inbound green
const OUT_FLOW = 'rgba(240,113,120,' // Arkham outbound red

function hash01(id) {
  let h = 2166136261
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
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
  }

  const nodes = [main, ...members.map((m, i) => {
    const a = (i / Math.max(1, members.length)) * Math.PI * 2 + hash01(m.id) * 0.4
    const r = 95 + hash01(`${m.id}-r`) * 170
    return {
      ...m,
      isHub: false,
      flow: hash01(m.id) > 0.5 ? 'in' : 'out',
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
    }
  })]

  const links = members.map((m) => ({
    source: 'main',
    target: m.id,
    flow: hash01(m.id) > 0.5 ? 'in' : 'out',
    color: m.color || GOLD,
  }))

  return { nodes, links }
}

/**
 * Arkham Visualizer–style 2D force graph (hub sunburst + flow-colored links).
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
  const [graphData, setGraphData] = useState(() => buildGraph(members))
  const [imgTick, setImgTick] = useState(0)

  useEffect(() => { collapsedRef.current = collapsed }, [collapsed])

  // Merge live members without killing physics positions
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
          if (cur.avatar !== n.avatar) {
            cur.avatar = n.avatar
            cur.__img = undefined
          }
        }
        const hub = oldMap.get('main')
        if (hub) { hub.fx = 0; hub.fy = 0 }
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
        }
      })
      const hub = nodes.find(n => n.isHub)
      if (hub) { hub.fx = 0; hub.fy = 0; hub.x = 0; hub.y = 0 }
      return { nodes, links: fresh.links }
    })
  }, [members])

  const applyForces = useCallback((isCollapsed) => {
    const fg = fgRef.current
    if (!fg) return

    const charge = fg.d3Force('charge')
    if (charge) {
      charge.strength(n => (n.isHub ? 0 : (isCollapsed ? -14 : -42)))
      if (typeof charge.distanceMax === 'function') charge.distanceMax(isCollapsed ? 100 : 240)
    }

    const link = fg.d3Force('link')
    if (link) {
      link
        .distance(isCollapsed ? 26 : 125)
        .strength(isCollapsed ? 1 : 0.48)
    }

    // Keep cluster centered like Arkham
    try {
      fg.d3Force('center')?.strength?.(0.04)
      fg.d3Force('x')?.strength?.(0.025)
      fg.d3Force('y')?.strength?.(0.025)
    } catch { /* ignore */ }

    if (typeof fg.d3AlphaTarget === 'function') {
      fg.d3AlphaTarget(isCollapsed ? 0.1 : 0.015)
    }
    fg.d3ReheatSimulation()
  }, [])

  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    const t = setTimeout(() => {
      applyForces(collapsedRef.current)
      fg.centerAt(0, 0, 0)
      try { fg.zoomToFit(650, 56) } catch { fg.zoom(1.05, 0) }
    }, 80)
    return () => clearTimeout(t)
  }, [applyForces, width, height, graphData.nodes.length])

  useEffect(() => {
    applyForces(collapsed)
    const fg = fgRef.current
    if (!fg) return
    fg.centerAt(0, 0, 550)
    if (collapsed) fg.zoom(1.7, 550)
    else {
      try { fg.zoomToFit(650, 56) } catch { fg.zoom(1.05, 550) }
    }
  }, [collapsed, applyForces])

  useEffect(() => {
    if (!focusId || !fgRef.current) return
    const node = graphData.nodes.find(n => n.id === focusId)
    if (!node || !Number.isFinite(node.x)) return
    fgRef.current.centerAt(node.x, node.y, 700)
    fgRef.current.zoom(2.5, 700)
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

    const nx = -dy / len
    const ny = dx / len
    const bend = isHot ? 16 : 7 + hash01(typeof t.id === 'string' ? t.id : '') * 6
    const cpx = (s.x + t.x) / 2 + nx * bend
    const cpy = (s.y + t.y) / 2 + ny * bend

    const grd = ctx.createLinearGradient(s.x, s.y, t.x, t.y)
    if (isHot) {
      grd.addColorStop(0, 'rgba(201,169,110,0.9)')
      grd.addColorStop(1, `${t.color || GOLD}dd`)
    } else if (link.flow === 'in') {
      grd.addColorStop(0, `${IN_FLOW}0.06)`)
      grd.addColorStop(1, `${IN_FLOW}0.5)`)
    } else {
      grd.addColorStop(0, `${OUT_FLOW}0.06)`)
      grd.addColorStop(1, `${OUT_FLOW}0.48)`)
    }

    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.quadraticCurveTo(cpx, cpy, t.x, t.y)
    ctx.strokeStyle = grd
    ctx.lineWidth = isHot ? 1.7 : 0.65
    ctx.globalAlpha = collapsedRef.current ? 0.3 : 1
    ctx.stroke()
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
    fgRef.current?.d3ReheatSimulation()
  }, [])

  const handleDragEnd = useCallback((node) => {
    if (!node || node.isHub) return
    node.fx = undefined
    node.fy = undefined
    const fg = fgRef.current
    if (!fg) return
    if (typeof fg.d3AlphaTarget === 'function') {
      fg.d3AlphaTarget(0.3)
      setTimeout(() => {
        fg.d3AlphaTarget?.(collapsedRef.current ? 0.1 : 0.015)
      }, 850)
    }
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
      cooldownTicks={240}
      d3AlphaDecay={0.016}
      d3VelocityDecay={0.24}
      warmupTicks={50}
      nodeRelSize={6}
    />
  )
}
