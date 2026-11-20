import { useRef, useEffect, useCallback } from 'react'

const GOLD = '#C9A96E'
const CREAM = '#EDE8DC'
const textureCache = new Map()
const MAX_TEXTURES = 200
const FAILED_TEXTURE = Symbol('failed texture')

function loadTex(url) {
  if (!url) return null
  if (textureCache.has(url)) {
    const cached = textureCache.get(url)
    if (cached === FAILED_TEXTURE) return null
    // Touch for LRU: most recently used moves to the end.
    textureCache.delete(url)
    textureCache.set(url, cached)
    return cached
  }
  const img = new Image()
  img.decoding = 'async'
  // Discord CDN does not send CORS headers — setting crossOrigin would block avatars.
  if (url.startsWith('/') || (typeof window !== 'undefined' && url.startsWith(window.location.origin))) {
    img.crossOrigin = 'anonymous'
  }
  img.onerror = () => {
    // Broken avatar: remember the failure so callers render a fallback
    // instead of retrying (and re-rendering an empty bubble) forever.
    textureCache.set(url, FAILED_TEXTURE)
  }
  img.src = url
  textureCache.set(url, img)
  // Evict least recently used; bubbles already holding an Image keep it alive.
  while (textureCache.size > MAX_TEXTURES) {
    textureCache.delete(textureCache.keys().next().value)
  }
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

/** Pack rings to fill the canvas — readable bubbles, no overflow. */
function packRings(members, width, height, touchBoost = 1) {
  const n = members.length
  const span = Math.max(160, Math.min(width, height))
  const maxR = span * 0.44
  const hubClear = Math.max(30, span * 0.06) * touchBoost

  let idx = 0
  let ring = 0
  while (idx < n) {
    const R = hubClear + 14 + ring * Math.max(20, span * 0.042)
    const bubbleR = Math.max(9, Math.min(17, (15.5 - ring * 0.5) * (span / 700))) * touchBoost
    const spacing = bubbleR * 2.2
    const capacity = Math.max(10, Math.floor((2 * Math.PI * R) / spacing))
    const count = Math.min(capacity, n - idx)
    const offset = ring * 0.17
    for (let i = 0; i < count; i++) {
      const m = members[idx + i]
      const a = (i / count) * Math.PI * 2 + offset
      m.homeR = R
      m.homeA = a
      m.depth = 0.1 + ring * 0.05
      m.r = bubbleR
      m.x = Math.cos(a) * R
      m.y = Math.sin(a) * R
      m.vx = 0
      m.vy = 0
      m.phase = hash01(m.id) * Math.PI * 2
      m.ring = ring
    }
    idx += count
    ring += 1
    if (ring > 48) break
  }

  let outer = 0
  for (const m of members) outer = Math.max(outer, (m.homeR || 0) + (m.r || 0))
  if (outer > maxR && outer > 0) {
    const k = maxR / outer
    for (const m of members) {
      m.homeR *= k
      m.r = Math.max(8 * touchBoost, m.r * Math.min(1.05, Math.sqrt(k) * 1.2))
      m.x = Math.cos(m.homeA) * m.homeR
      m.y = Math.sin(m.homeA) * m.homeR
    }
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
  controlsRef,
}) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const wakeRef = useRef(null)
  const activeRef = useRef(active)
  const propsRef = useRef({ collapsed, selectedId, focusId, onHover, onSelect, onHubClick })

  useEffect(() => {
    propsRef.current = { collapsed, selectedId, focusId, onHover, onSelect, onHubClick }
    activeRef.current = active
  })

  useEffect(() => {
    if (!controlsRef) return undefined
    controlsRef.current = {
      zoomIn() {
        const s = stateRef.current
        if (!s) return
        wakeRef.current?.()
        s.cam.zoom = Math.min(3.5, (s.cam.zoom || 1) * 1.22)
      },
      zoomOut() {
        const s = stateRef.current
        if (!s) return
        wakeRef.current?.()
        s.cam.zoom = Math.max(0.4, (s.cam.zoom || 1) / 1.22)
      },
      reset() {
        const s = stateRef.current
        if (!s) return
        wakeRef.current?.()
        s.cam.x = 0
        s.cam.y = 0
        s.cam.zoom = 1
      },
    }
    return () => { controlsRef.current = null }
  }, [controlsRef])

  useEffect(() => {
    if (width < 40 || height < 40) return
    const scale = Math.min(width, height) / 700
    // Touch devices get larger bubbles and a larger hub so targets stay tappable.
    const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
    const touchBoost = coarse ? 1.3 : 1
    const hub = {
      id: 'main',
      isHub: true,
      name: 'CONN3CTIVITY',
      avatar: '/map-logo.png',
      color: GOLD,
      x: 0,
      y: 0,
      r: Math.max(coarse ? 28 : 22, Math.min(width, height) * (coarse ? 0.06 : 0.048)),
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
    if (!sameMembers || !prev || Math.abs((prev.scale || 0) - scale) > 0.03) {
      packRings(bubbles, width, height, touchBoost)
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
      pointers: prev?.pointers || new Map(),
      pinch: null,
      rect: prev?.rect || null,
      rectAt: 0,
      lastInteract: prev?.lastInteract || performance.now(),
      idleFrames: 0,
      // Preserve the sleep flag across membership changes: the render
      // loop only stops when it sets asleep, so a fresh state that
      // resets it to false while no frame is pending leaves wake() a
      // no-op and the loop permanently dead. Keeping the flag lets the
      // wake() call at the end of this effect restart it.
      asleep: prev?.asleep ?? false,
      maxSp: 0,
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
    // A membership change while the loop sleeps must wake it to settle the new layout.
    wakeRef.current?.()
  }, [members, width, height])

  // Wake the render loop when the map scrolls back into view.
  useEffect(() => {
    if (active) wakeRef.current?.()
  }, [active])

  useEffect(() => {
    const s = stateRef.current
    if (!s || !focusId) return
    wakeRef.current?.()
    const b = s.bubbles.find(x => x.id === focusId)
    if (!b) return
    s.cam.x = b.x
    s.cam.y = b.y
    s.cam.zoom = Math.min(2.4, Math.max(s.cam.zoom, 1.5))
  }, [focusId])

  useEffect(() => {
    const s = stateRef.current
    if (!s) return
    wakeRef.current?.()
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
    // Cache the rect: getBoundingClientRect() forces layout, and pointer
    // handlers can fire several times per frame. Refresh at most every
    // 250ms, and on every pointerdown (gesture start).
    const now = performance.now()
    if (!s.rect || now - (s.rectAt || 0) > 250) {
      s.rect = canvas.getBoundingClientRect()
      s.rectAt = now
    }
    const rect = s.rect
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
    if (!canvas || width < 40 || height < 40) return undefined

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    // No pixel width/height overrides here: the CSS width:100% / height:100%
    // governs layout, so the canvas can never desync from its container.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let raf = 0
    let running = true

    // Wake the loop after it slept (idle, hidden tab, or scrolled away).
    const wake = () => {
      const st = stateRef.current
      if (!st) return
      st.lastInteract = performance.now()
      st.idleFrames = 0
      if (st.asleep) {
        st.asleep = false
        raf = requestAnimationFrame(step)
      }
    }
    wakeRef.current = wake

    const onVisible = () => { if (!document.hidden) wake() }
    document.addEventListener('visibilitychange', onVisible)

    const step = (now) => {
      if (!running) return
      // Re-schedule FIRST, as the pre-Phase-2 loop did: this frame is the
      // only thing keeping the chain alive, so every return below must
      // cancel it explicitly. Phase 2 dropped this line and never
      // re-scheduled anywhere in step, so the loop ran exactly once per
      // wake and the canvas froze blank whenever that one frame fired
      // while the map was off-screen (or was consumed by a membership
      // change). No return below may silently end the loop.
      raf = requestAnimationFrame(step)
      const s = stateRef.current
      if (!s) return
      // Hidden or scrolled away: stop scheduling instead of spinning forever.
      if (!activeRef.current || document.hidden) {
        s.asleep = true
        cancelAnimationFrame(raf)
        return
      }

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

      // Ambient spin only when idle — and it pauses a few seconds after the
      // last interaction so the scene can settle and the loop can sleep.
      if (!props.collapsed && !s.pointer.down && now - (s.lastInteract || 0) < 4000) s.rot += dt * 0.1

      // --- Lightweight physics (no N² collisions — packing already separates) ---
      const runPhysics = s.frame % 1 === 0 // every frame but cheap ops only
      s.maxSp = 0
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
          s.maxSp = Math.max(s.maxSp, Math.hypot(b.vx, b.vy))
          b.x += b.vx
          b.y += b.vy
        }
      }

      // --- Draw ---
      ctx.fillStyle = '#0a0a0e'
      ctx.fillRect(0, 0, width, height)

      const glowR = Math.min(width, height) * 0.42
      const g = ctx.createRadialGradient(s.cx, s.cy, 12, s.cx, s.cy, glowR)
      g.addColorStop(0, 'rgba(201,169,110,0.08)')
      g.addColorStop(1, 'rgba(10,10,14,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)

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
        if (zoom < 0.55 && b.ring > 14 && b.id !== hotId) continue

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
        } else if (!b.img || isHot || b.ring < 3) {
          // No image (failed load) or still loading: never an empty bubble.
          ctx.fillStyle = b.color || GOLD
          ctx.fillRect(b.x - rad, b.y - rad, rad * 2, rad * 2)
          if (!b.img && b.name) {
            ctx.fillStyle = '#0B0A08'
            ctx.font = `600 ${Math.max(8, rad * 0.9)}px "Josefin Sans", sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(b.name[0].toUpperCase(), b.x, b.y + 0.5)
          }
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
        } else {
          ctx.strokeStyle = GOLD
          ctx.lineWidth = Math.max(1.2, 1.6 / zoom)
          ctx.beginPath()
          ctx.arc(-hr * 0.22, 0, hr * 0.58, 0, Math.PI * 2)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(hr * 0.22, 0, hr * 0.58, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = GOLD
          ctx.font = `300 ${Math.max(10, hr * 0.72)}px "Josefin Sans", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('3', 0, 1)
        }
        ctx.restore()

        ctx.beginPath()
        ctx.arc(0, 0, hr, 0, Math.PI * 2)
        ctx.strokeStyle = GOLD
        ctx.lineWidth = 2.2 / zoom
        ctx.stroke()

        // Hub name under the logo on small screens, where the hub alone is
        // too small to read as a brand mark.
        if (s.widthWorld < 640 && !props.collapsed) {
          ctx.font = `500 ${Math.max(9, 11 * s.scale)}px "Josefin Sans", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = 'rgba(237,232,220,0.75)'
          ctx.fillText('CONN3CTIVITY', 0, hr + 6)
        }
      }

      ctx.restore()

      // Idle detection: once the scene has settled and nobody is touching
      // it, stop scheduling frames entirely until an interaction wakes it.
      const settled = (s.maxSp || 0) < 0.05
      const idleFor = now - (s.lastInteract || 0)
      if (!s.pointer.down && !retracting && idleFor > 2500 && settled) {
        s.idleFrames = (s.idleFrames || 0) + 1
        if (s.idleFrames > 45) {
          s.asleep = true
          cancelAnimationFrame(raf)
          return
        }
      } else {
        s.idleFrames = 0
      }
    }

    raf = requestAnimationFrame(step)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisible)
      if (wakeRef.current === wake) wakeRef.current = null
    }
  }, [width, height])

  // Input: left-drag = PAN (always). Shift-drag = stretch. Wheel = zoom.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const hitTest = (wx, wy) => {
      const s = stateRef.current
      if (!s) return null
      if (Math.hypot(wx, wy) <= s.hub.r * 1.35) return s.hub
      let best = null
      let bestD = Infinity
      for (let i = s.bubbles.length - 1; i >= 0; i--) {
        const b = s.bubbles[i]
        const d = Math.hypot(b.x - wx, b.y - wy)
        // 44px minimum hit diameter so bubbles stay tappable on touch.
        const rad = Math.max(b.r * 1.7, 22)
        if (d <= rad && d < bestD) {
          best = b
          bestD = d
        }
      }
      return best
    }

    // Same cached rect as toWorld: never force layout more than once per 250ms.
    const getRect = () => {
      const s = stateRef.current
      if (!s) return canvas.getBoundingClientRect()
      const now = performance.now()
      if (!s.rect || now - (s.rectAt || 0) > 250) {
        s.rect = canvas.getBoundingClientRect()
        s.rectAt = now
      }
      return s.rect
    }

    const onPointerDown = (e) => {
      const s = stateRef.current
      if (!s) return
      wakeRef.current?.()
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      // Second finger down: pinch-to-zoom takes over from pan/stretch.
      if (s.pointers.size === 2) {
        const [a, b] = [...s.pointers.values()]
        s.pinch = {
          startDist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          startZoom: s.cam.zoom || 1,
        }
        s.pointer.down = true
        s.pointer.moved = true
        s.pointer.mode = 'pinch'
        return
      }
      // Fresh rect at gesture start: layout may have shifted since the cache.
      s.rect = canvas.getBoundingClientRect()
      s.rectAt = performance.now()
      const rect = s.rect
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
      // Touch pointers have implicit capture, and preventDefault would block
      // the page scroll that touchAction pan-y is meant to allow. Only
      // mouse drags capture and preventDefault.
      if (e.pointerType === 'mouse') {
        try { canvas.setPointerCapture(e.pointerId) } catch { /* ignore */ }
        e.preventDefault()
      }
    }

    const onPointerMove = (e) => {
      const s = stateRef.current
      if (!s) return
      if (s.pointers.has(e.pointerId)) {
        s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }

      // Pinch-to-zoom: zoom factor from the gesture start, anchored under
      // the live midpoint so the map also follows the fingers as they pan.
      if (s.pointer.mode === 'pinch' && s.pointers.size === 2 && s.pinch) {
        wakeRef.current?.()
        const [a, b] = [...s.pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        const rect = getRect()
        const midClientX = (a.x + b.x) / 2
        const midClientY = (a.y + b.y) / 2
        const before = toWorld(midClientX, midClientY)
        const next = Math.min(3.5, Math.max(0.4, s.pinch.startZoom * (dist / s.pinch.startDist)))
        s.cam.zoom = next
        s.cam.x = before.x - (midClientX - rect.left - s.cx) / next
        s.cam.y = before.y - (midClientY - rect.top - s.cy) / next
        return
      }

      const rect = getRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const w = toWorld(e.clientX, e.clientY)
      s.pointer.worldX = w.x
      s.pointer.worldY = w.y

      if (s.pointer.down && s.pointer.mode === 'pan') {
        wakeRef.current?.()
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
        wakeRef.current?.()
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
      s.pointers.delete(e.pointerId)
      // One finger lifted mid-pinch: the other finger keeps panning, no tap.
      if (s.pointers.size > 0) {
        if (s.pointers.size < 2) s.pinch = null
        if (s.pointer.mode === 'pinch') {
          s.pointer.mode = 'pan'
          // Re-anchor the pan to the remaining finger, or the next move
          // would jump by the lifted finger's last offset.
          const remaining = [...s.pointers.values()][0]
          const r = getRect()
          s.pointer.lastX = remaining.x - r.left
          s.pointer.lastY = remaining.y - r.top
          s.pointer.x = s.pointer.lastX
          s.pointer.y = s.pointer.lastY
        }
        return
      }
      const moved = s.pointer.moved
      s.pointer.down = false
      s.pointer.mode = null
      s.pinch = null
      canvas.style.cursor = 'grab'
      try { canvas.releasePointerCapture(e.pointerId) } catch { /* ignore */ }

      if (!moved) {
        const w = toWorld(e.clientX, e.clientY)
        const hit = hitTest(w.x, w.y)
        if (hit?.isHub) propsRef.current.onHubClick?.()
        else if (hit) propsRef.current.onSelect?.(hit)
      }
    }

    const onPointerCancel = (e) => {
      const s = stateRef.current
      if (!s) return
      // The browser took the gesture (e.g. a page scroll started): drop it.
      s.pointers.delete(e.pointerId)
      s.pinch = null
      if (s.pointers.size === 0) {
        s.pointer.down = false
        s.pointer.mode = null
      }
      canvas.style.cursor = 'grab'
    }

    const onWheel = (e) => {
      const s = stateRef.current
      if (!s) return
      wakeRef.current?.()
      e.preventDefault()
      e.stopPropagation()
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation()

      // Two-finger pan on trackpads
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) {
        const z = s.cam.zoom || 1
        s.cam.x += e.deltaX / z
        s.cam.y += e.deltaY / z
        return
      }

      const rect = getRect()
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
      wakeRef.current?.()
      s.cam.x = 0
      s.cam.y = 0
      s.cam.zoom = 1
    }

    const onContextMenu = (e) => e.preventDefault()

    const lockScroll = (lock) => {
      window.dispatchEvent(new CustomEvent('conn3ctivity:map-scroll-lock', { detail: lock }))
    }
    // Scroll lock is a mouse-only concern (it pauses Lenis on desktop).
    // Touch scrolling must never be locked: the page scrolls natively.
    const onEnter = (e) => { if (e.pointerType === 'mouse') lockScroll(true) }
    const onLeave = () => {
      lockScroll(false)
      const s = stateRef.current
      if (s) {
        s.hoverId = null
        s.pointer.down = false
        s.pointer.mode = null
      }
      canvas.style.cursor = 'grab'
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDbl)
    canvas.addEventListener('contextmenu', onContextMenu)
    canvas.addEventListener('pointerenter', onEnter)
    canvas.addEventListener('pointerleave', onLeave)

    return () => {
      lockScroll(false)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDbl)
      canvas.removeEventListener('contextmenu', onContextMenu)
      canvas.removeEventListener('pointerenter', onEnter)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [toWorld, width, height])

  return (
    <canvas
      ref={canvasRef}
      aria-label="Conn3ction map. Drag to pan, pinch or scroll to zoom, tap a bubble to view a profile."
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        // Vertical page scroll stays with the browser on touch; only
        // horizontal drags are captured for panning. touchAction none here
        // used to trap the page: the map filled most of the viewport and
        // could not be scrolled past on mobile.
        touchAction: 'pan-y',
        cursor: 'grab',
        background: '#0a0a0e',
      }}
    />
  )
}
