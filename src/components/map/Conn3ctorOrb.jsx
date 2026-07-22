import { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Float, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { AvatarNode } from './AvatarNode'
import { assignSphereShells, hash01 } from '../../lib/sphereLayout'

const GOLD = '#C9A96E'
const CREAM = '#EDE8DC'

function Hub({ onClick, collapsed }) {
  const tex = useTexture('/map-logo.png')
  tex.colorSpace = THREE.SRGBColorSpace
  const ringRef = useRef()
  const glowRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.35
      ringRef.current.scale.setScalar(collapsed ? 0.85 + Math.sin(t * 2) * 0.04 : 1 + Math.sin(t * 1.2) * 0.03)
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = collapsed ? 0.35 + Math.sin(t * 3) * 0.1 : 0.22 + Math.sin(t * 1.5) * 0.06
    }
  })

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
      <group
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      >
        {/* Soft glow disc */}
        <mesh ref={glowRef} position={[0, 0, -0.05]}>
          <circleGeometry args={[1.35, 48]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.22} depthWrite={false} />
        </mesh>

        {/* Logo */}
        <mesh>
          <circleGeometry args={[0.85, 48]} />
          <meshStandardMaterial
            map={tex}
            emissive={GOLD}
            emissiveIntensity={0.35}
            roughness={0.4}
            metalness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Orbiting gold ring */}
        <mesh ref={ringRef} rotation={[Math.PI / 2.4, 0.2, 0]}>
          <torusGeometry args={[1.15, 0.018, 12, 64]} />
          <meshStandardMaterial
            color={GOLD}
            emissive={GOLD}
            emissiveIntensity={1.2}
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>

        {/* Outer thin ring */}
        <mesh rotation={[Math.PI / 2.1, -0.15, 0.4]}>
          <torusGeometry args={[1.45, 0.008, 8, 80]} />
          <meshBasicMaterial color={CREAM} transparent opacity={0.35} />
        </mesh>
      </group>
    </Float>
  )
}

