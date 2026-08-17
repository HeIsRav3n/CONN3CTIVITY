import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { canUseWebGL } from '../../lib/webgl'

const GOLD = '#C9A96E'
const CREAM = '#EDE8DC'

function FacetedTetrahedron({ spinning = true }) {
  const meshRef = useRef()
  const geometry = useMemo(() => new THREE.TetrahedronGeometry(1.18, 0), [])

  useFrame((state, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    if (spinning) mesh.rotation.y += delta * 0.28
    const t = state.clock.elapsedTime
    mesh.rotation.x = 0.52 + Math.sin(t * 0.35) * 0.08
    mesh.rotation.z = 0.18 + Math.cos(t * 0.22) * 0.05
  })

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <meshPhysicalMaterial
        color={GOLD}
        metalness={1}
        roughness={0.16}
        reflectivity={1}
        clearcoat={0.7}
        clearcoatRoughness={0.08}
        envMapIntensity={1.35}
        ior={1.7}
        flatShading
        toneMapped
      />
    </mesh>
  )
}

function PrismLights() {
  return (
    <>
      <ambientLight intensity={0.22} color={CREAM} />
      <directionalLight position={[3.2, 4.4, 5]} intensity={2.4} color="#fff6e0" />
      <directionalLight position={[-4, -1.5, 2]} intensity={0.55} color={CREAM} />
      <pointLight position={[0, 1.6, 3.2]} intensity={18} distance={10} color={GOLD} />
    </>
  )
}

export function GoldPrism({ className = '', spinning = true }) {
  if (!canUseWebGL()) {
    return (
      <div className={className} aria-hidden="true">
        <img src="/prism-gold.png" alt="" className="h-full w-full object-contain" />
      </div>
    )
  }

  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.15, 3.15], fov: 32 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
        }}
        dpr={[1, 2]}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <PrismLights />
          <FacetedTetrahedron spinning={spinning} />
        </Suspense>
      </Canvas>
    </div>
  )
}
