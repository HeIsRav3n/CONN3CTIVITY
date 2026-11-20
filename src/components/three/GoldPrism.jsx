import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { canUseWebGL } from '../../lib/webgl'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const GOLD = '#C9A96E'
const CREAM = '#EDE8DC'

// One distinct gold tone per face, so adjacent faces never read as one
// flat gradient: pale gold, brand gold, mid gold, dark bronze. The
// tetrahedron is non-indexed (4 faces x 3 vertices), so vertex i belongs
// to face floor(i / 3).
const FACE_TONES = ['#F6DFA8', '#C9A96E', '#8A6D3B', '#E3B96A']

function FacetedTetrahedron({ spinning = true }) {
  const meshRef = useRef()
  const geometry = useMemo(() => new THREE.TetrahedronGeometry(1.18, 0), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 1), [geometry])

  // Per-face vertex colours: the single material colour would wash the
  // faces together under the environment map, which is why the prism read
  // as one flat triangle. Distinct tones per face restore the facets.
  const faceColors = useMemo(() => {
    const count = geometry.attributes.position.count
    const colors = new Float32Array(count * 3)
    const tone = new THREE.Color()
    for (let i = 0; i < count; i++) {
      tone.set(FACE_TONES[Math.floor(i / 3) % FACE_TONES.length])
      colors[i * 3] = tone.r
      colors[i * 3 + 1] = tone.g
      colors[i * 3 + 2] = tone.b
    }
    return new THREE.BufferAttribute(colors, 3)
  }, [geometry])

  useEffect(() => {
    geometry.setAttribute('color', faceColors)
    return () => {
      geometry.dispose()
      edges.dispose()
    }
  }, [geometry, edges, faceColors])

  useFrame((state, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    if (spinning) {
      // ~0.85 rad/s: a full turn in ~7s, so the facets are obvious within
      // a few seconds of looking. The old 0.28 rad/s took ~22s per turn,
      // which is why it read as a static flat triangle.
      mesh.rotation.y += delta * 0.85
      const t = state.clock.elapsedTime
      mesh.rotation.x = 0.52 + Math.sin(t * 0.6) * 0.12
      mesh.rotation.z = 0.18 + Math.cos(t * 0.45) * 0.08
      // frameloop="demand" only renders on invalidate, so keep the loop
      // alive while the prism is spinning. When it stops spinning the
      // canvas settles after a single frame.
      state.invalidate()
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <meshPhysicalMaterial
        color="#ffffff"
        vertexColors
        metalness={0.85}
        roughness={0.22}
        reflectivity={1}
        clearcoat={0.7}
        clearcoatRoughness={0.08}
        envMapIntensity={0.9}
        ior={1.7}
        flatShading
        toneMapped
      />
      {/* Visible facet edges: a cream line along every tetrahedron edge,
          so the facets read even where two faces catch similar light. */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#FDF6E3" transparent opacity={0.85} toneMapped={false} />
      </lineSegments>
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

// Real metallic reflections without adding @react-three/drei: three ships
// RoomEnvironment, and PMREM turns it into an environment map the
// physical material can reflect. Built once per mount, disposed on unmount.
function PrismEnvironment() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTexture
    return () => {
      scene.environment = null
      envTexture.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  return null
}

function PrismFallback({ className = '' }) {
  return (
    <div className={className} aria-hidden="true">
      <img src="/prism-gold.png" alt="" className="h-full w-full object-contain" />
    </div>
  )
}

class PrismErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

export function GoldPrism({ className = '', spinning = true }) {
  const reducedMotion = usePrefersReducedMotion()
  const shouldSpin = spinning && !reducedMotion

  if (!canUseWebGL()) {
    return <PrismFallback className={className} />
  }

  return (
    <div className={className} aria-hidden="true">
      <PrismErrorBoundary fallback={<PrismFallback className="h-full w-full" />}>
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
          frameloop="demand"
          style={{ background: 'transparent', width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            <PrismEnvironment />
            <PrismLights />
            <FacetedTetrahedron spinning={shouldSpin} />
          </Suspense>
        </Canvas>
      </PrismErrorBoundary>
    </div>
  )
}
