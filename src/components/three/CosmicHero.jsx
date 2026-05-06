import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Floating Nebula Dust ─────────────────────────────────────────────────────
function NebulaDust({ count = 700, scrollY }) {
  const ref = useRef()
  const velRef = useRef(new Float32Array(count))

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const palette = [
      new THREE.Color('#C9A96E'),
      new THREE.Color('#EDE8DC'),
      new THREE.Color('#a855f7'),
      new THREE.Color('#00d4ff'),
      new THREE.Color('#1A1915'),
    ]
    for (let i = 0; i < count; i++) {
      // Spawn in an outer shell (radius 5–16) — never in the center where the title is
      const r = Math.random() * 11 + 5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
      sizes[i] = Math.random() * 0.06 + 0.01
      velRef.current[i] = (Math.random() - 0.5) * 0.002
    }
    return { positions, colors, sizes }
  }, [count])

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const scroll = scrollY.current / window.innerHeight
    ref.current.rotation.y = t * 0.04 + scroll * 0.5
    ref.current.rotation.x = Math.sin(t * 0.02) * 0.15
    ref.current.rotation.z = t * 0.01
    // Drift: offset each particle up slightly over time
    const pos = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += velRef.current[i]
      if (pos[i * 3 + 1] > 12) pos[i * 3 + 1] = -12
      if (pos[i * 3 + 1] < -12) pos[i * 3 + 1] = 12
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ─── DNA Helix Connection Strands ─────────────────────────────────────────────
function DNAHelix({ scrollY }) {
  const groupRef = useRef()
  const strand1Ref = useRef()
  const strand2Ref = useRef()
  const nodeRefs = useRef([])

  const { points1, points2, nodePositions } = useMemo(() => {
    const count = 60
    const p1 = [], p2 = [], nodes = []
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 8
      const y = (i / count) * 18 - 9
      p1.push(new THREE.Vector3(Math.cos(t) * 1.2, y, Math.sin(t) * 1.2))
      p2.push(new THREE.Vector3(Math.cos(t + Math.PI) * 1.2, y, Math.sin(t + Math.PI) * 1.2))
      if (i % 6 === 0) nodes.push({ p1: p1[i], p2: p2[i] })
    }
    return { points1: p1, points2: p2, nodePositions: nodes }
  }, [])

  const curve1 = useMemo(() => new THREE.CatmullRomCurve3(points1), [points1])
  const curve2 = useMemo(() => new THREE.CatmullRomCurve3(points2), [points2])
  const tube1 = useMemo(() => new THREE.TubeGeometry(curve1, 120, 0.018, 8, false), [curve1])
  const tube2 = useMemo(() => new THREE.TubeGeometry(curve2, 120, 0.018, 8, false), [curve2])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const scroll = scrollY.current / window.innerHeight
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15
      groupRef.current.position.y = -scroll * 3
    }
    // Pulse intensity
    const intensity = 0.7 + Math.sin(t * 1.5) * 0.4
    if (strand1Ref.current?.material) strand1Ref.current.material.emissiveIntensity = intensity
    if (strand2Ref.current?.material) strand2Ref.current.material.emissiveIntensity = intensity * 0.8
    // Pulse nodes
    nodeRefs.current.forEach((n, i) => {
      if (n) n.scale.setScalar(0.8 + Math.sin(t * 2 + i * 0.5) * 0.3)
    })
  })

  return (
    <group ref={groupRef} position={[3.5, 0, -2]}>
      <mesh ref={strand1Ref} geometry={tube1}>
        <meshStandardMaterial color="#C9A96E" emissive="#C9A96E" emissiveIntensity={1.2} metalness={0.9} roughness={0.1} transparent opacity={0.85} />
      </mesh>
      <mesh ref={strand2Ref} geometry={tube2}>
        <meshStandardMaterial color="#EDE8DC" emissive="#a855f7" emissiveIntensity={0.9} metalness={0.8} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      {nodePositions.map(({ p1, p2 }, i) => {
        const mid = new THREE.Vector3().lerpVectors(p1, p2, 0.5)
        return (
          <group key={i}>
            <mesh ref={el => nodeRefs.current[i] = el} position={[mid.x, mid.y, mid.z]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={3} />
            </mesh>
            {/* Bridge rung */}
            <mesh position={[mid.x, mid.y, mid.z]}>
              <cylinderGeometry args={[0.004, 0.004, p1.distanceTo(p2), 4]} />
              <meshStandardMaterial color="#EDE8DC" emissive="#EDE8DC" emissiveIntensity={0.5} transparent opacity={0.4} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ─── Central Holographic Orb ──────────────────────────────────────────────────
function HoloOrb({ scrollY }) {
  const outerRef = useRef()
  const innerRef = useRef()
  const ring1Ref = useRef()
  const ring2Ref = useRef()
  const ring3Ref = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const scroll = scrollY.current / window.innerHeight

    if (outerRef.current) {
      outerRef.current.rotation.y = t * 0.2
      outerRef.current.rotation.x = Math.sin(t * 0.3) * 0.15
      const s = 1 + Math.sin(t * 1.2) * 0.04
      outerRef.current.scale.setScalar(s)
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.35
      innerRef.current.rotation.z = t * 0.1
      innerRef.current.material.emissiveIntensity = 1.5 + Math.sin(t * 2) * 0.5
    }
    if (ring1Ref.current) ring1Ref.current.rotation.x = t * 0.3
    if (ring2Ref.current) { ring2Ref.current.rotation.y = t * 0.25; ring2Ref.current.rotation.z = t * 0.1 }
    if (ring3Ref.current) ring3Ref.current.rotation.z = -t * 0.2
  })

  return (
    <group position={[-2, 0, 0]}>
      {/* Outer shell */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[1.6, 64, 64]} />
        <meshStandardMaterial
          color="#0B0A08"
          emissive="#C9A96E"
          emissiveIntensity={0.08}
          metalness={1}
          roughness={0.05}
          transparent
          opacity={0.15}
          wireframe={false}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh>
        <sphereGeometry args={[1.62, 24, 24]} />
        <meshBasicMaterial color="#C9A96E" wireframe transparent opacity={0.05} />
      </mesh>
      {/* Inner glowing core */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#EDE8DC" emissive="#C9A96E" emissiveIntensity={2} transparent opacity={0.9} />
      </mesh>
      {/* Inner gold core small */}
      <mesh>
        <sphereGeometry args={[0.25, 20, 20]} />
        <meshStandardMaterial color="#C9A96E" emissive="#C9A96E" emissiveIntensity={5} />
      </mesh>
      {/* Orbital rings */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.4, 0.012, 8, 120]} />
        <meshStandardMaterial color="#C9A96E" emissive="#C9A96E" emissiveIntensity={1.5} transparent opacity={0.7} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.1, 0.008, 8, 100]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1.2} transparent opacity={0.6} />
      </mesh>
      <mesh ref={ring3Ref}>
        <torusGeometry args={[0.85, 0.006, 8, 80]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={1.0} transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

// ─── Floating Venn Geometry ───────────────────────────────────────────────────
function VennGeometry({ scrollY }) {
  const groupRef = useRef()
  const c1Ref = useRef()
  const c2Ref = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const scroll = scrollY.current / window.innerHeight
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.06 + scroll * 0.3
      groupRef.current.rotation.x = Math.sin(t * 0.08) * 0.1
      groupRef.current.position.z = -6 + scroll * 2
    }
    if (c1Ref.current?.material) c1Ref.current.material.opacity = 0.08 + Math.sin(t * 0.8) * 0.03
    if (c2Ref.current?.material) c2Ref.current.material.opacity = 0.06 + Math.sin(t * 0.9 + 1) * 0.03
  })

  return (
    <group ref={groupRef} position={[0, 0, -8]}>
      {/* Venn left ring */}
      <mesh ref={c1Ref} position={[-1.8, 0, 0]}>
        <torusGeometry args={[3.5, 0.04, 8, 120]} />
        <meshStandardMaterial color="#EDE8DC" emissive="#EDE8DC" emissiveIntensity={0.3} transparent opacity={0.08} />
      </mesh>
      {/* Venn right ring */}
      <mesh ref={c2Ref} position={[1.8, 0, 0]}>
        <torusGeometry args={[3.5, 0.04, 8, 120]} />
        <meshStandardMaterial color="#C9A96E" emissive="#C9A96E" emissiveIntensity={0.3} transparent opacity={0.06} />
      </mesh>
    </group>
  )
}

// ─── Floating Mini Nodes (data points) ───────────────────────────────────────
function DataNodes({ count = 12, scrollY }) {
  const groupRef = useRef()
  const nodeData = useMemo(() => {
    const colors = ['#C9A96E', '#EDE8DC', '#a855f7', '#00d4ff', '#e879f9']
    return Array.from({ length: count }, (_, i) => {
      // Keep nodes off-center: bias X and Y to outer area, away from the title zone
      const side = i % 2 === 0 ? 1 : -1
      const x = side * (Math.random() * 5 + 4)       // X: ±4 to ±9
      const y = (Math.random() - 0.5) * 10            // Y: spread vertically but wide
      const z = (Math.random() - 0.5) * 6 - 3        // Z: slightly behind camera
      return {
        pos: [x, y, z],
        color: colors[i % colors.length],
        speed: Math.random() * 0.8 + 0.3,
        phase: Math.random() * Math.PI * 2,
        size: Math.random() * 0.06 + 0.04,
      }
    })
  }, [count])


  const nodeRefs = useRef([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    nodeRefs.current.forEach((ref, i) => {
      if (!ref) return
      const d = nodeData[i]
      ref.position.y = nodeData[i].pos[1] + Math.sin(t * d.speed + d.phase) * 0.6
      ref.scale.setScalar(0.8 + Math.sin(t * d.speed * 1.5 + d.phase) * 0.25)
    })
  })

  return (
    <group ref={groupRef}>
      {nodeData.map((d, i) => (
        <group key={i} position={d.pos}>
          <mesh ref={el => nodeRefs.current[i] = el}>
            <sphereGeometry args={[d.size, 8, 8]} />
            <meshStandardMaterial color={d.color} emissive={d.color} emissiveIntensity={2.5} transparent opacity={0.85} />
          </mesh>
          {/* Glow halo */}
          <mesh>
            <sphereGeometry args={[d.size * 2.5, 8, 8]} />
            <meshStandardMaterial color={d.color} emissive={d.color} emissiveIntensity={0.3} transparent opacity={0.08} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── Camera Scroll Rig ────────────────────────────────────────────────────────
function ScrollCamera({ scrollY }) {
  const { camera } = useThree()

  useFrame(() => {
    const scroll = scrollY.current / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    // Camera drifts back and tilts down as user scrolls
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 7 - scroll * 4, 0.04)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, -scroll * 2.5, 0.04)
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, scroll * 0.18, 0.04)
  })

  return null
}

// ─── Scene Lights ─────────────────────────────────────────────────────────────
function SceneLights() {
  const goldLightRef = useRef()
  const cyanLightRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (goldLightRef.current) {
      goldLightRef.current.position.x = Math.sin(t * 0.4) * 5
      goldLightRef.current.position.y = Math.cos(t * 0.3) * 3 + 2
      goldLightRef.current.intensity = 1.5 + Math.sin(t * 0.6) * 0.5
    }
    if (cyanLightRef.current) {
      cyanLightRef.current.position.x = Math.cos(t * 0.35) * 4
      cyanLightRef.current.position.z = Math.sin(t * 0.25) * 3 - 1
      cyanLightRef.current.intensity = 1.2 + Math.cos(t * 0.7) * 0.4
    }
  })

  return (
    <>
      <ambientLight intensity={0.15} color="#EDE8DC" />
      <pointLight ref={goldLightRef} color="#C9A96E" intensity={2} distance={18} decay={2} />
      <pointLight ref={cyanLightRef} color="#00d4ff" intensity={1.5} distance={15} decay={2} />
      <pointLight position={[0, 0, 5]} color="#a855f7" intensity={0.8} distance={12} decay={2} />
      <pointLight position={[0, -6, 2]} color="#EDE8DC" intensity={0.5} distance={10} decay={2} />
    </>
  )
}

// ─── The Full 3D Scene ────────────────────────────────────────────────────────
function HeroScene({ scrollY }) {
  return (
    <>
      <SceneLights />
      <ScrollCamera scrollY={scrollY} />
      <HoloOrb scrollY={scrollY} />
      <DNAHelix scrollY={scrollY} />
      <VennGeometry scrollY={scrollY} />
    </>
  )
}

// ─── Exported Canvas wrapper ──────────────────────────────────────────────────
export function CosmicHeroCanvas({ scrollY }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 55, near: 0.1, far: 200 }}
      gl={{
        antialias: false,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
        powerPreference: 'high-performance',
      }}
      style={{ background: 'transparent' }}
      dpr={[0.8, 1]}
    >
      <HeroScene scrollY={scrollY} />
    </Canvas>
  )
}
