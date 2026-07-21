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

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    const t = state.clock.elapsedTime
    const collapse = collapsed ? 0.18 : 1
    const breathe = 1 + Math.sin(t * 1.4 + (member._shell || 0)) * 0.015
    const targetScale = (hovered || selected ? 1.35 : 1) * breathe

    const tx = base.x * collapse
    const ty = base.y * collapse
    const tz = base.z * collapse

    // Ease toward home (and pull slightly toward camera when hovered)
    let hx = tx
    let hy = ty
    let hz = tz
    if (hovered || selected) {
      const cam = state.camera.position
      const pull = 0.22
      hx = tx + (cam.x - tx) * pull * 0.08
      hy = ty + (cam.y - ty) * pull * 0.08
      hz = tz + (cam.z - tz) * pull * 0.08
    }

    g.position.x += (hx - g.position.x) * 0.12
    g.position.y += (hy - g.position.y) * 0.12
    g.position.z += (hz - g.position.z) * 0.12
    const s = g.scale.x + (targetScale - g.scale.x) * 0.15
    g.scale.setScalar(s)

    if (matRef.current) {
      matRef.current.emissiveIntensity = hovered || selected ? 0.55 : 0.18
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
