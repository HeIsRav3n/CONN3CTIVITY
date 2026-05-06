import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function LightBeam({ start, end, color, speed = 1, delay = 0 }) {
  const ref = useRef()
  const progressRef = useRef(delay)

  const curve = useMemo(() => {
    const midX = (start[0] + end[0]) / 2 + (Math.random() - 0.5) * 2
    const midY = (start[1] + end[1]) / 2 + Math.random() * 1
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(midX, midY, 0),
      new THREE.Vector3(...end),
    )
  }, [start, end])

  const points = useMemo(() => curve.getPoints(40), [curve])

  useFrame((state, delta) => {
    if (!ref.current) return
    progressRef.current = (progressRef.current + delta * speed * 0.4) % 1.5
    const p = Math.min(progressRef.current, 1)
    const visible = Math.floor(p * points.length)
    const geo = new THREE.BufferGeometry().setFromPoints(points.slice(0, visible))
    ref.current.geometry.dispose()
    ref.current.geometry = geo
  })

  return (
    <line ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color={color} transparent opacity={0.8} linewidth={2} />
    </line>
  )
}

function ConnectionNode({ position, color }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    ref.current.scale.setScalar(0.7 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.3)
  })

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  )
}

export function ConnectionNetwork({ visible = false }) {
  const nodes = useMemo(() => [
    { pos: [-3, 1, 0], color: '#00d4ff' },
    { pos: [0, 2, 0], color: '#a855f7' },
    { pos: [3, 0.5, 0], color: '#e879f9' },
    { pos: [-2, -1, 0], color: '#0047ff' },
    { pos: [2, -1.5, 0], color: '#fbbf24' },
    { pos: [0, -0.5, 0], color: '#22c55e' },
  ], [])

  const connections = useMemo(() => [
    { from: 0, to: 1, color: '#00d4ff', speed: 0.8, delay: 0 },
    { from: 1, to: 2, color: '#a855f7', speed: 1.0, delay: 0.3 },
    { from: 0, to: 3, color: '#0047ff', speed: 0.7, delay: 0.6 },
    { from: 2, to: 4, color: '#e879f9', speed: 1.2, delay: 0.1 },
    { from: 3, to: 5, color: '#22c55e', speed: 0.9, delay: 0.9 },
    { from: 5, to: 2, color: '#fbbf24', speed: 0.6, delay: 0.4 },
    { from: 1, to: 5, color: '#7c3aed', speed: 1.1, delay: 0.7 },
    { from: 4, to: 5, color: '#fbbf24', speed: 0.85, delay: 1.2 },
  ], [])

  if (!visible) return null

  return (
    <group>
      {connections.map((conn, i) => (
        <LightBeam
          key={i}
          start={nodes[conn.from].pos}
          end={nodes[conn.to].pos}
          color={conn.color}
          speed={conn.speed}
          delay={conn.delay}
        />
      ))}
      {nodes.map((node, i) => (
        <ConnectionNode key={i} position={node.pos} color={node.color} />
      ))}
    </group>
  )
}
