import { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Float, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { AvatarNode } from './AvatarNode'
import { assignOrbitalRings, hash01 } from '../../lib/sphereLayout'

const GOLD = '#C9A96E'
const CREAM = '#EDE8DC'

function Hub({ onClick, collapsed }) {
  const tex = useTexture('/map-logo.png')
  tex.colorSpace = THREE.SRGBColorSpace
  const ringRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.25
    }
  })

  return (
    <Float speed={0.9} rotationIntensity={0.08} floatIntensity={0.18}>
      <group
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      >
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 48]} />
          <meshBasicMaterial color={GOLD} transparent opacity={collapsed ? 0.28 : 0.12} depthWrite={false} />
        </mesh>

        <mesh rotation={[-0.35, 0.15, 0]}>
          <circleGeometry args={[0.95, 48]} />
          <meshStandardMaterial
            map={tex}
            emissive={GOLD}
            emissiveIntensity={0.4}
            roughness={0.35}
            metalness={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh ref={ringRef} rotation={[-Math.PI / 2.15, 0, 0]}>
          <torusGeometry args={[1.25, 0.022, 12, 72]} />
          <meshStandardMaterial
            color={GOLD}
            emissive={GOLD}
            emissiveIntensity={1.4}
            metalness={0.85}
            roughness={0.2}
          />
        </mesh>
      </group>
    </Float>
  )
}

