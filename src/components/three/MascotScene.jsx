import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { canUseWebGL } from '../../lib/webgl'

function MascotPlate({ src, hover }) {
  const group = useRef()
  const texture = useLoader(THREE.TextureLoader, src)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter

  useFrame((state) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const targetY = hover ? 0.22 : Math.sin(t * 0.9) * 0.08
    const targetX = hover ? -0.12 : Math.sin(t * 0.45) * 0.06
    g.rotation.y += (targetY - g.rotation.y) * 0.08
    g.rotation.x += (targetX - g.rotation.x) * 0.08
  })

  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[1.7, 1.7]} />
        <meshPhysicalMaterial
          map={texture}
          transparent
          alphaTest={0.08}
          roughness={0.42}
          metalness={0.08}
          clearcoat={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export function MascotScene({ src, alt, hover = false, className = '' }) {
  if (!canUseWebGL()) {
    return (
      <img src={src} alt={alt} className={`${className} object-contain`.trim()} />
    )
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 2.35], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.7} color="#EDE8DC" />
        <directionalLight position={[2.4, 2.2, 4]} intensity={1.35} color="#fff6e0" />
        <pointLight position={[-2, -1, 2]} intensity={8} distance={8} color="#C9A96E" />
        <Suspense fallback={null}>
          <MascotPlate src={src} hover={hover} />
        </Suspense>
      </Canvas>
    </div>
  )
}
