import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ForceGraph2D from 'react-force-graph-2d'
import STATIC_DATA from '../data/conn3ctors.json'
import { sql } from '../lib/neon'

const FALLBACK = STATIC_DATA?.nodes ? STATIC_DATA : { nodes: [], links: [] }

const buildLiveGraph = (rows) => {
  const main = { id: 'main', name: 'CONN3CTIVITY', group: 0, color: '#C9A96E', avatar: '/map-logo.png' }
  const nodes = [main, ...rows.map(r => ({
    id: r.id, name: r.name,
    discordHandle: r.discord_handle,
    xHandle: r.x_handle || null,
    group: r.group || 1,
    color: r.color || '#C9A96E',
    avatar: r.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`,
  }))]
  const links = rows.map(r => ({ source: 'main', target: r.id, color: r.color }))
  return { nodes, links }
}

export function MapSection() {
  const containerRef = useRef(null)
  const fgRef         = useRef(null)
  const [dimensions,    setDimensions]    = useState({ width: 800, height: 700 })
  const [graphData,     setGraphData]     = useState(FALLBACK)
  const [isLive,        setIsLive]        = useState(false)
  const [hoveredNode,   setHoveredNode]   = useState(null)
  const [selectedNode,  setSelectedNode]  = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return
    const measure = () => {
      const r = containerRef.current?.getBoundingClientRect()
      if (r?.width) setDimensions({ width: r.width, height: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Load live data from Neon
  useEffect(() => {
    async function load() {
      try {
        const rows = await sql`SELECT id, name, discord_handle, avatar, color, "group", x_handle FROM conn3ctors ORDER BY name`
        if (rows?.length) { setGraphData(buildLiveGraph(rows)); setIsLive(true) }
      } catch {}
    }
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  // Physics — runs whenever graphData reloads
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    // Strong central repulsion so nodes spread wide
    fg.d3Force('charge').strength(n => n.id === 'main' ? -4000 : -80)
    fg.d3Force('link').distance(160).strength(0.35)

    // Gentle continuous drift so the map is always "breathing"
    let nodeList = []
    const driftForce = Object.assign(
      () => {
        const t = Date.now() * 0.001
        nodeList.forEach((n, i) => {
          if (n.id !== 'main' && !n.fx) {
            n.vx += Math.sin(t * 0.35 + i * 0.53) * 0.06
            n.vy += Math.cos(t * 0.28 + i * 0.79) * 0.06
          }
        })
      },
      { initialize: ns => { nodeList = ns } }
    )
    fg.d3Force('drift', driftForce)
  }, [graphData])

  // Fetch localStorage profile when node selected
  useEffect(() => {
    if (!selectedNode) { setSelectedProfile(null); return }
    try {
      const raw = localStorage.getItem(`profile_${selectedNode.id}`)
      if (raw) {
        const p = JSON.parse(raw)
        setSelectedProfile({ twitter: p.twitter, telegram: p.telegram, cm_type: p.cmType, services: p.services, experience: p.experience, communities: p.communities, role: p.role })
      } else {
        setSelectedProfile(null)
      }
    } catch { setSelectedProfile(null) }
  }, [selectedNode])

  // ── Node renderer ────────────────────────────────────────────────────────────
  const drawNode = useCallback((node, ctx, gs) => {
    const isMain     = node.id === 'main'
    const isHovered  = hoveredNode?.id  === node.id
    const isSelected = selectedNode?.id === node.id
    const r = isMain ? 30 : (isHovered || isSelected) ? 17 : 13

    // Outer glow ring
    if (isMain || isHovered || isSelected) {
      const glowR = r + (isMain ? 8 : 5)
      const grd = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, glowR)
      grd.addColorStop(0, `${node.color}50`)
      grd.addColorStop(1, `${node.color}00`)
      ctx.beginPath()
      ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()
    }

    // Clip & fill avatar
    ctx.save()
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.fillStyle = '#0d0d14'
    ctx.fill()
    ctx.clip()

    if (!node._img && node.avatar) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = node.avatar
      node._img = img
    }
    if (node._img?.complete && node._img.naturalWidth > 0) {
      ctx.drawImage(node._img, node.x - r, node.y - r, r * 2, r * 2)
    }
    ctx.restore()

    // Border ring
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.strokeStyle = isMain
      ? '#C9A96E'
      : (isHovered || isSelected) ? node.color : `${node.color}55`
    ctx.lineWidth = isMain ? 2.5 : (isHovered || isSelected) ? 2 : 1
    ctx.stroke()

    // Role dot
    if (!isMain) {
      ctx.beginPath()
      ctx.arc(node.x + r * 0.68, node.y + r * 0.68, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = node.color
      ctx.fill()
      ctx.strokeStyle = '#07070b'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Labels — always for main + hovered/selected, else only when zoomed in
    if (isMain || isHovered || isSelected || gs > 4) {
      const fs = Math.max(isMain ? 10 / gs : 8 / gs, isMain ? 6 : 4)
      ctx.font = `500 ${fs}px 'Josefin Sans', sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = isMain ? '#C9A96E' : 'rgba(237,232,220,0.9)'
      ctx.fillText(node.name, node.x, node.y + r + fs + 2)
    }
  }, [hoveredNode, selectedNode])

  // ── Link renderer ────────────────────────────────────────────────────────────
  const drawLink = useCallback((link, ctx) => {
    const s = link.source
    const t = link.target
    if (typeof s !== 'object' || typeof t !== 'object') return

    const isHighlit = hoveredNode?.id === t.id || selectedNode?.id === t.id
    const grd = ctx.createLinearGradient(s.x, s.y, t.x, t.y)
    grd.addColorStop(0, isHighlit ? 'rgba(201,169,110,0.8)' : 'rgba(201,169,110,0.25)')
    grd.addColorStop(1, isHighlit ? `${t.color}cc` : `${t.color}20`)

    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.lineTo(t.x, t.y)
    ctx.strokeStyle = grd
    ctx.lineWidth   = isHighlit ? 1.5 : 0.6
    ctx.stroke()
  }, [hoveredNode, selectedNode])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback(node => {
    if (!node || node.id === 'main') {
      setSelectedNode(null)
      graphData.nodes.forEach(n => { n.fx = undefined; n.fy = undefined })
      fgRef.current?.d3ReheatSimulation()
      return
    }
    setSelectedNode(prev => prev?.id === node.id ? null : node)
    fgRef.current?.centerAt(node.x, node.y, 800)
    fgRef.current?.zoom(2.8, 800)
  }, [graphData])

  const handleNodeHover = useCallback(node => {
    setHoveredNode(node || null)
    document.body.style.cursor = node ? 'pointer' : 'default'
  }, [])

  const handleNodeDragEnd = useCallback(node => {
    node.fx = node.x
    node.fy = node.y
    fgRef.current?.d3ReheatSimulation()
  }, [])

  return (
    <section id="map" className="relative py-24 px-4 overflow-hidden" style={{ background: '#07070b' }}>

      {/* Subtle radial bg */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(201,169,110,0.04) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="tag-gold inline-flex">ROLE: CONN3CTOR</div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-['Josefin_Sans'] tracking-widest uppercase"
              style={{
                background: isLive ? 'rgba(34,197,94,0.1)' : 'rgba(201,169,110,0.1)',
                border: `1px solid ${isLive ? 'rgba(34,197,94,0.3)' : 'rgba(201,169,110,0.2)'}`,
                color: isLive ? '#22c55e' : '#C9A96E',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isLive ? '#22c55e' : '#C9A96E' }} />
              {isLive ? 'Live' : 'Static'}
            </div>
          </div>
          <h2 className="font-orbitron font-bold text-4xl md:text-5xl text-cream mb-4">
            THE CONN3CTION MAP
          </h2>
          <p className="font-space text-cream-muted max-w-xl mx-auto text-sm leading-relaxed" style={{ color: 'rgba(237,232,220,0.4)' }}>
            Drag nodes · Click to inspect · Scroll to zoom · Pan freely
          </p>
        </motion.div>

        {/* Graph container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          ref={containerRef}
          className="w-full relative"
          style={{
            height: 'clamp(500px, 75vh, 840px)',
            borderRadius: 28,
            overflow: 'hidden',
            background: 'radial-gradient(ellipse at center, rgba(20,20,32,0.9) 0%, #07070b 100%)',
            border: '1px solid rgba(201,169,110,0.12)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 40px 80px rgba(0,0,0,0.7)',
          }}
        >
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeCanvasObject={drawNode}
            nodeCanvasObjectMode={() => 'replace'}
            linkCanvasObject={drawLink}
            linkCanvasObjectMode={() => 'replace'}
            backgroundColor="transparent"
            enableNodeDrag
            enableZoomPanInteraction
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onNodeDragEnd={handleNodeDragEnd}
            cooldownTicks={Infinity}
            d3AlphaDecay={0}
            d3VelocityDecay={0.55}
            warmupTicks={120}
            nodeRelSize={1}
          />

          {/* Corner hint */}
          <div
            className="absolute top-4 left-4 font-['Josefin_Sans'] text-[0.45rem] tracking-[0.25em] uppercase pointer-events-none"
            style={{ color: 'rgba(201,169,110,0.3)' }}
          >
            {graphData.nodes.length - 1} Conn3ctors
          </div>

          {/* Profile card */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="absolute bottom-6 right-6 z-50 w-[300px]"
              >
                <div
                  className="rounded-[20px] overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: `0 24px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 30px ${selectedNode.color}20`,
                    backdropFilter: 'blur(24px)',
                  }}
                >
                  {/* Sheen */}
                  <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />

                  <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={selectedNode.avatar}
                          alt={selectedNode.name}
                          className="w-14 h-14 rounded-xl object-cover"
                          style={{ border: `2px solid ${selectedNode.color}60` }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full" style={{ border: '2px solid #07070b' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-orbitron font-bold text-base text-white truncate">{selectedNode.name}</div>
                        <div className="font-['Josefin_Sans'] text-[0.6rem] tracking-[0.2em] uppercase truncate" style={{ color: 'rgba(237,232,220,0.4)' }}>
                          {selectedNode.discordHandle}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>

                    {/* Role badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className="px-2.5 py-1 rounded-full font-['Josefin_Sans'] text-[0.5rem] tracking-[0.25em] uppercase font-semibold"
                        style={{ background: `${selectedNode.color}18`, border: `1px solid ${selectedNode.color}40`, color: selectedNode.color }}
                      >
                        Conn3ctor
                      </div>
                      {selectedNode.xHandle && (
                        <a
                          href={`https://x.com/${selectedNode.xHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(237,232,220,0.7)', fontSize: '0.5rem', letterSpacing: '0.15em', fontFamily: 'Josefin Sans' }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          @{selectedNode.xHandle.replace('@', '')}
                        </a>
                      )}
                    </div>

                    {/* Profile data if available */}
                    {selectedProfile && (
                      <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {selectedProfile.experience && (
                          <div className="font-['Josefin_Sans'] text-[0.55rem] tracking-widest" style={{ color: 'rgba(237,232,220,0.5)' }}>
                            <span style={{ color: '#C9A96E' }}>EXP · </span>{selectedProfile.experience}
                          </div>
                        )}
                        {selectedProfile.services && (
                          <div className="font-['Josefin_Sans'] text-[0.55rem] tracking-widest" style={{ color: 'rgba(237,232,220,0.5)' }}>
                            <span style={{ color: '#C9A96E' }}>SERVICES · </span>{selectedProfile.services}
                          </div>
                        )}
                        {selectedProfile.telegram && (
                          <a
                            href={`https://t.me/${selectedProfile.telegram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 font-['Josefin_Sans'] text-[0.5rem] tracking-widest"
                            style={{ color: '#0088cc' }}
                          >
                            TG · {selectedProfile.telegram}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
