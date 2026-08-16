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

/** Dense circular packing — tight rings, little wasted space */
function packRings(members, scale) {
  let idx = 0
  let ring = 0
  const baseR = 48 * scale
  const gap = 18 * scale
  const spacing = 15 * scale

  while (idx < members.length) {
    const R = baseR + ring * gap
    const capacity = Math.max(12, Math.floor((2 * Math.PI * R) / spacing))
    const count = Math.min(capacity, members.length - idx)
    const offset = ring * 0.13
    for (let i = 0; i < count; i++) {
      const m = members[idx + i]
      const a = (i / count) * Math.PI * 2 + offset
      m.homeR = R
      m.homeA = a
      m.depth = 0.1 + ring * 0.05
      m.r = Math.max(4.5, 7.2 - ring * 0.35) * scale
      m.x = Math.cos(a) * R
      m.y = Math.sin(a) * R
      m.vx = 0
      m.vy = 0
      m.phase = hash01(m.id) * Math.PI * 2
      m.ring = ring
    }
    idx += count
    ring += 1
  }
}

/**
 * Fast radial constellation — pan/zoom first, light physics, dense packing.
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

  useEffect(() => {
    propsRef.current = { collapsed, selectedId, focusId, onHover, onSelect, onHubClick }
    activeRef.current = active
  })

  useEffect(() => {
    const scale = Math.min(width, height) / 700
    const hub = {
      id: 'main',
      isHub: true,
      name: 'CONN3CTIVITY',
      avatar: '/map-logo.png',
      color: GOLD,
      x: 0,
      y: 0,
      r: 28 * scale,
      img: loadTex('/map-logo.png'),
    }

    const prev = stateRef.current
    const prevMap = prev ? new Map(prev.bubbles.map(b => [b.id, b])) : null
    const key = members.map(m => m.id).join(',')
    const sameMembers = prev && prev.membershipKey === key

    const bubbles = members.map((m) => {
      const old = prevMap?.get(m.id)
      return {
        id: m.id,
        name: m.name,
        discordHandle: m.discordHandle,
        xHandle: m.xHandle,
        color: m.color || GOLD,
        avatar: m.avatar,
        img: old?.img || loadTex(m.avatar),
        isHub: false,
        x: old?.x ?? 0,
        y: old?.y ?? 0,
        vx: old?.vx ?? 0,
        vy: old?.vy ?? 0,
        homeR: old?.homeR ?? 100,
        homeA: old?.homeA ?? 0,
        depth: old?.depth ?? 0.2,
        r: old?.r ?? 7,
        phase: old?.phase ?? hash01(m.id) * Math.PI * 2,
        ring: old?.ring ?? 0,
      }
    })

    // Only re-pack when membership or size class changes
    if (!sameMembers || !prev || Math.abs((prev.scale || 0) - scale) > 0.04) {
      packRings(bubbles, scale)
      for (const b of bubbles) {
        const old = prevMap?.get(b.id)
        if (old && Number.isFinite(old.x) && sameMembers) {
          b.x = old.x
          b.y = old.y
          b.vx = old.vx || 0
          b.vy = old.vy || 0
        } else {
          b.x = Math.cos(b.homeA) * b.homeR
          b.y = Math.sin(b.homeA) * b.homeR
        }
      }
    } else {
      // Soft metadata update only
      for (const b of bubbles) {
        const old = prevMap.get(b.id)
        if (!old) continue
        b.homeR = old.homeR
        b.homeA = old.homeA
        b.depth = old.depth
        b.r = old.r
        b.ring = old.ring
        b.x = old.x
        b.y = old.y
        b.vx = old.vx
        b.vy = old.vy
        b.phase = old.phase
        if (old.avatar !== b.avatar) b.img = loadTex(b.avatar)
        else b.img = old.img
      }
    }

    stateRef.current = {
      hub,
      bubbles,
      scale,
      pointer: prev?.pointer || {
        x: 0, y: 0, down: false, worldX: 0, worldY: 0,
        mode: null, lastX: 0, lastY: 0,
      },
      cam: prev?.cam || { x: 0, y: 0, zoom: 1 },
      hoverId: prev?.hoverId || null,
      retractUntil: prev?.retractUntil || 0,
      rot: prev?.rot || 0,
      cx: width / 2,
      cy: height / 2,
      widthWorld: width,
      heightWorld: height,
      lastT: performance.now(),
      frame: 0,
      membershipKey: key,
    }
  }, [members, width, height])

  useEffect(() => {
    const s = stateRef.current
    if (!s || !focusId) return
    const b = s.bubbles.find(x => x.id === focusId)
    if (!b) return
    s.cam.x = b.x
    s.cam.y = b.y
    s.cam.zoom = Math.min(2.4, Math.max(s.cam.zoom, 1.5))
  }, [focusId])

  useEffect(() => {
    const s = stateRef.current
    if (!s) return
    s.retractUntil = performance.now() + 800
    if (collapsed) {
      for (const b of s.bubbles) b.homeRCollapsed = 18 * s.scale
      s.cam.x = 0
      s.cam.y = 0
      s.cam.zoom = 1.2
    } else {
      for (const b of s.bubbles) b.homeRCollapsed = undefined
    }
  }, [collapsed])

  const toWorld = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    const s = stateRef.current
    if (!canvas || !s) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const sx = ((clientX - rect.left) / rect.width) * (s.widthWorld || width)
    const sy = ((clientY - rect.top) / rect.height) * (s.heightWorld || height)
    const zoom = s.cam.zoom || 1
    return {
      x: (sx - s.cx) / zoom + s.cam.x,
      y: (sy - s.cy) / zoom + s.cam.y,
    }
  }, [width, height])

  // Render + light physics loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width < 2 || height < 2) return undefined

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let raf = 0
    let running = true

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
      s.frame += 1

      const dt = Math.min(0.032, (now - s.lastT) / 1000) || 0.016
      s.lastT = now
      const t = now * 0.001
      const props = propsRef.current
      const retracting = now < s.retractUntil || props.collapsed
      const stretching = s.pointer.down && s.pointer.mode === 'stretch'
      const { bubbles, hub, pointer, cam } = s
      const n = bubbles.length
      const zoom = cam.zoom || 1

      // Ambient spin only when idle
      if (!props.collapsed && !s.pointer.down) s.rot += dt * 0.1

      // --- Lightweight physics (no N² collisions — packing already separates) ---
      const runPhysics = s.frame % 1 === 0 // every frame but cheap ops only
      if (runPhysics) {
        for (let i = 0; i < n; i++) {
          const b = bubbles[i]
          const homeR = props.collapsed ? (b.homeRCollapsed || 18 * s.scale) : b.homeR
          const homeA = b.homeA + s.rot
          const hx = Math.cos(homeA) * homeR
          const hy = Math.sin(homeA) * homeR

          const idle = props.collapsed || s.pointer.down ? 0 : 1.1 * s.scale
          const ix = idle ? Math.sin(t * 0.85 + b.phase) * idle : 0
          const iy = idle ? Math.cos(t * 0.7 + b.phase) * idle : 0

          const kHome = retracting ? 22 : (stretching ? 3.5 : 11)
          b.vx += (hx + ix - b.x) * kHome * dt
          b.vy += (hy + iy - b.y) * kHome * dt

          if (stretching && !props.collapsed) {
            const dx = pointer.worldX - b.x
            const dy = pointer.worldY - b.y
            const d2 = dx * dx + dy * dy
            const radius = 160 * s.scale
            if (d2 < radius * radius && d2 > 1) {
              const d = Math.sqrt(d2)
              const fall = 1 - d / radius
              const pull = 36 * fall * fall
              b.vx += (dx / d) * pull * dt
              b.vy += (dy / d) * pull * dt
            }
          }

          // Keep clear of hub
          const hd2 = b.x * b.x + b.y * b.y
          const hubMin = hub.r + b.r + 4 * s.scale
          if (hd2 < hubMin * hubMin && hd2 > 0.01) {
            const hd = Math.sqrt(hd2)
            const push = (hubMin - hd) * 24 * dt
            b.vx += (b.x / hd) * push
            b.vy += (b.y / hd) * push
          }

          const damp = retracting ? 0.84 : 0.9
          b.vx *= damp
          b.vy *= damp
          // Clamp velocity to avoid explosions
          const sp = Math.hypot(b.vx, b.vy)
          if (sp > 14) {
            b.vx = (b.vx / sp) * 14
            b.vy = (b.vy / sp) * 14
          }
          b.x += b.vx
          b.y += b.vy
        }
      }

      // --- Draw ---
      ctx.fillStyle = '#0a0a0e'
      ctx.fillRect(0, 0, width, height)

      // Cheap center glow (no full-frame gradient every time — small one is fine)
      if (s.frame % 2 === 0) {
        const g = ctx.createRadialGradient(s.cx, s.cy, 20, s.cx, s.cy, Math.min(width, height) * 0.4)
        g.addColorStop(0, 'rgba(201,169,110,0.07)')
        g.addColorStop(1, 'rgba(10,10,14,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, width, height)
      }

      ctx.save()
      ctx.translate(s.cx, s.cy)
      ctx.scale(zoom, zoom)
      ctx.translate(-cam.x, -cam.y)

      // Links — all straight lines, one path (fastest)
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(201,169,110,0.22)'
      ctx.lineWidth = 0.55 / zoom
      ctx.globalAlpha = props.collapsed ? 0.15 : 1
      // Draw every link but skip outer rings when zoomed out for speed
      const linkStep = zoom < 0.75 ? 2 : 1
      for (let i = 0; i < n; i += linkStep) {
        const b = bubbles[i]
        if (b.id === s.hoverId) continue
        ctx.moveTo(0, 0)
        ctx.lineTo(b.x, b.y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1

      const hotId = s.hoverId || props.selectedId
      if (hotId) {
        const b = bubbles.find(x => x.id === hotId)
        if (b) {
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = b.color || GOLD
          ctx.lineWidth = 1.6 / zoom
          ctx.stroke()
        }
      }

      // Bubbles
      for (let i = 0; i < n; i++) {
        const b = bubbles[i]
        // Skip far outer when zoomed out (cull)
        if (zoom < 0.7 && b.ring > 8 && b.id !== hotId) continue

        const isHot = b.id === hotId
        const rad = b.r * (isHot ? 1.3 : 1)

        ctx.save()
        ctx.beginPath()
        ctx.arc(b.x, b.y, rad, 0, Math.PI * 2)
        ctx.fillStyle = '#121218'
        ctx.fill()
        ctx.clip()
        if (b.img && b.img.complete && b.img.naturalWidth > 0) {
          ctx.drawImage(b.img, b.x - rad, b.y - rad, rad * 2, rad * 2)
        } else if (isHot || b.ring < 3) {
          ctx.fillStyle = b.color || GOLD
          ctx.fillRect(b.x - rad, b.y - rad, rad * 2, rad * 2)
        }
        ctx.restore()

        ctx.beginPath()
        ctx.arc(b.x, b.y, rad, 0, Math.PI * 2)
        ctx.strokeStyle = isHot ? CREAM : 'rgba(201,169,110,0.35)'
        ctx.lineWidth = (isHot ? 1.4 : 0.7) / zoom
        ctx.stroke()

        if (isHot) {
          ctx.font = `500 ${Math.max(8, 10 * s.scale)}px "Josefin Sans", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = CREAM
          ctx.fillText(b.name || '', b.x, b.y + rad + 3)
        }
      }

      // Hub
      {
        const hr = hub.r * (props.collapsed ? 0.9 : 1)
        ctx.beginPath()
        ctx.arc(0, 0, hr * 1.8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(201,169,110,0.12)'
        ctx.fill()

        ctx.save()
        ctx.beginPath()
        ctx.arc(0, 0, hr, 0, Math.PI * 2)
        ctx.fillStyle = '#0d0d14'
        ctx.fill()
        ctx.clip()
        if (hub.img?.complete && hub.img.naturalWidth > 0) {
          ctx.drawImage(hub.img, -hr, -hr, hr * 2, hr * 2)
        }
        ctx.restore()

        ctx.beginPath()
        ctx.arc(0, 0, hr, 0, Math.PI * 2)
        ctx.strokeStyle = GOLD
        ctx.lineWidth = 2.2 / zoom
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

  // Input: left-drag = PAN (always). Shift-drag = stretch. Wheel = zoom.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const hitTest = (wx, wy) => {
      const s = stateRef.current
      if (!s) return null
      if (Math.hypot(wx, wy) <= s.hub.r * 1.2) return s.hub
      let best = null
      let bestD = Infinity
      for (let i = s.bubbles.length - 1; i >= 0; i--) {
        const b = s.bubbles[i]
        const d = Math.hypot(b.x - wx, b.y - wy)
        const rad = b.r + 4
        if (d <= rad && d < bestD) {
          best = b
          bestD = d
        }
      }
      return best
    }

    const onPointerDown = (e) => {
      const s = stateRef.current
      if (!s) return
      const rect = canvas.getBoundingClientRect()
      s.pointer.x = e.clientX - rect.left
      s.pointer.y = e.clientY - rect.top
      s.pointer.lastX = s.pointer.x
      s.pointer.lastY = s.pointer.y
      s.pointer.down = true
      s.pointer.moved = false
      const w = toWorld(e.clientX, e.clientY)
      s.pointer.worldX = w.x
      s.pointer.worldY = w.y
      s.pointer.downX = w.x
      s.pointer.downY = w.y

      // ALWAYS pan on primary drag — stretch only with Shift
      if (e.shiftKey) {
        s.pointer.mode = 'stretch'
      } else {
        s.pointer.mode = 'pan'
      }
      canvas.style.cursor = 'grabbing'
      try { canvas.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      e.preventDefault()
    }

    const onPointerMove = (e) => {
      const s = stateRef.current
      if (!s) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const w = toWorld(e.clientX, e.clientY)
      s.pointer.worldX = w.x
      s.pointer.worldY = w.y

      if (s.pointer.down && s.pointer.mode === 'pan') {
        const zoom = s.cam.zoom || 1
        const dx = x - s.pointer.lastX
        const dy = y - s.pointer.lastY
        s.cam.x -= dx / zoom
        s.cam.y -= dy / zoom
        if (Math.abs(dx) + Math.abs(dy) > 2) s.pointer.moved = true
        s.pointer.lastX = x
        s.pointer.lastY = y
        s.pointer.x = x
        s.pointer.y = y
        canvas.style.cursor = 'grabbing'
        return
      }

      s.pointer.x = x
      s.pointer.y = y
      s.pointer.lastX = x
      s.pointer.lastY = y

      if (s.pointer.down && s.pointer.mode === 'stretch') {
        if (Math.hypot(w.x - s.pointer.downX, w.y - s.pointer.downY) > 5) s.pointer.moved = true
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

    const onPointerUp = (e) => {
      const s = stateRef.current
      if (!s) return
      const moved = s.pointer.moved
      s.pointer.down = false
      s.pointer.mode = null
      canvas.style.cursor = 'grab'
      try { canvas.releasePointerCapture(e.pointerId) } catch { /* ignore */ }

      if (!moved) {
        const w = toWorld(e.clientX, e.clientY)
        const hit = hitTest(w.x, w.y)
        if (hit?.isHub) propsRef.current.onHubClick?.()
        else if (hit) propsRef.current.onSelect?.(hit)
      }
    }

    const onWheel = (e) => {
      const s = stateRef.current
      if (!s) return
      e.preventDefault()
      e.stopPropagation()

      // Two-finger pan on trackpads
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) {
        const z = s.cam.zoom || 1
        s.cam.x += e.deltaX / z
        s.cam.y += e.deltaY / z
        return
      }

      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const before = toWorld(e.clientX, e.clientY)
      const factor = Math.exp(-e.deltaY * 0.0018)
      const next = Math.min(3.5, Math.max(0.4, (s.cam.zoom || 1) * factor))
      s.cam.zoom = next
      s.cam.x = before.x - (sx - s.cx) / next
      s.cam.y = before.y - (sy - s.cy) / next
    }

    const onDbl = () => {
      const s = stateRef.current
      if (!s) return
      s.cam.x = 0
      s.cam.y = 0
      s.cam.zoom = 1
    }

    const onContextMenu = (e) => e.preventDefault()

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDbl)
    canvas.addEventListener('contextmenu', onContextMenu)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDbl)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [toWorld, width, height])

  return (
    <canvas
      ref={canvasRef}
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