/** Decorative gold guide rings under each orbital shell */
function RingGuides({ radii, collapsed }) {
  return (
    <group>
      {radii.map((R, i) => (
        <mesh
          key={R}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.12 - i * 0.01, 0]}
          scale={collapsed ? 0.12 : 1}
        >
          <torusGeometry args={[R, 0.006, 8, 96]} />
          <meshBasicMaterial
            color={GOLD}
            transparent
            opacity={0.1 + (i === 0 ? 0.08 : 0)}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Cheap gold dots for outer-ring members (instanced) */
function DotField({ members, collapsed }) {
  const meshRef = useRef()
  const count = members.length
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(GOLD), [])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh || !count) return
    const collapse = collapsed ? 0.12 : 1
    members.forEach((m, i) => {
      const b = m._base || { x: 0, y: 0, z: 0 }
      dummy.position.set(b.x * collapse, b.y * collapse, b.z * collapse)
      dummy.scale.setScalar(collapsed ? 0.4 : 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  if (!count) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={GOLD}
        emissiveIntensity={0.9}
        roughness={0.35}
        metalness={0.4}
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  )
}

function SpokeBeams({ members, hoveredId, selectedId, collapsed }) {
  const lineRef = useRef()

  const beamMembers = useMemo(() => {
    const hot = members.filter(m => m.id === hoveredId || m.id === selectedId)
    // Spokes only for inner two rings + hot
    const inner = members.filter(m => (m._ring ?? 99) <= 1).filter((_, i) => i % 3 === 0)
    const map = new Map()
    ;[...hot, ...inner.slice(0, 36)].forEach(m => map.set(m.id, m))
    return [...map.values()]
  }, [members, hoveredId, selectedId])

  const geo = useMemo(() => {
    const positions = new Float32Array(beamMembers.length * 6)
    const colors = new Float32Array(beamMembers.length * 6)
    const gold = new THREE.Color(GOLD)
    const dim = new THREE.Color('#2a2418')
    beamMembers.forEach((m, i) => {
      const b = m._base || { x: 0, y: 0, z: 0 }
      const hot = m.id === hoveredId || m.id === selectedId
      const c = hot ? gold : dim
      positions.set([0, 0.05, 0, b.x, b.y, b.z], i * 6)
      colors.set([gold.r, gold.g, gold.b, c.r, c.g, c.b], i * 6)
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [beamMembers, hoveredId, selectedId])

  useFrame(() => {
    if (!lineRef.current) return
    const attr = lineRef.current.geometry.getAttribute('position')
    if (!attr) return
    const collapse = collapsed ? 0.12 : 1
    beamMembers.forEach((m, i) => {
      const b = m._base || { x: 0, y: 0, z: 0 }
      attr.setXYZ(i * 2, 0, 0.05, 0)
      attr.setXYZ(i * 2 + 1, b.x * collapse, b.y * collapse, b.z * collapse)
    })
    attr.needsUpdate = true
  })

  return (
    <lineSegments ref={lineRef} geometry={geo}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  )
}

function OrbitField({
  members,
  collapsed,
  selectedId,
  hoveredId,
  detailedBudget,
  onHover,
  onSelect,
}) {
  const groupRef = useRef()

  useFrame((_, delta) => {
    if (!groupRef.current || collapsed) return
    groupRef.current.rotation.y += delta * 0.06
  })

  const radii = useMemo(() => {
    const set = new Set()
    members.forEach((m) => {
      if (m._radius) set.add(Math.round(m._radius * 100) / 100)
    })
    return [...set].sort((a, b) => a - b)
  }, [members])

  // Inner rings + hot get real avatars; outer become dots
  const { detailed, dots } = useMemo(() => {
    const hot = new Set([selectedId, hoveredId].filter(Boolean))
    const ranked = [...members].sort((a, b) => {
      const ra = hot.has(a.id) ? -1 : (a._ring ?? 0)
      const rb = hot.has(b.id) ? -1 : (b._ring ?? 0)
      if (ra !== rb) return ra - rb
      return hash01(a.id) - hash01(b.id)
    })
    const detailedList = []
    const dotList = []
    for (const m of ranked) {
      if (hot.has(m.id) || detailedList.length < detailedBudget) detailedList.push(m)
      else dotList.push(m)
    }
    return { detailed: detailedList, dots: dotList }
  }, [members, detailedBudget, selectedId, hoveredId])

  return (
    <group ref={groupRef}>
      <RingGuides radii={radii} collapsed={collapsed} />
      <SpokeBeams
        members={members}
        hoveredId={hoveredId}
        selectedId={selectedId}
        collapsed={collapsed}
      />
      <DotField members={dots} collapsed={collapsed} />
      {detailed.map((m) => (
        <AvatarNode
          key={m.id}
          member={m}
          size={(m._ring ?? 0) === 0 ? 0.36 : (m._ring ?? 0) <= 1 ? 0.3 : 0.24}
          collapsed={collapsed}
          selected={selectedId === m.id}
          hovered={hoveredId === m.id}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}

function CameraFocus({ focusId, members, controlsRef }) {
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3(0, 0, 0))
  const goalCam = useRef(new THREE.Vector3(0, 7.5, 11))

  useEffect(() => {
    if (!focusId) {
      goalCam.current.set(0, 7.5, 11)
      targetRef.current.set(0, 0, 0)
      return
    }
    const m = members.find((x) => x.id === focusId)
    if (!m?._base) return
    const b = m._base
    targetRef.current.set(b.x * 0.55, 0.2, b.z * 0.55)
    goalCam.current.set(b.x * 0.35 + 2.5, 4.2, b.z * 0.35 + 5.5)
  }, [focusId, members])

  useFrame(() => {
    if (!focusId && !controlsRef.current) return
    if (!focusId) return
    camera.position.lerp(goalCam.current, 0.07)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetRef.current, 0.07)
      controlsRef.current.update()
    }
  })

  return null
}

function Scene({
  members,
  collapsed,
  selectedId,
  hoveredId,
  focusId,
  onHover,
  onSelect,
  onHubClick,
  detailedBudget,
}) {
  const controlsRef = useRef()

  return (
    <>
      <color attach="background" args={['#07070b']} />
      <fog attach="fog" args={['#07070b', 16, 36]} />

      <ambientLight intensity={0.45} color="#EDE8DC" />
      <directionalLight position={[6, 12, 4]} intensity={1.1} color={CREAM} />
      <pointLight position={[0, 2, 0]} intensity={1.6} color={GOLD} distance={16} />
      <pointLight position={[-8, 4, -4]} intensity={0.35} color="#8B7355" distance={22} />

      {/* Soft ground plane glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <circleGeometry args={[14, 64]} />
        <meshBasicMaterial color="#0c0c12" transparent opacity={0.9} />
      </mesh>

      <Suspense fallback={null}>
        <Hub onClick={onHubClick} collapsed={collapsed} />
      </Suspense>

      <OrbitField
        members={members}
        collapsed={collapsed}
        selectedId={selectedId}
        hoveredId={hoveredId}
        detailedBudget={detailedBudget}
        onHover={onHover}
        onSelect={onSelect}
      />

      <CameraFocus focusId={focusId} members={members} controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={6}
        maxDistance={22}
        minPolarAngle={0.45}
        maxPolarAngle={Math.PI / 2.15}
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.5}
        target={[0, 0, 0]}
      />
    </>
  )
}

/**
 * Cinematic orbital-ring Conn3ctor map (Saturn / solar-system layout).
 */
export function Conn3ctorOrb({
  members: rawMembers = [],
  collapsed = false,
  selectedId = null,
  hoveredId = null,
  focusId = null,
  onHover,
  onSelect,
  onHubClick,
  active = true,
  isMobile = false,
  pixelRatio = 1.5,
}) {
  const detailedBudget = isMobile ? 56 : 140
  const baseRadius = isMobile ? 2.3 : 2.7
  const ringGap = isMobile ? 0.95 : 1.1
  const arcSpacing = isMobile ? 0.7 : 0.58

  const layoutKey = useMemo(
    () => rawMembers.map((m) => m.id).join(','),
    [rawMembers],
  )

  const ringLayout = useMemo(() => {
    const stubs = rawMembers.map((m) => ({ id: m.id }))
    assignOrbitalRings(stubs, { baseRadius, ringGap, arcSpacing })
    return new Map(stubs.map((m) => [m.id, {
      _base: m._base,
      _ring: m._ring,
      _radius: m._radius,
      _angle: m._angle,
    }]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey, baseRadius, ringGap, arcSpacing])

  const members = useMemo(
    () => rawMembers.map((m) => ({ ...m, ...(ringLayout.get(m.id) || {}) })),
    [rawMembers, ringLayout],
  )

  const [frameloop, setFrameloop] = useState(active ? 'always' : 'never')
  useEffect(() => { setFrameloop(active ? 'always' : 'never') }, [active])

  const handleMiss = useCallback(() => { onHover?.(null) }, [onHover])

  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, Math.min(2, pixelRatio)]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 7.5, 11], fov: isMobile ? 52 : 42, near: 0.1, far: 80 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onPointerMissed={handleMiss}
    >
      <Scene
        members={members}
        collapsed={collapsed}
        selectedId={selectedId}
        hoveredId={hoveredId}
        focusId={focusId}
        onHover={onHover}
        onSelect={onSelect}
        onHubClick={onHubClick}
        detailedBudget={detailedBudget}
      />
    </Canvas>
  )
}
