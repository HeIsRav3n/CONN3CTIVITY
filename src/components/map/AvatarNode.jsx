import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'

const textureCache = new Map()

function loadAvatarTexture(url) {
  if (!url) return null
  if (textureCache.has(url)) return textureCache.get(url)
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  const tex = loader.load(url)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  textureCache.set(url, tex)
  return tex
}

/**
 * Single Conn3ctor on the orbital shell.
 * `detailed` → textured disc; otherwise a gold point disc (LOD).
 */
export function AvatarNode({
  member,
  detailed = true,
  collapsed = false,
  selected = false,
  hovered = false,
  onHover,
  onSelect,
}) {
  const groupRef = useRef()
  const matRef = useRef()
  const [ready, setReady] = useState(false)

  // Per-node jelly spring (squash-stretch on hover/select)
  const jellyScale = useRef({ sx: 1, sy: 1, sz: 1 })
  const jellyVel   = useRef({ sx: 0, sy: 0, sz: 0 })
  const prevActive = useRef(false)
  // Deterministic per-node phase for organic micro-wobble
  const phase = useMemo(() => {
    let h = 0
    for (let i = 0; i < (member.id?.length || 0); i++) h = (h * 31 + member.id.charCodeAt(i)) & 0xffffff
    return h / 0xffffff * Math.PI * 2
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.id])

  const texture = useMemo(() => {
    if (!detailed) return null
    return loadAvatarTexture(member.avatar)
  }, [detailed, member.avatar])

  useEffect(() => {
    if (!texture) {
      setReady(false)
      return
    }
    if (texture.image?.complete) {
      setReady(true)
      return
    }
    const onLoad = () => setReady(true)
    texture.addEventListener?.('change', onLoad)
    // TextureLoader fires image onload asynchronously
    const id = setInterval(() => {
      if (texture.image?.width) {
        setReady(true)
        clearInterval(id)
      }
    }, 120)
    return () => {
      clearInterval(id)
      texture.removeEventListener?.('change', onLoad)
    }
  }, [texture])

  const base = member._base || { x: 0, y: 0, z: 0 }
  const color = member.color || '#C9A96E'

  useFrame((state, delta) => {
    const g = groupRef.current
    if (!g) return
    const t = state.clock.elapsedTime
    const collapse = collapsed ? 0.18 : 1
    const isActive = hovered || selected

    // ── Jelly press spring ──────────────────────────────────
    // On activate: squash Y, bulge X/Z (Arkham press)
    // On release:  over-stretch Y briefly, then settle
    const STIFF = 260, DAMP = 14
    const jp = jellyScale.current
    const jv = jellyVel.current
    const dt = Math.min(delta, 0.05)

    // Trigger kick when activation state changes
    if (isActive && !prevActive.current) {
      jv.sy -= 0.8   // impulse: squash Y
      jv.sx += 0.4   // bulge X
      jv.sz += 0.4   // bulge Z
    } else if (!isActive && prevActive.current) {
      jv.sy += 0.5   // release: stretch Y
      jv.sx -= 0.25
      jv.sz -= 0.25
    }
    prevActive.current = isActive

    // Integrate spring toward rest=1
    jv.sx += (-(jp.sx - 1) * STIFF - jv.sx * DAMP) * dt
    jv.sy += (-(jp.sy - 1) * STIFF - jv.sy * DAMP) * dt
    jv.sz += (-(jp.sz - 1) * STIFF - jv.sz * DAMP) * dt
    jp.sx += jv.sx * dt
    jp.sy += jv.sy * dt
    jp.sz += jv.sz * dt

    // ── Micro-wobble (per-node organic sway) ────────────────
    const wobble = Math.sin(t * 1.1 + phase) * 0.008
    const wobbleBreath = 1 + Math.sin(t * 1.4 + phase + (member._shell || 0)) * 0.015

    // ── Position lerp ────────────────────────────────────────
    const baseScale = (isActive ? 1.35 : 1) * wobbleBreath
    const tx = base.x * collapse
    const ty = base.y * collapse
    const tz = base.z * collapse

    let hx = tx, hy = ty, hz = tz
    if (isActive) {
      const cam = state.camera.position
      const pull = 0.22
      hx = tx + (cam.x - tx) * pull * 0.08
      hy = ty + (cam.y - ty) * pull * 0.08
      hz = tz + (cam.z - tz) * pull * 0.08
    }

    g.position.x += (hx - g.position.x) * 0.12
    g.position.y += (hy + wobble - g.position.y) * 0.12
    g.position.z += (hz - g.position.z) * 0.12

    // Apply jelly scale on top of base scale
    g.scale.set(
      jp.sx * baseScale,
      jp.sy * baseScale,
      jp.sz * baseScale,
    )

    if (matRef.current) {
      matRef.current.emissiveIntensity = isActive ? 0.55 : 0.18
    }
  })

  const size = detailed ? 0.28 : 0.1

  return (
    <group
      ref={groupRef}
      position={[base.x, base.y, base.z]}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover?.(member)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        onHover?.(null)
        document.body.style.cursor = 'default'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(member)
      }}
    >
      <Billboard follow>
        <mesh>
          <circleGeometry args={[size, 24]} />
          {detailed && ready && texture ? (
            <meshStandardMaterial
              ref={matRef}
              map={texture}
              emissive={color}
              emissiveIntensity={0.18}
              roughness={0.55}
              metalness={0.15}
              transparent
              side={THREE.DoubleSide}
            />
          ) : (
            <meshStandardMaterial
              ref={matRef}
              color={color}
              emissive={color}
              emissiveIntensity={detailed ? 0.35 : 0.8}
              roughness={0.4}
              metalness={0.35}
              transparent
              opacity={detailed ? 0.95 : 0.75}
              side={THREE.DoubleSide}
            />
          )}
        </mesh>
        {/* Gold ring */}
        <mesh position={[0, 0, -0.002]}>
          <ringGeometry args={[size * 0.92, size * 1.08, 28]} />
          <meshBasicMaterial
            color={hovered || selected ? color : '#C9A96E'}
            transparent
            opacity={hovered || selected ? 0.95 : 0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>

      {(hovered || selected) && (
        <Html
          center
          distanceFactor={8}
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#EDE8DC',
            textShadow: '0 2px 12px rgba(0,0,0,0.85)',
            transform: 'translateY(28px)',
          }}
        >
          {member.name}
        </Html>
      )}
    </group>
  )
}
