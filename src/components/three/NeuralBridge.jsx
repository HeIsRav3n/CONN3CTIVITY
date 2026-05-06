import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function NeuralBridge({ scrollProgress = 0 }) {
  const lineRef = useRef()
  const glowRef = useRef()
  const nodeRefs = useRef([])

  const nodeCount = 12
  const curvePoints = useMemo(() => {
    const points = []
    for (let i = 0; i < nodeCount; i++) {
      const t = i / (nodeCount - 1)
      const x = Math.sin(t * Math.PI * 2.5) * 1.5
      const y = -t * 30 + 5
      const z = Math.cos(t * Math.PI * 1.5) * 0.8
      points.push(new THREE.Vector3(x, y, z))
    }
    return points
  }, [])

  const curve = useMemo(() => new THREE.CatmullRomCurve3(curvePoints), [curvePoints])
  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 100, 0.015, 8, false), [curve])

  const nodePositions = useMemo(() => curve.getSpacedPoints(nodeCount - 1), [curve])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (lineRef.current && lineRef.current.material) {
      lineRef.current.material.emissiveIntensity = 0.5 + Math.sin(t * 2) * 0.3
    }
    nodeRefs.current.forEach((ref, i) => {
      if (ref) {
        ref.scale.setScalar(0.8 + Math.sin(t * 2 + i * 0.8) * 0.3)
      }
    })
  })

  return (
    <group>
      <mesh ref={lineRef} geometry={tubeGeometry}>
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#0047ff"
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0}
          transparent
          opacity={0.6}
        />
      </mesh>

      {nodePositions.map((pos, i) => (
        <mesh
          key={i}
          ref={el => nodeRefs.current[i] = el}
          position={[pos.x, pos.y, pos.z]}
        >
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color="#00d4ff"
            emissive="#00d4ff"
            emissiveIntensity={2}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  )
}
