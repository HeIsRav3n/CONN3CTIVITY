import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ForceGraph2D from 'react-force-graph-2d'
import STATIC_DATA from '../data/conn3ctors.json'
import { sql } from '../lib/neon'
import { supabase } from '../lib/supabase'

const FALLBACK = STATIC_DATA?.nodes ? STATIC_DATA : { nodes: [], links: [] }

const buildLiveGraph = (rows) => {
  const main = { id: 'main', name: 'CONN3CTIVITY', group: 0, color: '#C9A96E', avatar: '/map-logo.png' }
  const nodes = [main, ...rows.map(r => ({
    id: r.id,
    name: r.name,
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
  const containerRef  = useRef(null)
  const fgRef         = useRef(null)
  const collapsedRef  = useRef(false)

  const [dimensions,    setDimensions]    = useState({ width: 800, height: 700 })
  const [graphData,     setGraphData]     = useState(FALLBACK)
  const [isLive,        setIsLive]        = useState(false)
  const [hoveredNode,   setHoveredNode]   = useState(null)
  const [selectedNode,  setSelectedNode]  = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [collapsed,     setCollapsed]     = useState(false)
  const [renderTrigger, setRenderTrigger] = useState(0)

  // Container dimensions
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

  // Live data — 30 s refresh
  useEffect(() => {
    async function load() {
      try {
        const rows = await sql`
          SELECT id, name, discord_handle, avatar, color, "group", x_handle
          FROM conn3ctors
          ORDER BY name
        `
        if (rows?.length) {
          const fresh = buildLiveGraph(rows)
          setGraphData(old => {
            if (!old || !old.nodes) return fresh
            const nodeMap = new Map(old.nodes.map(n => [n.id, n]))
            const mergedNodes = fresh.nodes.map(node => {
              const oldNode = nodeMap.get(node.id)
              if (oldNode) {
                return {
                  ...node,
                  x: oldNode.x,
                  y: oldNode.y,
                  vx: oldNode.vx,
                  vy: oldNode.vy,
                  fx: oldNode.fx,
                  fy: oldNode.fy
                }
              }
              return node
            })
            return { nodes: mergedNodes, links: fresh.links }
          })
          setIsLive(true)
        }
      } catch {}
    }
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  // D3 physics + drift
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    const isC = collapsed

    // Adjust forces based on collapse state for organic jelly motion
    fg.d3Force('charge').strength(n => {
      if (n.id === 'main') {
        return isC ? -150 : -4000
      }
      return isC ? -15 : -80
    })

    fg.d3Force('link')
      .distance(isC ? 22 : 160)
      .strength(isC ? 0.8 : 0.35)

    let nodeList = []
    const driftForce = Object.assign(
      (alpha) => {
        const t = Date.now() * 0.001
        nodeList.forEach((n, i) => {
          if (n.id !== 'main' && !n.fx) {
            n.vx += Math.sin(t * 0.35 + i * 0.53) * alpha * 0.4
            n.vy += Math.cos(t * 0.28 + i * 0.79) * alpha * 0.4
          }
        })
      },
      { initialize: ns => { nodeList = ns } }
    )
    fg.d3Force('drift', driftForce)

    // Gentle reheat every 3 s — keeps lines dancing
    const id = setInterval(() => {
      fg.d3ReheatSimulation()
    }, 3000)
    return () => clearInterval(id)
  }, [graphData, collapsed])

  // Profile from Supabase & localStorage
  useEffect(() => {
    if (!selectedNode) { setSelectedProfile(null); return }
    let active = true

    async function loadProfile() {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', selectedNode.id)
            .maybeSingle()

          if (active && data) {
            setSelectedProfile({
              twitter: data.twitter || null,
              telegram: data.telegram || null,
              cm_type: data.cm_type || null,
              services: data.services || null,
              experience: data.experience || null,
              communities: data.communities || [],
              role: data.role || null,
            })
            return
          }
        } catch (err) {
          console.warn('Error loading profile from Supabase:', err)
        }
      }

      if (!active) return
      try {
        const raw = localStorage.getItem(`profile_${selectedNode.id}`)
        if (raw) {
          const p = JSON.parse(raw)
          setSelectedProfile({
            twitter: p.twitter || null,
            telegram: p.telegram || null,
            cm_type: p.cmType || p.cm_type || null,
            services: p.services || null,
            experience: p.experience || null,
            communities: p.communities || [],
            role: p.role || null,
          })
        } else {
          setSelectedProfile(null)
        }
      } catch {
        setSelectedProfile(null)
      }
    }

    loadProfile()
    return () => { active = false }
  }, [selectedNode])

  // ── Collapse / expand all nodes toward center ─────────────────────────────────
  const toggleCollapse = useCallback(() => {
    const fg = fgRef.current
    if (!fg) return

    if (!collapsedRef.current) {
      // Unfix any fixed positions when collapsing so nodes fall back to center organically
      graphData.nodes.forEach(n => {
        if (n.id !== 'main') { n.fx = undefined; n.fy = undefined }
      })
      collapsedRef.current = true
      setCollapsed(true)
      setSelectedNode(null)
      fg.d3ReheatSimulation()
    } else {
      collapsedRef.current = false
      setCollapsed(false)
      fg.d3ReheatSimulation()
    }
  }, [graphData])

  // ── Node renderer ─────────────────────────────────────────────────────────────
  const drawNode = useCallback((node, ctx, gs) => {
    if (!isFinite(node.x) || !isFinite(node.y)) return

    const isMain     = node.id === 'main'
    const isHovered  = hoveredNode?.id  === node.id
    const isSelected = selectedNode?.id === node.id
    const isC        = collapsedRef.current
    const r          = isMain ? 30 : (isHovered || isSelected) ? 17 : 13

    if (isMain || isHovered || isSelected) {
      const glowR  = r + (isMain ? (isC ? 18 : 8) : 5)
      const glowCol = isMain && isC ? '#22c55e' : node.color
      const grd = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, glowR)
      grd.addColorStop(0, `${glowCol}55`)
      grd.addColorStop(1, `${glowCol}00`)
      ctx.beginPath()
      ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()
    }

    // ── Pulsing ring on main when collapsed ───────────────────────────────────
    if (isMain && isC) {
      const t    = Date.now() * 0.003
      const pulR = r + 12 + Math.sin(t) * 4
      ctx.beginPath()
      ctx.arc(node.x, node.y, pulR, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(34,197,94,0.35)'
      ctx.lineWidth   = 1.2
      ctx.stroke()
    }

    // ── Avatar clip & fill ────────────────────────────────────────────────────
    ctx.save()
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.fillStyle = '#0d0d14'
    ctx.fill()
    ctx.clip()
    if (!node._img && node.avatar) {
      const img       = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        setRenderTrigger(prev => prev + 1)
      }
      img.src         = node.avatar
      node._img       = img
    }
    if (node._img?.complete && node._img.naturalWidth > 0) {
      ctx.drawImage(node._img, node.x - r, node.y - r, r * 2, r * 2)
    }
    ctx.restore()

    // ── Border ────────────────────────────────────────────────────────────────
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.strokeStyle = isMain
      ? (isC ? '#22c55e' : '#C9A96E')
      : (isHovered || isSelected) ? node.color : `${node.color}55`
    ctx.lineWidth   = isMain ? 2.5 : (isHovered || isSelected) ? 2 : 1
    ctx.stroke()

    // ── Collapse / expand icon overlay on main ────────────────────────────────
    if (isMain) {
      const fs = Math.max(11 / gs, 5)
      ctx.font          = `600 ${fs}px 'Josefin Sans', sans-serif`
      ctx.textAlign     = 'center'
      ctx.textBaseline  = 'middle'
      ctx.fillStyle     = isC ? 'rgba(34,197,94,0.85)' : 'rgba(201,169,110,0.6)'
      ctx.fillText(isC ? '+' : '', node.x, node.y + r + fs + 2 / gs)
    }

    // ── Role dot ──────────────────────────────────────────────────────────────
    if (!isMain) {
      ctx.beginPath()
      ctx.arc(node.x + r * 0.68, node.y + r * 0.68, 3.5, 0, Math.PI * 2)
      ctx.fillStyle   = node.color
      ctx.fill()
      ctx.strokeStyle = '#07070b'
      ctx.lineWidth   = 1
      ctx.stroke()
    }

    // ── Labels ────────────────────────────────────────────────────────────────
    if (isMain || isHovered || isSelected || gs > 4) {
      const fs = Math.max(isMain ? 10 / gs : 8 / gs, isMain ? 6 : 4)
      ctx.font         = `500 ${fs}px 'Josefin Sans', sans-serif`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle    = isMain ? '#C9A96E' : 'rgba(237,232,220,0.9)'
      ctx.fillText(node.name, node.x, node.y + r + 3 / gs)
    }
  }, [hoveredNode, selectedNode, renderTrigger])
  // ── Link renderer — dancing quadratic bezier ──────────────────────────────────
  const drawLink = useCallback((link, ctx) => {
    const s = link.source
    const t = link.target
    if (typeof s !== 'object' || typeof t !== 'object') return
    if (!isFinite(s.x) || !isFinite(s.y) || !isFinite(t.x) || !isFinite(t.y)) return

    const dx  = t.x - s.x
    const dy  = t.y - s.y
    const len = Math.hypot(dx, dy)
    if (len < 1) return

    const isC       = collapsedRef.current
    const isHighlit = hoveredNode?.id === t.id || selectedNode?.id === t.id

    // Perpendicular unit vector for the wave
    const nx = -dy / len
    const ny =  dx / len

    // Unique seed per link for offset phase variety
    const seed = (typeof t.id === 'string' ? t.id.charCodeAt(0) : 0) * 0.19
    const now  = Date.now() * 0.001

    // Larger wave for highlighted links; tiny wave for background links
    const amp  = isC ? 0 : (isHighlit ? 8 : 2.5)
    const wave = Math.sin(now * 2.0 + seed) * amp

    const cpx = (s.x + t.x) / 2 + nx * wave
    const cpy = (s.y + t.y) / 2 + ny * wave

    const baseAlpha  = isC ? 0.15 : (isHighlit ? 1 : 0.28)
    const grd        = ctx.createLinearGradient(s.x, s.y, t.x, t.y)

    if (isHighlit) {
      grd.addColorStop(0, `rgba(201,169,110,0.9)`)
      grd.addColorStop(1, `${t.color}cc`)
    } else {
      grd.addColorStop(0, `rgba(201,169,110,${0.22 * baseAlpha / 0.28})`)
      grd.addColorStop(1, `${t.color}${Math.round(baseAlpha * 0x28).toString(16).padStart(2, '0')}`)
    }

    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.quadraticCurveTo(cpx, cpy, t.x, t.y)
    ctx.strokeStyle = grd
    ctx.lineWidth   = isHighlit ? 1.5 : 0.6
    ctx.stroke()
  }, [hoveredNode, selectedNode])

  // ── Event handlers ────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback(node => {
    if (!node || node.id === 'main') {
      toggleCollapse()
      return
    }
    setSelectedNode(prev => prev?.id === node.id ? null : node)
    fgRef.current?.centerAt(node.x, node.y, 800)
    fgRef.current?.zoom(2.8, 800)
  }, [toggleCollapse])

  const handleNodeHover = useCallback(node => {
    setHoveredNode(node || null)
    document.body.style.cursor = node
      ? (node.id === 'main' ? 'zoom-in' : 'pointer')
      : 'default'
  }, [])

  const handleNodeDragEnd = useCallback(node => {
    if (node.id === 'main' || collapsedRef.current) return
    node.fx = node.x
    node.fy = node.y
    fgRef.current?.d3ReheatSimulation()
  }, [])

  return (
    <section id="map" className="relative py-24 px-4 overflow-hidden" style={{ background: '#07070b' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(201,169,110,0.04) 0%, transparent 70%)'
      }} />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-5">
            <div
              className="inline-flex px-3 py-1 rounded-full font-['Josefin_Sans'] text-[0.6rem] tracking-[0.35em] uppercase"
              style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', color: '#C9A96E' }}
            >
              ROLE: CONN3CTOR
            </div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-['Josefin_Sans'] text-[0.55rem] tracking-widest uppercase"
              style={{
                background: isLive ? 'rgba(34,197,94,0.08)' : 'rgba(201,169,110,0.08)',
                border: `1px solid ${isLive ? 'rgba(34,197,94,0.25)' : 'rgba(201,169,110,0.2)'}`,
                color: isLive ? '#22c55e' : '#C9A96E',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isLive ? '#22c55e' : '#C9A96E' }} />
              {isLive ? 'Live' : 'Static'}
            </div>
          </div>

          <h2
            className="font-['Josefin_Sans'] font-light tracking-[0.25em] text-4xl md:text-5xl mb-4"
            style={{ color: 'var(--cream)' }}
          >
            CONN3CTION MAP
          </h2>
          <p
            className="font-['Josefin_Sans'] text-[0.65rem] tracking-[0.3em] uppercase max-w-lg mx-auto"
            style={{ color: 'rgba(237,232,220,0.3)' }}
          >
            Drag to move &nbsp; Click logo to retract &nbsp; Click node to inspect
          </p>
        </motion.div>

        {/* Graph canvas */}
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
            background: 'radial-gradient(ellipse at center, rgba(18,18,30,0.92) 0%, #07070b 100%)',
            border: '1px solid rgba(201,169,110,0.1)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 40px 80px rgba(0,0,0,0.7)',
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
            cooldownTicks={300}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.4}
            warmupTicks={100}
            nodeRelSize={1}
          />

          {/* Collapsed state pill */}
          <AnimatePresence>
            {collapsed && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full pointer-events-none"
                style={{
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.25)',
                  color: '#22c55e',
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '0.55rem',
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                }}
              >
                Tap logo to expand
              </motion.div>
            )}
          </AnimatePresence>

          {/* Node count */}
          <div
            className="absolute top-4 left-4 pointer-events-none"
            style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.45rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(201,169,110,0.3)',
            }}
          >
            {graphData.nodes.length - 1} Conn3ctors
          </div>

          {/* Selected node profile card */}
          <AnimatePresence>
            {selectedNode && !collapsed && (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                className="absolute bottom-6 right-6 z-50 w-[288px]"
              >
                <div
                  className="rounded-[20px] relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.018) 100%)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: `0 24px 48px rgba(0,0,0,0.75), 0 0 28px ${selectedNode.color}18`,
                    backdropFilter: 'blur(24px)',
                  }}
                >
                  {/* Top sheen */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }}
                  />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={selectedNode.avatar}
                          alt={selectedNode.name}
                          className="w-14 h-14 rounded-xl object-cover"
                          style={{ border: `2px solid ${selectedNode.color}55` }}
                        />
                        <div
                          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full"
                          style={{ background: '#22c55e', border: '2px solid #07070b' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-['Josefin_Sans'] font-semibold text-base tracking-wide truncate"
                          style={{ color: 'var(--cream)' }}
                        >
                          {selectedNode.name}
                        </div>
                        <div
                          className="font-['Josefin_Sans'] text-[0.58rem] tracking-[0.2em] uppercase truncate"
                          style={{ color: 'rgba(237,232,220,0.38)' }}
                        >
                          {selectedNode.discordHandle}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className="px-2.5 py-1 rounded-full font-['Josefin_Sans'] text-[0.48rem] tracking-[0.28em] uppercase"
                        style={{
                          background: `${selectedNode.color}14`,
                          border: `1px solid ${selectedNode.color}38`,
                          color: selectedNode.color,
                        }}
                      >
                        Conn3ctor
                      </div>
                      {selectedNode.xHandle && (
                        <a
                          href={`https://x.com/${selectedNode.xHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.09)',
                            color: 'rgba(237,232,220,0.65)',
                            fontSize: '0.48rem',
                            letterSpacing: '0.15em',
                            fontFamily: "'Josefin Sans', sans-serif",
                            textDecoration: 'none',
                          }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          @{selectedNode.xHandle.replace('@', '')}
                        </a>
                      )}
                    </div>

                    {/* Profile data */}
                    {selectedProfile && (
                      <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {selectedProfile.experience && (
                          <div
                            className="font-['Josefin_Sans'] text-[0.53rem] tracking-widest"
                            style={{ color: 'rgba(237,232,220,0.45)' }}
                          >
                            <span style={{ color: '#C9A96E' }}>EXP </span>
                            {selectedProfile.experience}
                          </div>
                        )}
                        {selectedProfile.services && (
                          <div
                            className="font-['Josefin_Sans'] text-[0.53rem] tracking-widest"
                            style={{ color: 'rgba(237,232,220,0.45)' }}
                          >
                            <span style={{ color: '#C9A96E' }}>SERVICES </span>
                            {selectedProfile.services}
                          </div>
                        )}
                        {selectedProfile.telegram && (
                          <a
                            href={`https://t.me/${selectedProfile.telegram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-['Josefin_Sans'] text-[0.5rem] tracking-widest"
                            style={{ color: '#0088cc', textDecoration: 'none' }}
                          >
                            TG {selectedProfile.telegram}
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
