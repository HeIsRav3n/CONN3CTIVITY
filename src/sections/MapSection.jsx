import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ForceGraph2D from 'react-force-graph-2d'
import STATIC_DATA from '../data/conn3ctors.json'
import { fetchConn3ctors, statusLabel, statusColor } from '../lib/api'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { supabase } from '../lib/supabase'

const FALLBACK_ROWS = (STATIC_DATA?.nodes || [])
  .filter(n => n.id !== 'main')
  .map(n => ({
    id: n.id,
    name: n.name,
    discord_handle: n.discordHandle || n.discord_handle,
    avatar: n.avatar,
    color: n.color,
    group: n.group || 1,
    x_handle: n.xHandle || n.x_handle || null,
    updated_at: null,
  }))

const buildLiveGraph = (rows) => {
  const main = { id: 'main', name: 'CONN3CTIVITY', group: 0, color: '#C9A96E', avatar: '/map-logo.png' }
  const members = rows.map(r => ({
    id: r.id,
    name: r.name,
    discordHandle: r.discord_handle,
    xHandle: r.x_handle || null,
    group: r.group || 1,
    color: r.color || '#C9A96E',
    avatar: r.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`,
  }))
  const nodes = [main, ...members]
  assignArkhamOrbits(nodes)

  // Hub spokes
  const links = members.map(m => ({
    source: 'main',
    target: m.id,
    color: m.color,
    kind: 'spoke',
  }))

  // Neighbor mesh along each ring — this is what gives Arkham rubber-band jelly
  const byRing = new Map()
  for (const m of members) {
    const key = Math.round((m._ringR || 100) / 36)
    if (!byRing.has(key)) byRing.set(key, [])
    byRing.get(key).push(m)
  }
  for (const ringNodes of byRing.values()) {
    ringNodes.sort((a, b) => (a._baseA || 0) - (b._baseA || 0))
    const n = ringNodes.length
    if (n < 2) continue
    for (let i = 0; i < n; i++) {
      const a = ringNodes[i]
      const b = ringNodes[(i + 1) % n]
      links.push({
        source: a.id,
        target: b.id,
        color: a.color,
        kind: 'mesh',
      })
      // Skip-one chord for denser jelly web (every 3rd)
      if (n > 6 && i % 3 === 0) {
        const c = ringNodes[(i + 2) % n]
        links.push({
          source: a.id,
          target: c.id,
          color: a.color,
          kind: 'mesh',
        })
      }
    }
  }

  return { nodes, links }
}

/** Concentric disc layout like the Arkham-style CONN3CTIVITY map */
function assignArkhamOrbits(nodes) {
  const members = nodes.filter(n => n.id !== 'main')
  const main = nodes.find(n => n.id === 'main')
  if (main) {
    main.x = 0
    main.y = 0
    main.fx = 0
    main.fy = 0
  }

  let idx = 0
  let ring = 0
  const baseR = 78
  const ringGap = 36
  const spacing = 24

  while (idx < members.length) {
    const r = baseR + ring * ringGap
    const capacity = Math.max(10, Math.floor((2 * Math.PI * r) / spacing))
    const count = Math.min(capacity, members.length - idx)
    const angleOffset = ring * 0.17
    for (let i = 0; i < count; i++) {
      const n = members[idx + i]
      const jitter = ((i * 17) % 7) - 3
      n._ringR = r + jitter
      n._baseA = (i / count) * Math.PI * 2 + angleOffset
      n.x = Math.cos(n._baseA) * n._ringR
      n.y = Math.sin(n._baseA) * n._ringR
      n.vx = 0
      n.vy = 0
    }
    idx += count
    ring++
  }
}

function applyConn3ctorChange(payload, prev) {
  const list = Array.isArray(prev) ? [...prev] : []
  if (payload.eventType === 'DELETE') {
    return list.filter(r => r.id !== payload.old?.id)
  }
  const row = payload.new
  if (!row) return list
  const idx = list.findIndex(r => r.id === row.id)
  if (idx >= 0) list[idx] = row
  else list.push(row)
  return list
}

function normalizeCommunities(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const INITIAL_GRAPH = buildLiveGraph(FALLBACK_ROWS)

export function MapSection() {
  const containerRef  = useRef(null)
  const fgRef         = useRef(null)
  const collapsedRef  = useRef(false)
  const graphDataRef  = useRef(INITIAL_GRAPH)
  const rotationRef   = useRef(0)
  const lastTickRef   = useRef(typeof performance !== 'undefined' ? performance.now() : 0)
  const dragVelRef    = useRef({ x: 0, y: 0, t: 0 })

  const [dimensions,    setDimensions]    = useState({ width: 800, height: 700 })
  const [graphData,     setGraphData]     = useState(INITIAL_GRAPH)
  const [hoveredNode,   setHoveredNode]   = useState(null)
  const [selectedNode,  setSelectedNode]  = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [profileState, setProfileState] = useState('idle')
  const [collapsed,     setCollapsed]     = useState(false)
  const [renderTrigger, setRenderTrigger] = useState(0)
  const [query, setQuery] = useState('')

  useEffect(() => {
    graphDataRef.current = graphData
  }, [graphData])

  const {
    data: liveRows,
    status,
    realtime,
  } = useLiveQuery({
    fetcher: fetchConn3ctors,
    initial: FALLBACK_ROWS,
    table: 'conn3ctors',
    applyRealtime: applyConn3ctorChange,
    getUpdatedAt: (rows) => {
      if (!Array.isArray(rows) || !rows.length) return null
      return rows.reduce((max, r) => {
        const t = r.updated_at ? new Date(r.updated_at).getTime() : 0
        return t > max ? t : max
      }, 0) || null
    },
  })

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

  // Merge live rows into graph — mutate in place so physics / drag pins survive
  useEffect(() => {
    if (!liveRows?.length) return
    const fresh = buildLiveGraph(liveRows)

    setGraphData(old => {
      if (!old?.nodes?.length) return fresh

      const oldMap = new Map(old.nodes.map(n => [n.id, n]))
      const freshIds = new Set(fresh.nodes.map(n => n.id))
      const membershipChanged =
        old.nodes.length !== fresh.nodes.length ||
        fresh.nodes.some(n => !oldMap.has(n.id)) ||
        old.nodes.some(n => n.id !== 'main' && !freshIds.has(n.id))

      // Soft update: keep the same node object references (preserves fx/fy/jelly)
      if (!membershipChanged) {
        for (const node of fresh.nodes) {
          const existing = oldMap.get(node.id)
          if (!existing) continue
          existing.name = node.name
          existing.discordHandle = node.discordHandle
          existing.xHandle = node.xHandle
          existing.group = node.group
          existing.color = node.color
          if (existing.avatar !== node.avatar) {
            existing.avatar = node.avatar
            existing._img = undefined
          }
        }
        if (old.nodes.some(n => n.id !== 'main' && n._baseA == null)) {
          assignArkhamOrbits(old.nodes)
        }
        // Upgrade to mesh links once if needed
        if (!old.links?.some(l => l.kind === 'mesh') && fresh.links.some(l => l.kind === 'mesh')) {
          const main = oldMap.get('main')
          if (main) { main.fx = 0; main.fy = 0; main.x = 0; main.y = 0 }
          return { nodes: old.nodes, links: fresh.links }
        }
        const main = oldMap.get('main')
        if (main) {
          main.fx = 0
          main.fy = 0
          main.x = 0
          main.y = 0
        }
        return old
      }

      const mergedNodes = fresh.nodes.map(node => {
        const oldNode = oldMap.get(node.id)
        if (!oldNode) return node
        return {
          ...node,
          x: oldNode.x,
          y: oldNode.y,
          vx: oldNode.vx,
          vy: oldNode.vy,
          fx: node.id === 'main' ? 0 : oldNode.fx,
          fy: node.id === 'main' ? 0 : oldNode.fy,
          _img: oldNode._img,
          _ringR: oldNode._ringR,
          _baseA: oldNode._baseA,
        }
      })
      // New members need orbit slots — re-pack the disc
      assignArkhamOrbits(mergedNodes)
      // Restore positions for nodes that already had coordinates
      for (const node of mergedNodes) {
        if (node.id === 'main') continue
        const oldNode = oldMap.get(node.id)
        if (oldNode && Number.isFinite(oldNode.x)) {
          node.x = oldNode.x
          node.y = oldNode.y
          node.vx = oldNode.vx || 0
          node.vy = oldNode.vy || 0
        }
      }
      const main = mergedNodes.find(n => n.id === 'main')
      if (main) {
        main.fx = 0
        main.fy = 0
        main.x = 0
        main.y = 0
      }
      return { nodes: mergedNodes, links: fresh.links }
    })
  }, [liveRows])

  const applyJellyForces = useCallback((isC) => {
    const fg = fgRef.current
    if (!fg) return

    // True Arkham feel = soft free body, NOT hard orbit slots
    fg.d3Force('center', null)
    fg.d3Force('x', null)
    fg.d3Force('y', null)

    const charge = fg.d3Force('charge')
    if (charge) {
      // Members push apart so the disc stays airy; hub is neutral
      charge.strength(n => (n.id === 'main' ? 0 : (isC ? -14 : -42)))
      if (typeof charge.distanceMax === 'function') charge.distanceMax(isC ? 80 : 160)
    }

    const link = fg.d3Force('link')
    if (link) {
      link
        .distance(l => {
          const kind = l.kind
          const t = typeof l.target === 'object' ? l.target : null
          const s = typeof l.source === 'object' ? l.source : null
          if (isC) return kind === 'spoke' ? 20 : 14
          if (kind === 'mesh') {
            // Chord length between neighbors on the ring
            const r = t?._ringR || s?._ringR || 120
            return Math.max(18, r * 0.28)
          }
          return (t?._ringR || 140) * 0.98
        })
        .strength(l => {
          if (isC) return l.kind === 'spoke' ? 1.05 : 0.7
          // Spokes are elastic rubber bands; mesh couples neighbors into jelly
          return l.kind === 'spoke' ? 0.55 : 0.25
        })
    }

    // Keep the soup alive — Arkham never fully freezes
    if (typeof fg.d3AlphaTarget === 'function') {
      fg.d3AlphaTarget(isC ? 0.12 : 0.08)
    }

    let nodeList = []
    const jellyForce = Object.assign(
      (alpha) => {
        const now = performance.now()
        const dt = Math.min(40, Math.max(0, now - lastTickRef.current))
        lastTickRef.current = now
        const collapsed = collapsedRef.current

        // Gentle global spin (tangential velocity) — free, not slot-locked
        if (!collapsed) {
          rotationRef.current += dt * 0.00012
        }
        const spin = collapsed ? 0 : 0.00055

        nodeList.forEach((n, i) => {
          if (n.id === 'main') {
            n.fx = 0
            n.fy = 0
            n.x = 0
            n.y = 0
            n.vx = 0
            n.vy = 0
            return
          }
          if (n.fx != null || n.fy != null) return

          const x = n.x || 0
          const y = n.y || 0
          const dist = Math.hypot(x, y) || 0.001
          const homeR = collapsed ? 28 : (n._ringR || 130)

          // Soft radial leash (keeps disc shape without freezing angles)
          const radialK = collapsed ? 0.16 : 0.028
          const pull = (homeR - dist) * radialK * (alpha + 0.05)
          n.vx += (x / dist) * pull * 10
          n.vy += (y / dist) * pull * 10

          // Continuous rotation via tangential push
          n.vx += (-y / dist) * spin * dist * (alpha + 0.2)
          n.vy += (x / dist) * spin * dist * (alpha + 0.2)

          // Living shimmer
          const wobble = collapsed ? 0.12 : 0.7
          n.vx += Math.sin(now * 0.0021 + i * 0.67) * wobble * alpha
          n.vy += Math.cos(now * 0.0017 + i * 0.53) * wobble * alpha
        })
      },
      { initialize: (ns) => { nodeList = ns } },
    )
    fg.d3Force('orbit', null)
    fg.d3Force('jelly', jellyForce)
    fg.d3Force('drift', null)
    fg.d3ReheatSimulation()
  }, [])

  // D3 physics — do NOT rebind on every live graphData tick (that killed jelly/drag)
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    const boot = setTimeout(() => {
      const nodes = graphDataRef.current.nodes || []
      if (nodes.length && nodes.every(n => n.id === 'main' || n._baseA == null)) {
        assignArkhamOrbits(nodes)
      }
      const main = nodes.find(n => n.id === 'main')
      if (main) {
        main.fx = 0
        main.fy = 0
        main.x = 0
        main.y = 0
      }
      applyJellyForces(collapsedRef.current)
      fg.centerAt(0, 0, 0)
      // Fit the full Arkham disc in view
      try {
        fg.zoomToFit(600, 48)
      } catch {
        fg.zoom(0.55, 0)
      }
    }, 80)

    const id = setInterval(() => {
      fg.d3ReheatSimulation()
    }, 1800)

    return () => {
      clearTimeout(boot)
      clearInterval(id)
    }
  }, [applyJellyForces, dimensions.width, dimensions.height])

  useEffect(() => {
    applyJellyForces(collapsed)
  }, [collapsed, applyJellyForces])

  // Rebind link force when mesh topology changes
  useEffect(() => {
    applyJellyForces(collapsedRef.current)
  }, [graphData.links.length, applyJellyForces])

  // Profile from Supabase (+ Realtime updates while card is open)
  useEffect(() => {
    if (!selectedNode) {
      setSelectedProfile(null)
      setProfileState('idle')
      return
    }
    let active = true
    let channel = null

    const mapProfile = (data) => ({
      username: data.username || null,
      twitter: data.twitter || null,
      telegram: data.telegram || null,
      cm_type: data.cm_type || null,
      services: data.services || null,
      experience: data.experience || null,
      communities: normalizeCommunities(data.communities),
      role: data.role || null,
    })

    async function loadProfile() {
      setProfileState('loading')
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`discord_id.eq.${selectedNode.id},id.eq.${selectedNode.id}`)
            .maybeSingle()

          if (error) console.warn('Profile lookup:', error.message)

          if (active && data) {
            setSelectedProfile(mapProfile(data))
            setProfileState('ready')
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
            username: p.username || null,
            twitter: p.twitter || null,
            telegram: p.telegram || null,
            cm_type: p.cmType || p.cm_type || null,
            services: p.services || null,
            experience: p.experience || null,
            communities: normalizeCommunities(p.communities),
            role: p.role || null,
          })
          setProfileState('ready')
        } else {
          setSelectedProfile(null)
          setProfileState('empty')
        }
      } catch {
        setSelectedProfile(null)
        setProfileState('error')
      }
    }

    loadProfile()

    if (supabase) {
      channel = supabase
        .channel(`profile:${selectedNode.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload) => {
            const row = payload.new || payload.old
            if (!row) return
            if (row.discord_id !== selectedNode.id && row.id !== selectedNode.id) return
            if (payload.eventType === 'DELETE') {
              setSelectedProfile(null)
              setProfileState('empty')
              return
            }
            setSelectedProfile(mapProfile(payload.new))
            setProfileState('ready')
          },
        )
        .subscribe()
    }

    return () => {
      active = false
      if (channel) supabase?.removeChannel(channel)
    }
  }, [selectedNode])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedNode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.cursor = 'default'
    }
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return (liveRows || [])
      .filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.discord_handle?.toLowerCase().includes(q) ||
        r.x_handle?.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [liveRows, query])

  const focusNodeById = useCallback((id) => {
    const node = graphData.nodes.find(n => n.id === id)
    if (!node) return
    setSelectedNode(node)
    setQuery('')
    if (collapsedRef.current) {
      collapsedRef.current = false
      setCollapsed(false)
    }
    fgRef.current?.centerAt(node.x, node.y, 800)
    fgRef.current?.zoom(2.8, 800)
  }, [graphData])

  const toggleCollapse = useCallback(() => {
    const fg = fgRef.current
    if (!fg) return
    const nodes = graphDataRef.current.nodes || []

    // Always clear any leftover pins, then toggle jelly ball ↔ expanded ring
    nodes.forEach(n => {
      if (n.id === 'main') {
        n.fx = 0
        n.fy = 0
      } else {
        n.fx = undefined
        n.fy = undefined
      }
    })

    if (collapsedRef.current) {
      collapsedRef.current = false
      setCollapsed(false)
      setSelectedNode(null)
      applyJellyForces(false)
      fg.d3ReheatSimulation()
      fg.centerAt(0, 0, 700)
      fg.zoom(1, 700)
      return
    }

    collapsedRef.current = true
    setCollapsed(true)
    setSelectedNode(null)
    applyJellyForces(true)
    fg.d3ReheatSimulation()
    fg.centerAt(0, 0, 700)
    fg.zoom(1.2, 700)
  }, [applyJellyForces])

  const drawNode = useCallback((node, ctx, gs) => {
    if (!isFinite(node.x) || !isFinite(node.y)) return

    const isMain     = node.id === 'main'
    const isHovered  = hoveredNode?.id  === node.id
    const isSelected = selectedNode?.id === node.id
    const isC        = collapsedRef.current
    const r          = isMain ? 34 : (isHovered || isSelected) ? 16 : 11

    if (isMain || isHovered || isSelected) {
      const glowR  = r + (isMain ? (isC ? 20 : 14) : 5)
      const glowCol = isMain ? '#C9A96E' : node.color
      const grd = ctx.createRadialGradient(node.x, node.y, r * 0.4, node.x, node.y, glowR)
      grd.addColorStop(0, `${glowCol}66`)
      grd.addColorStop(1, `${glowCol}00`)
      ctx.beginPath()
      ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()
    }

    // Pulsing ring on main (collapsed or always subtle)
    if (isMain) {
      const t    = Date.now() * 0.0025
      const pulR = r + 10 + Math.sin(t) * (isC ? 5 : 3)
      ctx.beginPath()
      ctx.arc(node.x, node.y, pulR, 0, Math.PI * 2)
      ctx.strokeStyle = isC ? 'rgba(34,197,94,0.4)' : 'rgba(201,169,110,0.35)'
      ctx.lineWidth   = 1.4
      ctx.stroke()
    }

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

    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    if (isMain) {
      // Double gold ring like the reference disc hub
      ctx.strokeStyle = '#C9A96E'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(201,169,110,0.55)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else {
      ctx.strokeStyle = (isHovered || isSelected) ? node.color : `${node.color}66`
      ctx.lineWidth   = (isHovered || isSelected) ? 2 : 1
      ctx.stroke()
    }

    if (isMain) {
      const fs = Math.max(11 / gs, 5)
      ctx.font          = `600 ${fs}px 'Josefin Sans', sans-serif`
      ctx.textAlign     = 'center'
      ctx.textBaseline  = 'middle'
      ctx.fillStyle     = isC ? 'rgba(34,197,94,0.85)' : 'rgba(201,169,110,0.6)'
      ctx.fillText(isC ? '+' : '', node.x, node.y + r + fs + 2 / gs)
    }

    if (!isMain) {
      ctx.beginPath()
      ctx.arc(node.x + r * 0.68, node.y + r * 0.68, 3.5, 0, Math.PI * 2)
      ctx.fillStyle   = node.color
      ctx.fill()
      ctx.strokeStyle = '#07070b'
      ctx.lineWidth   = 1
      ctx.stroke()
    }

    if (isMain || isHovered || isSelected || gs > 4) {
      const fs = Math.max(isMain ? 10 / gs : 8 / gs, isMain ? 6 : 4)
      ctx.font         = `500 ${fs}px 'Josefin Sans', sans-serif`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle    = isMain ? '#C9A96E' : 'rgba(237,232,220,0.9)'
      ctx.fillText(node.name, node.x, node.y + r + 3 / gs)
    }
  }, [hoveredNode, selectedNode, renderTrigger])

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
    const isMesh    = link.kind === 'mesh'
    const isHighlit = hoveredNode?.id === t.id || selectedNode?.id === t.id
      || hoveredNode?.id === s.id || selectedNode?.id === s.id

    // Rubber-band bend grows as the link stretches past rest length
    const rest = isMesh ? 40 : 120
    const stretch = Math.max(0, len / rest - 1)
    const nx = -dy / len
    const ny =  dx / len
    const now = Date.now() * 0.001
    const seed = (typeof (t.id || s.id) === 'string' ? String(t.id || s.id).charCodeAt(0) : 0) * 0.19
    const amp = isC ? 0 : ((isHighlit ? 12 : 3) + stretch * 10)
    const wave = Math.sin(now * 2.2 + seed) * amp * 0.35 + stretch * (isMesh ? 4 : 8) * Math.sin(seed)
    const cpx = (s.x + t.x) / 2 + nx * wave
    const cpy = (s.y + t.y) / 2 + ny * wave

    const tipColor = t.color || s.color || '#C9A96E'
    const grd = ctx.createLinearGradient(s.x, s.y, t.x, t.y)
    if (isHighlit) {
      grd.addColorStop(0, 'rgba(201,169,110,0.95)')
      grd.addColorStop(1, `${tipColor}ee`)
    } else if (isMesh) {
      grd.addColorStop(0, `${s.color || tipColor}22`)
      grd.addColorStop(1, `${tipColor}33`)
    } else {
      grd.addColorStop(0, `rgba(201,169,110,${isC ? 0.14 : 0.32})`)
      grd.addColorStop(1, `${tipColor}${isC ? '30' : '66'}`)
    }

    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.quadraticCurveTo(cpx, cpy, t.x, t.y)
    ctx.strokeStyle = grd
    ctx.lineWidth = isHighlit ? 1.7 : (isMesh ? 0.35 : 0.6)
    ctx.stroke()
  }, [hoveredNode, selectedNode])

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

  const handleNodeDrag = useCallback((node) => {
    if (!node || node.id === 'main') return
    const now = performance.now()
    if (dragVelRef.current.t) {
      const dt = Math.max(1, now - dragVelRef.current.t)
      dragVelRef.current.x = ((node.x || 0) - (node.__prevX ?? node.x)) / dt * 16
      dragVelRef.current.y = ((node.y || 0) - (node.__prevY ?? node.y)) / dt * 16
    }
    node.__prevX = node.x
    node.__prevY = node.y
    dragVelRef.current.t = now
    node.fx = node.x
    node.fy = node.y
    // Reheat so neighbors stretch live while dragging (Arkham rubber band)
    fgRef.current?.d3ReheatSimulation()
  }, [])

  const handleNodeDragEnd = useCallback(node => {
    if (!node || node.id === 'main') return
    // Fling with throw velocity, then rubber bands yank the mesh back
    node.fx = undefined
    node.fy = undefined
    node.vx = (dragVelRef.current.x || 0) * 8
    node.vy = (dragVelRef.current.y || 0) * 8
    node.__prevX = undefined
    node.__prevY = undefined
    dragVelRef.current = { x: 0, y: 0, t: 0 }

    const fg = fgRef.current
    if (!fg) return
    if (typeof fg.d3AlphaTarget === 'function') {
      fg.d3AlphaTarget(0.55)
      setTimeout(() => {
        if (typeof fg.d3AlphaTarget === 'function') {
          fg.d3AlphaTarget(collapsedRef.current ? 0.12 : 0.08)
        }
      }, 1400)
    }
    fg.d3ReheatSimulation()
  }, [])

  const badgeLabel = statusLabel(status, { realtime })

  return (
    <section id="map" className="relative py-24 px-4 overflow-hidden" style={{ background: '#07070b' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(201,169,110,0.04) 0%, transparent 70%)'
      }} />

      <div className="max-w-7xl mx-auto relative z-10">

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
                background: `${statusColor(status)}14`,
                border: `1px solid ${statusColor(status)}40`,
                color: statusColor(status),
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusColor(status) }} />
              {badgeLabel}
            </div>
          </div>

          <h2
            className="font-['Josefin_Sans'] font-light tracking-[0.25em] text-4xl md:text-5xl mb-4"
            style={{ color: 'var(--cream)' }}
          >
            CONN3CTION MAP
          </h2>
          <p
            className="font-['Josefin_Sans'] text-[0.65rem] tracking-[0.3em] uppercase max-w-lg mx-auto mb-6"
            style={{ color: 'rgba(237,232,220,0.3)' }}
          >
            Drag · throw · rubber-band jelly &nbsp; Click logo to retract &nbsp; Click node to inspect
          </p>

          <div className="relative max-w-md mx-auto">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Conn3ctors…"
              aria-label="Search Conn3ctors"
              className="w-full px-4 py-2.5 rounded-full font-['Josefin_Sans'] text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(201,169,110,0.22)',
                color: 'var(--cream)',
              }}
            />
            {matches.length > 0 && (
              <div
                className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden z-20 text-left"
                style={{
                  background: 'rgba(11,10,8,0.96)',
                  border: '1px solid rgba(201,169,110,0.2)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.55)',
                }}
              >
                {matches.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => focusNodeById(m.id)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-left"
                  >
                    <img src={m.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block font-['Josefin_Sans'] text-sm truncate" style={{ color: 'var(--cream)' }}>
                        {m.name}
                      </span>
                      <span className="block font-['Josefin_Sans'] text-[0.55rem] tracking-widest uppercase truncate" style={{ color: 'rgba(237,232,220,0.4)' }}>
                        {m.discord_handle}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

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
            onNodeDrag={handleNodeDrag}
            onNodeDragEnd={handleNodeDragEnd}
            cooldownTicks={1600}
            d3AlphaDecay={0.004}
            d3VelocityDecay={0.14}
            warmupTicks={30}
            nodeRelSize={1}
          />

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
                Tap logo to reset / expand
              </motion.div>
            )}
          </AnimatePresence>

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
            {Math.max(0, graphData.nodes.length - 1)} Conn3ctors
          </div>

          <AnimatePresence>
            {selectedNode && !collapsed && (
              <motion.div
                key={selectedNode.id}
                role="dialog"
                aria-modal="true"
                aria-label={`${selectedNode.name} profile`}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                className="absolute bottom-6 right-6 z-50 w-[288px] max-w-[calc(100%-2rem)]"
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
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }}
                  />

                  <div className="p-5">
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
                        type="button"
                        onClick={() => setSelectedNode(null)}
                        aria-label="Close profile"
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
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
                      <a
                        href={`https://discord.com/users/${selectedNode.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{
                          background: 'rgba(88,101,242,0.12)',
                          border: '1px solid rgba(88,101,242,0.35)',
                          color: '#9aa3ff',
                          fontSize: '0.48rem',
                          letterSpacing: '0.15em',
                          fontFamily: "'Josefin Sans', sans-serif",
                          textDecoration: 'none',
                        }}
                      >
                        Discord
                      </a>
                      {(selectedNode.xHandle || selectedProfile?.twitter) && (
                        <a
                          href={`https://x.com/${(selectedNode.xHandle || selectedProfile.twitter).replace('@', '')}`}
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
                          @{(selectedNode.xHandle || selectedProfile.twitter).replace('@', '')}
                        </a>
                      )}
                    </div>

                    {profileState === 'loading' && (
                      <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div
                          className="font-['Josefin_Sans'] text-[0.52rem] tracking-widest uppercase"
                          style={{ color: 'rgba(237,232,220,0.45)' }}
                        >
                          Loading profile...
                        </div>
                      </div>
                    )}

                    {selectedProfile && (
                      <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {selectedProfile.role && (
                          <div className="font-['Josefin_Sans'] text-[0.53rem] tracking-widest" style={{ color: 'rgba(237,232,220,0.45)' }}>
                            <span style={{ color: '#C9A96E' }}>ROLE </span>
                            {selectedProfile.role}
                          </div>
                        )}
                        {selectedProfile.cm_type && (
                          <div className="font-['Josefin_Sans'] text-[0.53rem] tracking-widest" style={{ color: 'rgba(237,232,220,0.45)' }}>
                            <span style={{ color: '#C9A96E' }}>CM TYPE </span>
                            {selectedProfile.cm_type}
                          </div>
                        )}
                        {selectedProfile.experience && (
                          <div className="font-['Josefin_Sans'] text-[0.53rem] tracking-widest" style={{ color: 'rgba(237,232,220,0.45)' }}>
                            <span style={{ color: '#C9A96E' }}>EXP </span>
                            {selectedProfile.experience}
                          </div>
                        )}
                        {selectedProfile.services && (
                          <div className="font-['Josefin_Sans'] text-[0.53rem] tracking-widest" style={{ color: 'rgba(237,232,220,0.45)' }}>
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
                        {selectedProfile.communities.filter(Boolean).length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1.5">
                            {selectedProfile.communities.filter(Boolean).slice(0, 5).map((community, idx) => (
                              <span
                                key={`${community}-${idx}`}
                                className="px-2 py-0.5 rounded-full font-['Josefin_Sans'] text-[0.42rem] tracking-widest uppercase"
                                style={{
                                  color: '#C9A96E',
                                  border: '1px solid rgba(201,169,110,0.35)',
                                  background: 'rgba(201,169,110,0.08)',
                                }}
                              >
                                {community}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {profileState !== 'loading' && !selectedProfile && (
                      <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div
                          className="font-['Josefin_Sans'] text-[0.52rem] tracking-widest uppercase"
                          style={{ color: 'rgba(237,232,220,0.35)' }}
                        >
                          No extended profile yet
                        </div>
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
