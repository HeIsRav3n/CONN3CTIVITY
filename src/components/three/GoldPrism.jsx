import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { canUseWebGL } from '../../lib/webgl'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const GOLD = '#C9A96E'
const CREAM = '#EDE8DC'

// One distinct gold tone per face, so adjacent faces never read as one
// flat gradient. The previous set included a pale #F6DFA8 face that, under
// the RoomEnvironment + high metalness, washed out to grey-beige at some
// angles and collapsed the prism into a flat pale triangle. Every tone
// here is a saturated gold with a wide lightness spread (rich light gold,
// brand gold, mid bronze, dark bronze), so each face reads gold at every
// angle and neighbouring faces stay visibly different.
const FACE_TONES = ['#E8B84B', '#C9A96E', '#7A5518', '#B98A2E']

function FacetedTetrahedron({ spinning = true }) {
  const groupRef = useRef()
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
    const group = groupRef.current
    if (!group) return
    if (spinning) {
      // ~0.85 rad/s: a full turn in ~7s, so the facets are obvious within
      // a few seconds of looking. The old 0.28 rad/s took ~22s per turn,
      // which is why it read as a static flat triangle.
      group.rotation.y += delta * 0.85
      const t = state.clock.elapsedTime
      group.rotation.x = 0.52 + Math.sin(t * 0.6) * 0.12
      group.rotation.z = 0.18 + Math.cos(t * 0.45) * 0.08
      // frameloop="demand" only renders on invalidate, so keep the loop
      // alive while the prism is spinning. When it stops spinning the
      // canvas settles after a single frame.
      state.invalidate()
    }
  })

  return (
    <group ref={groupRef} frustumCulled={false}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#ffffff"
          vertexColors
          // Was metalness 0.85 + envMapIntensity 0.9 + clearcoat 0.7: the
          // bright RoomEnvironment reflected straight off the faces and
          // washed the gold toward white/grey-beige. Lower metalness and
          // env intensity, higher roughness: the faces keep their own
          // gold colour and the environment only tints them.
          metalness={0.55}
          roughness={0.34}
          reflectivity={0.7}
          clearcoat={0.25}
          clearcoatRoughness={0.3}
          envMapIntensity={0.45}
          ior={1.7}
          flatShading
          toneMapped
        />
        {/* Facet edges in dark bronze, not cream: a 1px cream line on a
            pale gold face is invisible (WebGL lines are always 1px and
            linewidth is ignored), while a near-black bronze line reads at
            every angle. */}
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#2E2008" transparent opacity={1} toneMapped={false} />
        </lineSegments>
      </mesh>
      {/* Dark outline shell: the same tetrahedron scaled up 7% and rendered
          back-faces only in near-black bronze. WebGL cannot draw thick
          lines, so this is what makes the silhouette and facet separation
          genuinely visible — a dark rim around the prism at all angles. */}
      <mesh geometry={geometry} scale={1.07}>
        <meshBasicMaterial color="#201606" side={THREE.BackSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

function PrismLights() {
  return (
    <>
      <ambientLight intensity={0.22} color={CREAM} />
      {/* Was 2.4 / 18: the key light and gold point light blew the pale
          faces out to white. Lower intensities keep the gold saturated. */}
      <directionalLight position={[3.2, 4.4, 5]} intensity={1.6} color="#fff6e0" />
      <directionalLight position={[-4, -1.5, 2]} intensity={0.55} color={CREAM} />
      <pointLight position={[0, 1.6, 3.2]} intensity={8} distance={10} color={GOLD} />
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
            toneMappingExposure: 1.0,
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
