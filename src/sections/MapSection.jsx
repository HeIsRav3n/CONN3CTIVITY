import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ForceGraph2D from 'react-force-graph-2d'

import REAL_DATA from '../data/conn3ctors.json'

// If REAL_DATA is empty or fails to load, we can provide an empty fallback
const MOCK_DATA = REAL_DATA && REAL_DATA.nodes ? REAL_DATA : { nodes: [], links: [] }
export function MapSection() {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Auto-resize graph to container
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      setDimensions({
        width: entries[0].contentRect.width,
        height: entries[0].contentRect.height
      })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Custom Canvas Rendering for Nodes
  const drawNode = (node, ctx, globalScale) => {
    const isMain = node.id === 'main'
    const size = isMain ? 24 : 12

    // Lazy load and cache images
    if (!node.imgObj && node.avatar) {
      const img = new Image()
      img.src = node.avatar
      node.imgObj = img
    }

    ctx.save()
    
    // Draw background/fallback
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
    ctx.fillStyle = '#1A1A24'
    ctx.fill()
    ctx.clip()

    // Draw Avatar Image
    if (node.imgObj && node.imgObj.complete) {
      ctx.drawImage(node.imgObj, node.x - size, node.y - size, size * 2, size * 2)
    }

    ctx.restore()

    // Draw Outer Border & Badge
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
    ctx.strokeStyle = isMain ? '#C9A96E' : 'rgba(255,255,255,0.2)'
    ctx.lineWidth = isMain ? 3 : 1.5
    ctx.stroke()

    // Small role indicator dot
    if (!isMain) {
      ctx.beginPath()
      ctx.arc(node.x + size * 0.7, node.y + size * 0.7, 4, 0, 2 * Math.PI)
      ctx.fillStyle = node.color
      ctx.fill()
      ctx.strokeStyle = '#0B0A08'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Text Labels
    if (globalScale > 1.2 || isMain) {
      const label = node.name
      const fontSize = isMain ? 14 / globalScale : 10 / globalScale
      ctx.font = `${fontSize}px 'Space Grotesk', sans-serif`
      ctx.fillStyle = isMain ? '#C9A96E' : 'rgba(237,232,220,0.7)'
      ctx.textAlign = 'center'
      ctx.fillText(label, node.x, node.y + size + fontSize + 4)
    }
  }

  return (
    <section id="map" className="relative py-24 px-4 overflow-hidden" style={{ background: '#07070b' }}>
      
      {/* Abstract Background geometry matching the screenshot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-10 pointer-events-none">
        <div className="w-full h-full border border-white rotate-45 transform origin-center" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="tag-gold inline-flex mb-6">ROLE: CONN3CTOR (1266023149359599617)</div>
          <h2 className="font-orbitron font-bold text-4xl md:text-5xl text-cream mb-6">
            THE CONN3CTION MAP
          </h2>
          <p className="font-space text-cream-muted max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            A live visualization of our verified network. Zoom, pan, and drag nodes to explore the interconnected ecosystem of holders, partners, and community members.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          ref={containerRef}
          className="w-full h-[650px] md:h-[800px] rounded-3xl overflow-hidden relative cursor-crosshair"
          style={{ 
            background: 'radial-gradient(ellipse at center, rgba(30,30,40,0.4) 0%, #07070b 100%)',
            border: '1px solid rgba(201,169,110,0.1)',
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
          }}
        >
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={MOCK_DATA}
            nodeCanvasObject={drawNode}
            linkColor={link => link.color}
            linkWidth={1}
            backgroundColor="transparent"
            enableNodeDrag={true}
            enableZoomPanInteraction={true}
          />
        </motion.div>
      </div>
    </section>
  )
}