function SpokeBeams({ members, hoveredId, selectedId, collapsed }) {
  const lineRef = useRef()

  const beamMembers = useMemo(() => {
    const hot = members.filter(m => m.id === hoveredId || m.id === selectedId)
    const sample = members.filter((_, idx) => idx % 7 === 0).slice(0, 40)
    const map = new Map()
    ;[...hot, ...sample].forEach(m => map.set(m.id, m))
    return [...map.values()]
  }, [members, hoveredId, selectedId])

  const geo = useMemo(() => {
    const positions = new Float32Array(beamMembers.length * 6)
    const colors = new Float32Array(beamMembers.length * 6)
    const gold = new THREE.Color(GOLD)
    const dim = new THREE.Color('#3a3020')
    beamMembers.forEach((m, i) => {
      const b = m._base || { x: 0, y: 0, z: 0 }
      const hot = m.id === hoveredId || m.id === selectedId
      const c = hot ? gold : dim
      positions[i * 6 + 0] = 0
      positions[i * 6 + 1] = 0
      positions[i * 6 + 2] = 0
      positions[i * 6 + 3] = b.x
      positions[i * 6 + 4] = b.y
      positions[i * 6 + 5] = b.z
      colors[i * 6 + 0] = gold.r
      colors[i * 6 + 1] = gold.g
      colors[i * 6 + 2] = gold.b
      colors[i * 6 + 3] = c.r
      colors[i * 6 + 4] = c.g
      colors[i * 6 + 5] = c.b
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
    const collapse = collapsed ? 0.18 : 1
    beamMembers.forEach((m, i) => {
      const b = m._base || { x: 0, y: 0, z: 0 }
      attr.setXYZ(i * 2, 0, 0, 0)
      attr.setXYZ(i * 2 + 1, b.x * collapse, b.y * collapse, b.z * collapse)
    })
    attr.needsUpdate = true
  })

  return (
    <lineSegments ref={lineRef} geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  )
}

function ShellField({
  members,
  collapsed,
  selectedId,
  hoveredId,
  detailedBudget,
  onHover,
  onSelect,
}) {
  const groupRef = useRef()

  // Jelly spring state
  const jellyVel = useRef({ sx: 0, sy: 0, sz: 0 })   // spring velocity per axis
  const jellyPos = useRef({ sx: 1, sy: 1, sz: 1 })   // current scale
  const prevRotY = useRef(0)
  const angularVel = useRef(0)

  // Arkham-style jelly physics on the whole orb
  // squash along Y when spinning fast, stretch on X/Z; elastic spring decay
  const STIFFNESS = 140
  const DAMPING   = 10
  const REST      = 1

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const g = groupRef.current
    const t = state.clock.elapsedTime

    if (!collapsed) {
      g.rotation.y += delta * 0.08
      g.rotation.x = Math.sin(t * 0.15) * 0.08
    }

    // Measure angular velocity
    const dRotY = g.rotation.y - prevRotY.current
    prevRotY.current = g.rotation.y
    // Low-pass smooth the angular velocity
    angularVel.current += (Math.abs(dRotY / delta) - angularVel.current) * 0.18

    // Jelly targets: fast spin → squash Y, bulge X/Z; slow → all REST
    const spin = Math.min(angularVel.current / 0.15, 1.0)   // normalise 0..1
    const targetX = REST + spin * 0.12
    const targetY = REST - spin * 0.10
    const targetZ = REST + spin * 0.06

    // Spring-damper integration (semi-implicit Euler)
    const dt = Math.min(delta, 0.05)
    const jp = jellyPos.current
    const jv = jellyVel.current

    jv.sx += (-(jp.sx - targetX) * STIFFNESS - jv.sx * DAMPING) * dt
    jv.sy += (-(jp.sy - targetY) * STIFFNESS - jv.sy * DAMPING) * dt
    jv.sz += (-(jp.sz - targetZ) * STIFFNESS - jv.sz * DAMPING) * dt

    jp.sx += jv.sx * dt
    jp.sy += jv.sy * dt
    jp.sz += jv.sz * dt

    // Subtle lateral breath sway on top of jelly
    const swayX = Math.sin(t * 0.42 + 1.1) * 0.012
    const swayZ = Math.cos(t * 0.37 + 0.7) * 0.008

    g.scale.set(
      jp.sx + swayX,
      jp.sy,
      jp.sz + swayZ,
    )
  })

  // Prefer selected/hovered + deterministic sample for textured nodes
  const detailedIds = useMemo(() => {
    const set = new Set()
    if (selectedId) set.add(selectedId)
    if (hoveredId) set.add(hoveredId)
    const ranked = [...members].sort((a, b) => hash01(a.id) - hash01(b.id))
    for (const m of ranked) {
      if (set.size >= detailedBudget) break
      set.add(m.id)
    }
    return set
  }, [members, detailedBudget, selectedId, hoveredId])

  return (
    <group ref={groupRef}>
      <SpokeBeams
        members={members}
        hoveredId={hoveredId}
        selectedId={selectedId}
        collapsed={collapsed}
      />
      {members.map((m) => (
        <AvatarNode
          key={m.id}
          member={m}
          detailed={detailedIds.has(m.id)}
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
  const targetRef = useRef(new THREE.Vector3())
  const goalCam = useRef(new THREE.Vector3(0, 1.2, 11))

  useEffect(() => {
    if (!focusId) return
    const m = members.find((x) => x.id === focusId)
    if (!m?._base) return
    const b = m._base
    targetRef.current.set(b.x * 0.35, b.y * 0.35, b.z * 0.35)
    const dir = new THREE.Vector3(b.x, b.y, b.z).normalize()
    goalCam.current.copy(dir.multiplyScalar(6.5).add(new THREE.Vector3(0, 0.4, 0)))
  }, [focusId, members])

  useFrame(() => {
    if (!focusId) return
    camera.position.lerp(goalCam.current, 0.06)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetRef.current, 0.06)
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
      <fog attach="fog" args={['#07070b', 14, 32]} />
      <ambientLight intensity={0.35} color="#EDE8DC" />
      <pointLight position={[0, 0, 0]} intensity={2.2} color={GOLD} distance={18} />
      <pointLight position={[6, 4, 8]} intensity={0.8} color={CREAM} distance={24} />
      <pointLight position={[-5, -3, -6]} intensity={0.45} color="#8B7355" distance={20} />

      <Stars radius={60} depth={40} count={1200} factor={3} saturation={0} fade speed={0.4} />

      <Suspense fallback={null}>
        <Hub onClick={onHubClick} collapsed={collapsed} />
      </Suspense>

      <ShellField
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
        minDistance={4.5}
        maxDistance={18}
        enableDamping
        dampingFactor={0.08}
        autoRotate={false}
        rotateSpeed={0.55}
      />
    </>
  )
}

/**
 * Full-viewport 3D Conn3ctor orbital map.
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
  const shellCount = isMobile ? 3 : 4
  const detailedBudget = isMobile ? 48 : 110
  const baseRadius = isMobile ? 2.8 : 3.2
  const shellGap = isMobile ? 1.15 : 1.35

  const layoutKey = useMemo(
    () => rawMembers.map((m) => m.id).join(','),
    [rawMembers],
  )

  const shellLayout = useMemo(() => {
    const stubs = rawMembers.map((m) => ({ id: m.id }))
    assignSphereShells(stubs, { shellCount, baseRadius, shellGap })
    return new Map(stubs.map((m) => [m.id, { _base: m._base, _shell: m._shell, _radius: m._radius }]))
    // Membership-only: ignore avatar/name churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey, shellCount, baseRadius, shellGap])

  const members = useMemo(
    () => rawMembers.map((m) => ({ ...m, ...(shellLayout.get(m.id) || {}) })),
    [rawMembers, shellLayout],
  )

  const [frameloop, setFrameloop] = useState(active ? 'always' : 'never')

  useEffect(() => {
    setFrameloop(active ? 'always' : 'never')
  }, [active])

  const handleMiss = useCallback(() => {
    onHover?.(null)
  }, [onHover])

  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, Math.min(2, pixelRatio)]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1.2, 11], fov: isMobile ? 58 : 48, near: 0.1, far: 80 }}
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
