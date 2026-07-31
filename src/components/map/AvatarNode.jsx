import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Html } from '@react-three/drei'
import * as THREE from 'three'

const textureCache = new Map()

function loadAvatarTexture(url) {
  if (!url) return null
  if (textureCache.has(url)) return textureCache.get(url)
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  const tex = loader.load(
    url,
    undefined,
    undefined,
    () => {
      // Discord CDN / CORS failure — leave placeholder
      textureCache.delete(url)
    },
  )
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  textureCache.set(url, tex)
  return tex
}

/**
 * Front-facing Conn3ctor avatar on an orbital ring.
 */
export function AvatarNode({
  member,
  size = 0.32,
  collapsed = false,
  selected = false,
  hovered = false,
  onHover,
  onSelect,
}) {
  const groupRef = useRef()
  const matRef = useRef()
  const [ready, setReady] = useState(false)

  const texture = useMemo(
    () => loadAvatarTexture(member.avatar),
    [member.avatar],
  )

  useEffect(() => {
    if (!texture) {
      setReady(false)
      return undefined
    }
    if (texture.image?.complete && texture.image.width) {
      setReady(true)
      return undefined
    }
    const id = setInterval(() => {
      if (texture.image?.width) {
        setReady(true)
        clearInterval(id)
      }
    }, 100)
    return () => clearInterval(id)
  }, [texture])

  const base = member._base || { x: 0, y: 0, z: 0 }
  const color = member.color || '#C9A96E'
  const isActive = hovered || selected

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    const t = state.clock.elapsedTime
    const collapse = collapsed ? 0.12 : 1

    const tx = base.x * collapse
    const ty = base.y * collapse + (isActive ? 0.25 : 0)
    const tz = base.z * collapse

    g.position.x += (tx - g.position.x) * 0.14
    g.position.y += (ty - g.position.y) * 0.14
    g.position.z += (tz - g.position.z) * 0.14

    const target = (isActive ? 1.45 : 1) * (1 + Math.sin(t * 1.6 + (member._ring || 0)) * 0.02)
    const s = g.scale.x + (target - g.scale.x) * 0.16
    g.scale.setScalar(s)

    if (matRef.current) {
      matRef.current.emissiveIntensity = isActive ? 0.45 : 0.12
    }
  })

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
      <Billboard follow lockZ={false}>
        <mesh>
          <circleGeometry args={[size, 28]} />
          {ready && texture ? (
            <meshStandardMaterial
              ref={matRef}
              map={texture}
              emissive={color}
              emissiveIntensity={0.12}
              roughness={0.5}
              metalness={0.1}
              transparent
              side={THREE.DoubleSide}
            />
          ) : (
            <meshStandardMaterial
              ref={matRef}
              color={color}
              emissive={color}
              emissiveIntensity={0.4}
              roughness={0.45}
              metalness={0.25}
              side={THREE.DoubleSide}
            />
          )}
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[size * 0.94, size * 1.12, 32]} />
          <meshBasicMaterial
            color={isActive ? '#EDE8DC' : '#C9A96E'}
            transparent
            opacity={isActive ? 0.95 : 0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>

      {isActive && (
        <Html
          center
          distanceFactor={10}
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '12px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#EDE8DC',
            textShadow: '0 2px 14px rgba(0,0,0,0.9)',
            transform: 'translateY(36px)',
          }}
        >
          {member.name}
        </Html>
      )}
    </group>
  )
}
