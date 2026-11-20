import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { canUseWebGL } from '../../lib/webgl'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { colourPolyhedronFaces } from '../../lib/gemFaces'

const GOLD = '#C9A96E'
const CREAM = '#EDE8DC'

// DESIGN CHANGE (PR #2, decisive pass): the prism is no longer a
// tetrahedron. A tetrahedron has 4 faces, so viewed face-on it IS a single
// flat triangle by definition — no palette, edge line or lighting tweak
// can fix that, which is why it still collapsed to flat/washed-out at some
// angles after two recolour rounds. This is now a 20-face icosahedron:
// at every rotation angle the camera sees 3-5 faces, so it cannot collapse
// to one flat tone. Faces are coloured by colourPolyhedronFaces (no two
// adjacent faces share a tone), and a warm key light ORBITS the gem so
// face shading keeps changing as it turns — a static environment alone
// washed faces to grey-beige.
function FacetedGem({ spinning = true }) {
  const groupRef = useRef()
  const orbitRef = useRef()
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.15, 0), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 1), [geometry])

  const faceColors = useMemo(() => colourPolyhedronFaces(geometry), [geometry])

  useEffect(() => {
    geometry.setAttribute('color', faceColors.attribute)
    return () => {
      geometry.dispose()
      edges.dispose()
    }
  }, [geometry, edges, faceColors])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return
    const t = state.clock.elapsedTime
    if (spinning) {
      // ~0.85 rad/s: a full turn in ~7s, so the facets are obvious within
      // a few seconds of looking.
      group.rotation.y += delta * 0.85
      group.rotation.x = 0.52 + Math.sin(t * 0.6) * 0.12
      group.rotation.z = 0.18 + Math.cos(t * 0.45) * 0.08
      // Orbiting warm key light: face shading changes continuously as the
      // gem turns, so no angle ever sits in flat even light.
      if (orbitRef.current) {
        orbitRef.current.position.set(
          Math.cos(t * 0.5) * 3.4,
          1.8 + Math.sin(t * 0.35) * 1.4,
          Math.sin(t * 0.5) * 3.4,
        )
      }
      // frameloop="demand" only renders on invalidate, so keep the loop
      // alive while the gem is spinning. When it stops spinning the
      // canvas settles after a single frame.
      state.invalidate()
    }
  })

  return (
    <group ref={groupRef} frustumCulled={false}>
      <pointLight ref={orbitRef} intensity={16} distance={14} color="#FFD97A" />
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#ffffff"
          vertexColors
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
      {/* Dark outline shell: the same gem scaled up 6% and rendered
          back-faces only in near-black bronze. WebGL cannot draw thick
          lines, so this is what makes the silhouette and facet separation
          genuinely visible — a dark rim around the gem at all angles. */}
      <mesh geometry={geometry} scale={1.06}>
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
            <FacetedGem spinning={shouldSpin} />
          </Suspense>
        </Canvas>
      </PrismErrorBoundary>
    </div>
  )
}
