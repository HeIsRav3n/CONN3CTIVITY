import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Swirling Cyan Network for Partnerships ────────────────────────────────
function NetworkWeb({ count = 35 }) {
  const groupRef = useRef()

  const { positions, nodeColors } = useMemo(() => {
    const positions = []
    const nodeColors = []
    const palette = ['#C9A96E', '#EDE8DC', '#E2DBD0', '#C8C2B6', '#F5F2EC']
    for (let i = 0; i < count; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 6 - 3,
        vx: (Math.random() - 0.5) * 0.008,
        vy: (Math.random() - 0.5) * 0.005,
      })
      nodeColors.push(palette[i % palette.length])
    }
    return { positions, nodeColors }
  }, [count])

  const meshRefs = useRef([])
  const lineRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.03
      groupRef.current.rotation.z = Math.sin(t * 0.05) * 0.05
    }

    // Drift nodes
    positions.forEach((p, i) => {
      p.x += p.vx + Math.sin(t * 0.3 + i) * 0.002
      p.y += p.vy + Math.cos(t * 0.25 + i * 0.5) * 0.002
      if (Math.abs(p.x) > 10) p.vx *= -1
      if (Math.abs(p.y) > 5) p.vy *= -1
      if (meshRefs.current[i]) {
        meshRefs.current[i].position.set(p.x, p.y, p.z)
        meshRefs.current[i].scale.setScalar(0.9 + Math.sin(t * 1.5 + i) * 0.2)
      }
    })

    // Rebuild connection lines between nearby nodes
    if (lineRef.current) {
      const pts = []
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = positions[i].x - positions[j].x
          const dy = positions[i].y - positions[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 4) {
            pts.push(new THREE.Vector3(positions[i].x, positions[i].y, positions[i].z))
            pts.push(new THREE.Vector3(positions[j].x, positions[j].y, positions[j].z))
          }
        }
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      lineRef.current.geometry.dispose()
      lineRef.current.geometry = geo
    }
  })

  return (
    <group ref={groupRef}>
      {/* Nodes */}
      {positions.map((p, i) => (
        <mesh key={i} ref={el => meshRefs.current[i] = el} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial
            color={nodeColors[i]}
            emissive={nodeColors[i]}
            emissiveIntensity={2}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      {/* Lines */}
      <lineSegments ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#C9A96E" transparent opacity={0.12} />
      </lineSegments>
    </group>
  )
}

export function PartnershipsBackground() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      dpr={[0.8, 1]}
    >
      <ambientLight intensity={0.2} color="#EDE8DC" />
      <pointLight position={[3, 2, 4]} color="#C9A96E" intensity={1.5} distance={20} />
      <pointLight position={[-4, -2, 3]} color="#EDE8DC" intensity={1} distance={15} />
      <NetworkWeb count={35} />
    </Canvas>
  )
}

// ─── Purple Galaxy for Team Section ───────────────────────────────────────────
function PurpleGalaxy({ count = 500 }) {
  const ref = useRef()

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const palette = [
      new THREE.Color('#C9A96E'),
      new THREE.Color('#e879f9'),
      new THREE.Color('#7c3aed'),
      new THREE.Color('#EDE8DC'),
      new THREE.Color('#C9A96E'),
    ]
    for (let i = 0; i < count; i++) {
      // Spiral galaxy distribution
      const arm = i % 3
      const t = (i / count) * Math.PI * 8
      const radius = (i / count) * 14 + 1
      const spread = (Math.random() - 0.5) * 2
      positions[i * 3] = Math.cos(t + (arm * Math.PI * 2) / 3) * radius + spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4
      positions[i * 3 + 2] = Math.sin(t + (arm * Math.PI * 2) / 3) * radius + spread - 6
      const c = palette[i % palette.length]
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    return { positions, colors }
  }, [count])

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * 0.05
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.03) * 0.05
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export function TeamBackground() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 65 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      dpr={[0.8, 1]}
    >
      <ambientLight intensity={0.1} color="#C9A96E" />
      <pointLight position={[0, 3, 4]} color="#C9A96E" intensity={1.2} distance={18} />
      <PurpleGalaxy count={500} />
    </Canvas>
  )
}

// GoalsBackground (GoldDrift embers) removed — it was never rendered by any section.
