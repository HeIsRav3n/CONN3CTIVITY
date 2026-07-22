import { useRef, useEffect, useCallback } from 'react'

const GOLD = '#C9A96E'
const CREAM = '#EDE8DC'

const textureCache = new Map()

function loadTex(url) {
  if (!url) return null
  if (textureCache.has(url)) return textureCache.get(url)
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.decoding = 'async'
  img.src = url
  textureCache.set(url, img)
  return img
}

function hash01(id) {
  let h = 2166136261
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

function packRings(members, scale) {
  let idx = 0
  let ring = 0
  const baseR = 78 * scale
  const gap = 34 * scale
  const spacing = 24 * scale

  while (idx < members.length) {
    const R = baseR + ring * gap
    const capacity = Math.max(10, Math.floor((2 * Math.PI * R) / spacing))
    const count = Math.min(capacity, members.length - idx)
    const offset = ring * 0.17
    const depth = 0.15 + ring * 0.08
    for (let i = 0; i < count; i++) {
      const m = members[idx + i]
      const a = (i / count) * Math.PI * 2 + offset
      const jitter = (((i * 17) % 7) - 3) * scale
      m.homeR = R + jitter
      m.homeA = a
      m.depth = depth
      m.r = Math.max(5, 9.5 - ring * 0.55) * scale
      m.x = Math.cos(a) * m.homeR
      m.y = Math.sin(a) * m.homeR
      m.vx = 0
      m.vy = 0
      m.phase = hash01(m.id) * Math.PI * 2
    }
    idx += count
    ring += 1
  }
}

/**
 * High-performance radial bubble constellation.
 * Custom canvas physics — no force-graph, no infinite sim, no per-link gradients.
 */
export function RadialBubbleMap({
  members = [],
  width = 800,
  height = 700,
  collapsed = false,
  selectedId = null,
  focusId = null,
  active = true,
  onHover,
  onSelect,
  onHubClick,
}) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const activeRef = useRef(active)
  const propsRef = useRef({ collapsed, selectedId, focusId, onHover, onSelect, onHubClick })
  propsRef.current = { collapsed, selectedId, focusId, onHover, onSelect, onHubClick }
  activeRef.current = active

  // Build / sync bubble state when membership changes
  useEffect(() => {
    const scale = Math.min(width, height) / 720
    const hub = {
      id: 'main',
      isHub: true,
      name: 'CONN3CTIVITY',
      avatar: '/map-logo.png',
      color: GOLD,
      x: 0,
      y: 0,
      r: 32 * scale,
      img: loadTex('/map-logo.png'),
    }

    const prev = stateRef.current
    const prevMap = prev ? new Map(prev.bubbles.map(b => [b.id, b])) : null

    const bubbles = members.map((m) => {
      const old = prevMap?.get(m.id)
      const b = {
        id: m.id,
        name: m.name,
        discordHandle: m.discordHandle,
        xHandle: m.xHandle,
        color: m.color || GOLD,
        avatar: m.avatar,
        img: loadTex(m.avatar),
        isHub: false,
        x: old?.x ?? 0,
        y: old?.y ?? 0,
        vx: old?.vx ?? 0,
        vy: old?.vy ?? 0,
        homeR: 100,
        homeA: 0,
        depth: 0.2,
        r: 8,
        phase: hash01(m.id) * Math.PI * 2,
      }
      return b
    })

    packRings(bubbles, scale)

    // Preserve positions for existing; seed new ones at home
    for (const b of bubbles) {
      const old = prevMap?.get(b.id)
      if (old && Number.isFinite(old.x)) {
        b.x = old.x
        b.y = old.y
        b.vx = old.vx || 0
        b.vy = old.vy || 0
      } else {
        b.x = Math.cos(b.homeA) * b.homeR
        b.y = Math.sin(b.homeA) * b.homeR
      }
    }

    stateRef.current = {
      hub,
      bubbles,
      scale,
      pointer: { x: 0, y: 0, down: false, worldX: 0, worldY: 0, mode: null },
      cam: prev?.cam || { x: 0, y: 0, zoom: 1 },
      hoverId: null,
      retractUntil: 0,
      rot: prev?.rot || 0,
      cx: width / 2,
      cy: height / 2,
      widthWorld: width,
      heightWorld: height,
      dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.75),
      lastT: performance.now(),
      membershipKey: members.map(m => m.id).join(','),
    }
  }, [members, width, height])

  // Focus: center camera on member
  useEffect(() => {
    const s = stateRef.current
    if (!s || !focusId) return
    const b = s.bubbles.find(x => x.id === focusId)
    if (!b) return
    s.cam.x = b.x
    s.cam.y = b.y
    s.cam.zoom = Math.max(s.cam.zoom, 1.6)
  }, [focusId])

  // Collapse / retract
  useEffect(() => {
    const s = stateRef.current
    if (!s) return
    if (collapsed) {
      s.retractUntil = performance.now() + 900
      for (const b of s.bubbles) {
        b.homeRCollapsed = 22 * s.scale
      }
      s.cam.x = 0
      s.cam.y = 0
      s.cam.zoom = 1.15
    } else {
      s.retractUntil = performance.now() + 700
      for (const b of s.bubbles) {
        b.homeRCollapsed = undefined
      }
    }
  }, [collapsed])

  const toWorld = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    const s = stateRef.current
    if (!canvas || !s) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const sx = ((clientX - rect.left) / rect.width) * (s.widthWorld || width)
    const sy = ((clientY - rect.top) / rect.height) * (s.heightWorld || height)
    const zoom = s.cam?.zoom || 1
    return {
      x: (sx - s.cx) / zoom + (s.cam?.x || 0),
      y: (sy - s.cy) / zoom + (s.cam?.y || 0),
    }
  }, [width, height])

  // Main rAF loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width < 2 || height < 2) return undefined

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let raf = 0
    let running = true

    const CELL = 28
    const grid = new Map()

    const step = (now) => {
      if (!running) return
      raf = requestAnimationFrame(step)
      if (!activeRef.current || document.hidden) return
      const s = stateRef.current
      if (!s) return

      s.cx = width / 2
      s.cy = height / 2
      s.widthWorld = width
      s.heightWorld = height

      const dt = Math.min(0.033, (now - s.lastT) / 1000) || 0.016
      s.lastT = now
      const t = now * 0.001
      const props = propsRef.current
      const retracting = now < s.retractUntil || props.collapsed
      const stretching = s.pointer.down && s.pointer.mode === 'stretch'

      // Slow ambient rotation of home angles
      if (!props.collapsed && !stretching) s.rot += dt * 0.12

      const { bubbles, hub, pointer, cam } = s
      const n = bubbles.length
      const zoom = cam.zoom || 1

      // --- Physics ---
      grid.clear()
      for (let i = 0; i < n; i++) {
        const b = bubbles[i]
        const gx = Math.floor(b.x / CELL)
        const gy = Math.floor(b.y / CELL)
        const key = gx + ',' + gy
        let cell = grid.get(key)
        if (!cell) { cell = []; grid.set(key, cell) }
        cell.push(i)
      }

      for (let i = 0; i < n; i++) {
        const b = bubbles[i]
        const homeR = (props.collapsed ? (b.homeRCollapsed || 22 * s.scale) : b.homeR)
        const homeA = b.homeA + s.rot
        const hx = Math.cos(homeA) * homeR
        const hy = Math.sin(homeA) * homeR

        // Idle float
        const idle = props.collapsed ? 0 : 1.8 * s.scale
        const ix = Math.sin(t * 0.9 + b.phase) * idle
        const iy = Math.cos(t * 0.75 + b.phase * 1.3) * idle

        // Spring home (stronger while retracting)
        const kHome = retracting ? 18 : (stretching ? 4.5 : 9)
        b.vx += (hx + ix - b.x) * kHome * dt
        b.vy += (hy + iy - b.y) * kHome * dt

        // Soft radial leash (keeps constellation structure)
        const dist = Math.hypot(b.x, b.y) || 0.001
        const radialK = retracting ? 0 : 2.2
        b.vx += (b.x / dist) * (homeR - dist) * radialK * dt
        b.vy += (b.y / dist) * (homeR - dist) * radialK * dt

        // Cursor attract — nearby bubbles stretch toward pointer
        if (stretching && !props.collapsed) {
          const dx = pointer.worldX - b.x
          const dy = pointer.worldY - b.y
          const d2 = dx * dx + dy * dy
          const radius = 210 * s.scale
          if (d2 < radius * radius) {
            const d = Math.sqrt(d2) || 0.001
            const fall = 1 - d / radius
            const pull = 28 * fall * fall
            b.vx += (dx / d) * pull * dt
            b.vy += (dy / d) * pull * dt
          }
        }

        // Soft collisions via spatial hash (neighbors only)
        const gx = Math.floor(b.x / CELL)
        const gy = Math.floor(b.y / CELL)
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const cell = grid.get((gx + ox) + ',' + (gy + oy))
            if (!cell) continue
            for (let k = 0; k < cell.length; k++) {
              const j = cell[k]
              if (j <= i) continue
              const o = bubbles[j]
              const dx = o.x - b.x
              const dy = o.y - b.y
              const minD = b.r + o.r + 2
              const d2 = dx * dx + dy * dy
              if (d2 > 0 && d2 < minD * minD) {
                const d = Math.sqrt(d2)
                const push = (minD - d) * 0.55
                const nx = dx / d
                const ny = dy / d
                b.vx -= nx * push * 12 * dt
                b.vy -= ny * push * 12 * dt
                o.vx += nx * push * 12 * dt
                o.vy += ny * push * 12 * dt
              }
            }
          }
        }

        // Hub exclusion
        const hubMin = hub.r + b.r + 6 * s.scale
        const hd = Math.hypot(b.x, b.y) || 0.001
        if (hd < hubMin) {
          const push = (hubMin - hd) * 20 * dt
          b.vx += (b.x / hd) * push
          b.vy += (b.y / hd) * push
        }

        // Integrate + damp
        const damp = retracting ? 0.86 : 0.92
        b.vx *= damp
        b.vy *= damp
        b.x += b.vx
        b.y += b.vy
      }

      // --- Render ---
      // Background
      ctx.fillStyle = '#0a0a0e'
      ctx.fillRect(0, 0, width, height)

      // Soft vignette / premium glow
      const bg = ctx.createRadialGradient(s.cx, s.cy, 40, s.cx, s.cy, Math.max(width, height) * 0.55)
      bg.addColorStop(0, 'rgba(201,169,110,0.06)')
      bg.addColorStop(0.45, 'rgba(18,18,28,0.5)')
      bg.addColorStop(1, '#0a0a0e')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // Parallax from pointer
      const parallaxX = (pointer.x / width - 0.5) * 14
      const parallaxY = (pointer.y / height - 0.5) * 10

      ctx.save()
      ctx.translate(s.cx, s.cy)
      ctx.scale(zoom, zoom)
      ctx.translate(-cam.x, -cam.y)

      // Links — straight-ish fast path; only curve when stretched (keeps 60fps)
      ctx.lineCap = 'round'
      ctx.globalAlpha = props.collapsed ? 0.18 : 0.5
      ctx.strokeStyle = 'rgba(201,169,110,0.26)'
      ctx.lineWidth = 0.65 / zoom
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const b = bubbles[i]
        if (b.id === s.hoverId) continue
        const px = b.x + parallaxX * b.depth
        const py = b.y + parallaxY * b.depth
        const homeLen = b.homeR || 1
        const stretchAmt = Math.hypot(b.x, b.y) / homeLen - 1
        ctx.moveTo(0, 0)
        if (stretchAmt > 0.08 || stretching) {
          const cpx = px * 0.42 - py * (0.1 + Math.max(0, stretchAmt) * 0.14)
          const cpy = py * 0.42 + px * (0.1 + Math.max(0, stretchAmt) * 0.14)
          ctx.quadraticCurveTo(cpx, cpy, px, py)
        } else {
          ctx.lineTo(px, py)
        }
      }
      ctx.stroke()
      ctx.globalAlpha = 1

      // Hovered / selected link
      const hotId = s.hoverId || props.selectedId
      if (hotId) {
        const b = bubbles.find(x => x.id === hotId)
        if (b) {
          const px = b.x + parallaxX * b.depth
          const py = b.y + parallaxY * b.depth
          const cpx = px * 0.4 - py * 0.15
          const cpy = py * 0.4 + px * 0.15
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.quadraticCurveTo(cpx, cpy, px, py)
          ctx.strokeStyle = b.color || GOLD
          ctx.lineWidth = 1.8
          ctx.globalAlpha = 0.9
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      // Bubbles
      for (let i = 0; i < n; i++) {
        const b = bubbles[i]
        const px = b.x + parallaxX * b.depth
        const py = b.y + parallaxY * b.depth
        const isHot = b.id === s.hoverId || b.id === props.selectedId
        const rad = b.r * (isHot ? 1.35 : 1)

        // Soft shadow
        ctx.beginPath()
        ctx.arc(px + 1.2, py + 2, rad * 1.05, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fill()

        // Glow
        if (isHot) {
          const g = ctx.createRadialGradient(px, py, rad * 0.2, px, py, rad * 2.2)
          g.addColorStop(0, `${b.color || GOLD}55`)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(px, py, rad * 2.2, 0, Math.PI * 2)
          ctx.fill()
        }

        // Avatar clip
        ctx.save()
        ctx.beginPath()
        ctx.arc(px, py, rad, 0, Math.PI * 2)
        ctx.fillStyle = '#121218'
        ctx.fill()
        ctx.clip()
        if (b.img && b.img.complete && b.img.naturalWidth > 0) {
          ctx.drawImage(b.img, px - rad, py - rad, rad * 2, rad * 2)
        } else {
          ctx.fillStyle = b.color || GOLD
          ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2)
        }
        ctx.restore()

        // Glass ring
        ctx.beginPath()
        ctx.arc(px, py, rad, 0, Math.PI * 2)
        ctx.strokeStyle = isHot ? CREAM : 'rgba(201,169,110,0.4)'
        ctx.lineWidth = isHot ? 1.6 : 0.8
        ctx.stroke()

        if (isHot) {
          ctx.font = `500 ${Math.max(9, 11 * s.scale)}px "Josefin Sans", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = CREAM
          ctx.shadowColor = 'rgba(0,0,0,0.8)'
          ctx.shadowBlur = 6
          ctx.fillText(b.name || '', px, py + rad + 4)
          ctx.shadowBlur = 0
        }
      }

      // Hub
      {
        const hr = hub.r * (props.collapsed ? 0.92 : 1)
        const g = ctx.createRadialGradient(0, 0, hr * 0.3, 0, 0, hr * 2.4)
        g.addColorStop(0, 'rgba(201,169,110,0.45)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(0, 0, hr * 2.4, 0, Math.PI * 2)
        ctx.fill()

        ctx.save()
        ctx.beginPath()
        ctx.arc(0, 0, hr, 0, Math.PI * 2)
        ctx.fillStyle = '#0d0d14'
        ctx.fill()
        ctx.clip()
        if (hub.img && hub.img.complete && hub.img.naturalWidth > 0) {
          ctx.drawImage(hub.img, -hr, -hr, hr * 2, hr * 2)
        }
        ctx.restore()

        ctx.beginPath()
        ctx.arc(0, 0, hr, 0, Math.PI * 2)
        ctx.strokeStyle = GOLD
        ctx.lineWidth = 2.4
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0, 0, hr + 4, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(201,169,110,0.35)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      ctx.restore()
    }

    raf = requestAnimationFrame(step)
    return () => {
      running = false
      cancelAnimationFrame(raf)
    }
  }, [width, height])

  // Pointer + wheel: pan, zoom, stretch
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const hitTest = (wx, wy) => {
      const s = stateRef.current
      if (!s) return null
      const pr = propsRef.current
      if (Math.hypot(wx, wy) <= s.hub.r * 1.15) return s.hub
      let best = null
      let bestD = Infinity
      for (let i = s.bubbles.length - 1; i >= 0; i--) {
        const b = s.bubbles[i]
        const d = Math.hypot(b.x - wx, b.y - wy)
        const rad = b.r * ((b.id === s.hoverId || b.id === pr.selectedId) ? 1.35 : 1) + 3
        if (d <= rad && d < bestD) {
          best = b
          bestD = d
        }
      }
      return best
    }

    const nearestBubbleDist = (wx, wy) => {
      const s = stateRef.current
      if (!s) return Infinity
      let best = Infinity
      for (const b of s.bubbles) {
        const d = Math.hypot(b.x - wx, b.y - wy) - b.r
        if (d < best) best = d
      }
      return best
    }

    const onMove = (e) => {
      const s = stateRef.current
      if (!s) return
      const rect = canvas.getBoundingClientRect()
      const prevX = s.pointer.x
      const prevY = s.pointer.y
      s.pointer.x = e.clientX - rect.left
      s.pointer.y = e.clientY - rect.top
      const w = toWorld(e.clientX, e.clientY)
      s.pointer.worldX = w.x
      s.pointer.worldY = w.y

      if (s.pointer.down && s.pointer.mode === 'pan') {
        const zoom = s.cam.zoom || 1
        s.cam.x -= (s.pointer.x - prevX) / zoom
        s.cam.y -= (s.pointer.y - prevY) / zoom
        s.pointer.moved = true
        canvas.style.cursor = 'grabbing'
        return
      }

      if (s.pointer.down && s.pointer.mode === 'stretch') {
        if (Math.hypot(w.x - (s.pointer.downX || 0), w.y - (s.pointer.downY || 0)) > 6) {
          s.pointer.moved = true
        }
        canvas.style.cursor = 'grabbing'
        return
      }

      const hit = hitTest(w.x, w.y)
      const id = hit && !hit.isHub ? hit.id : null
      if (id !== s.hoverId) {
        s.hoverId = id
        propsRef.current.onHover?.(hit && !hit.isHub ? hit : null)
      }
      canvas.style.cursor = hit ? 'pointer' : 'grab'
    }

    const onDown = (e) => {
      const s = stateRef.current
      if (!s) return
      const w = toWorld(e.clientX, e.clientY)
      const rect = canvas.getBoundingClientRect()
      s.pointer.x = e.clientX - rect.left
      s.pointer.y = e.clientY - rect.top
      s.pointer.down = true
      s.pointer.worldX = w.x
      s.pointer.worldY = w.y
      s.pointer.downX = w.x
      s.pointer.downY = w.y
      s.pointer.moved = false

      // Right / middle / shift / alt = pan. Empty space = pan. Near bubbles = stretch.
      const isPanButton = e.button === 1 || e.button === 2 || e.shiftKey || e.altKey
      const near = nearestBubbleDist(w.x, w.y) < 40 * s.scale
      const hit = hitTest(w.x, w.y)
      if (isPanButton || (!hit && !near)) {
        s.pointer.mode = 'pan'
        canvas.style.cursor = 'grabbing'
      } else if (hit?.isHub) {
        s.pointer.mode = 'click'
      } else {
        s.pointer.mode = near || hit ? 'stretch' : 'pan'
        canvas.style.cursor = 'grabbing'
      }

      if (e.button === 2) e.preventDefault()
      try { canvas.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    }

    const onUp = (e) => {
      const s = stateRef.current
      if (!s) return
      const w = toWorld(e.clientX, e.clientY)
      const moved = s.pointer.moved
      const mode = s.pointer.mode
      s.pointer.down = false
      s.pointer.mode = null
      canvas.style.cursor = 'grab'
      try { canvas.releasePointerCapture(e.pointerId) } catch { /* ignore */ }

      if (!moved && mode !== 'pan') {
        const hit = hitTest(w.x, w.y)
        if (hit?.isHub) propsRef.current.onHubClick?.()
        else if (hit) propsRef.current.onSelect?.(hit)
      }
    }

    const onLeave = () => {
      const s = stateRef.current
      if (!s) return
      // Don't cancel pan mid-drag if pointer left canvas — window pointerup handles it
      if (!s.pointer.down && s.hoverId) {
        s.hoverId = null
        propsRef.current.onHover?.(null)
      }
    }

    const onWheel = (e) => {
      const s = stateRef.current
      if (!s) return
      e.preventDefault()

      // Trackpad pan (dominant horizontal) or shift+scroll
      if (e.shiftKey || (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) + 2)) {
        const zoom = s.cam.zoom || 1
        s.cam.x += e.deltaX / zoom
        s.cam.y += e.deltaY / zoom
        return
      }

      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const before = toWorld(e.clientX, e.clientY)

      const delta = -e.deltaY
      const factor = Math.exp(delta * 0.0015)
      const next = Math.min(3.2, Math.max(0.35, (s.cam.zoom || 1) * factor))
      s.cam.zoom = next

      // Zoom toward cursor
      s.cam.x = before.x - (sx - s.cx) / next
      s.cam.y = before.y - (sy - s.cy) / next
    }

    const onContext = (e) => e.preventDefault()

    const onDblClick = (e) => {
      const s = stateRef.current
      if (!s) return
      const w = toWorld(e.clientX, e.clientY)
      const hit = hitTest(w.x, w.y)
      if (hit?.isHub || !hit) {
        s.cam.x = 0
        s.cam.y = 0
        s.cam.zoom = 1
      }
    }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContext)
    canvas.addEventListener('dblclick', onDblClick)

    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContext)
      canvas.removeEventListener('dblclick', onDblClick)
    }
  }, [toWorld, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'none',
        cursor: 'grab',
        background: '#0a0a0e',
      }}
    />
  )
}
