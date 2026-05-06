import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ForceGraph2D from 'react-force-graph-2d'

import REAL_DATA from '../data/conn3ctors.json'

// If REAL_DATA is empty or fails to load, we can provide an empty fallback
const MOCK_DATA = REAL_DATA && REAL_DATA.nodes ? REAL_DATA : { nodes: [], links: [] }
export function MapSection() {
  const containerRef = useRef(null)
  const fgRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [selectedNode, setSelectedNode] = useState(null)

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

  // Spread nodes out using custom physics forces
  useEffect(() => {
    if (fgRef.current) {
      // Negative charge repels nodes away from each other
      fgRef.current.d3Force('charge').strength(-300)
      // Increase distance of links to space out the central cluster
      fgRef.current.d3Force('link').distance(80)
    }
  }, [])

  const handleNodeClick = useCallback((node) => {
    if (node.id === 'main') {
      // Clicking the center logo retracts all nodes by clearing their fixed positions
      MOCK_DATA.nodes.forEach(n => {
        n.fx = undefined
        n.fy = undefined
      })
      setSelectedNode(null)
      return
    }
    
    setSelectedNode(node)
    
    // Smoothly center the camera on the clicked node
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000)
      fgRef.current.zoom(2.5, 1000)
    }
  }, [])

  const handleNodeDragEnd = useCallback(node => {
    // When a user drags a node, freeze it in place
    node.fx = node.x
    node.fy = node.y
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
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={MOCK_DATA}
            nodeCanvasObject={drawNode}
            linkColor={link => link.color}
            linkWidth={1}
            backgroundColor="transparent"
            enableNodeDrag={true}
            enableZoomPanInteraction={true}
            onNodeClick={handleNodeClick}
            onNodeDragEnd={handleNodeDragEnd}
          />

          {/* Hyper-Realistic 3D Glass Profile ID Card Overlay */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotateX: 20, y: 50 }}
                animate={{ opacity: 1, scale: 1, rotateX: 10, rotateY: -5, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, rotateX: 20, y: 50 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="absolute bottom-12 right-6 md:bottom-24 md:right-24 z-50 pointer-events-auto"
                style={{ perspective: 1200 }}
              >
                {/* ID Badge Container */}
                <div 
                  className="relative w-[340px] rounded-[24px] overflow-hidden backdrop-blur-3xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 100%)',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(255,255,255,0.1)',
                  }}
                >
                  {/* Neon Glowing Edge Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 opacity-20" style={{ padding: 1 }} />
                  
                  {/* Glossy Reflection overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent h-[40%] pointer-events-none" />

                  {/* Card Content */}
                  <div className="relative bg-black/40 m-[1px] rounded-[23px] p-6 h-full border border-white/10">
                    <button 
                      onClick={() => setSelectedNode(null)}
                      className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-20"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>

                    {/* Top Row: Avatar & Text */}
                    <div className="flex gap-4 items-center relative z-10">
                      <div className="relative">
                        <img 
                          src={selectedNode.avatar} 
                          alt={selectedNode.name} 
                          className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/20"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#121215]"></div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h3 className="font-orbitron font-bold text-lg text-white truncate drop-shadow-md">{selectedNode.name}</h3>
                        <p className="text-white/60 font-space text-sm truncate">{selectedNode.discordHandle}</p>
                      </div>
                    </div>

                    {/* Data Row: Mutuals & Role */}
                    <div className="flex justify-between items-center mt-6 pt-5 border-t border-white/10 font-space relative z-10">
                      <div className="flex gap-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-lg drop-shadow-sm">
                            {(selectedNode.id.charCodeAt(0) % 40) + 2}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Mutual Servers</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-lg drop-shadow-sm">
                            {(selectedNode.id.charCodeAt(selectedNode.id.length-1) % 150) + 10}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Friends</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div 
                          className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border"
                          style={{ borderColor: selectedNode.color, color: selectedNode.color, backgroundColor: `${selectedNode.color}20` }}
                        >
                          CONN3CTOR
                        </div>
                      </div>
                    </div>

                    {/* X Integration Row */}
                    {selectedNode.xHandle && (
                      <div className="mt-5 pt-5 border-t border-white/10 relative z-10">
                        <a 
                          href={`https://x.com/${selectedNode.xHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white border border-white/20 shadow-md">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                            </div>
                            <span className="text-white text-sm font-space group-hover:text-gold transition-colors">@{selectedNode.xHandle}</span>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 group-hover:text-gold group-hover:translate-x-1 transition-all"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </a>
                      </div>
                    )}
                    
                    {/* Simulated Finger Shadows to represent "held" */}
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/60 blur-2xl rounded-full pointer-events-none" />
                    <div className="absolute -bottom-4 -right-12 w-20 h-20 bg-black/40 blur-xl rounded-full pointer-events-none" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
