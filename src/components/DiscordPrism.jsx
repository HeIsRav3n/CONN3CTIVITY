import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import serverInsights from '../data/serverInsights.json'
import { supabase } from '../lib/supabase'

export function DiscordPrism() {
  const [data, setData] = useState(serverInsights)

  useEffect(() => {
    async function fetchLive() {
      try {
        const { data: row } = await supabase
          .from('server_stats')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()
        if (row) setData(row)
      } catch {
        // Keep static fallback
      }
    }
    fetchLive()
  }, [])

  // Mouse tracking for 3D tilt
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 })
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [15, -15])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-15, 15])

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8, duration: 1, type: 'spring' }}
      className="absolute bottom-24 right-4 md:right-12 lg:right-24 z-[100] pointer-events-auto scale-[0.8] md:scale-100 origin-bottom-right"
      style={{ perspective: 1200 }}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
        className="group cursor-pointer"
      >
        {/* Floating animation wrapper */}
        <motion.div
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          {/* THE PRISM BODY */}
          <div 
            className="relative w-[280px] rounded-[30px] overflow-hidden backdrop-blur-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.4)',
              transform: 'translateZ(20px)'
            }}
          >
            {/* Prismatic reflections */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#a855f7]/10 via-[#00d4ff]/10 to-[#C9A96E]/10 pointer-events-none mix-blend-screen" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent h-[40%] pointer-events-none" />

            {/* Inner Content */}
            <div className="p-6 flex flex-col items-center relative z-10" style={{ transform: 'translateZ(30px)' }}>
              {/* Discord Icon */}
              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 shadow-[0_0_20px_rgba(88,101,242,0.4)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#5865F2">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.461-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </div>

              <div className="font-['Josefin_Sans'] text-[0.55rem] tracking-[0.4em] uppercase text-cream/40 mb-2">
                Live Server Insights
              </div>

              <div className="font-['Orbitron'] font-bold text-lg text-cream mb-6 text-center shadow-black drop-shadow-md">
                {data ? data.name : 'Loading...'}
              </div>

              {/* Stats Row */}
              <div className="w-full grid grid-cols-2 gap-4 border-t border-cream/10 pt-5">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                    <span className="font-['Josefin_Sans'] text-[0.5rem] tracking-[0.1em] text-cream/50 uppercase">Active</span>
                  </div>
                  <span className="font-['Josefin_Sans'] font-light text-xl text-cream">
                    {data ? data.approximate_presence_count : '...'}
                  </span>
                </div>
                <div className="flex flex-col items-center border-l border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold/50" />
                    <span className="font-['Josefin_Sans'] text-[0.5rem] tracking-[0.1em] text-gold/80 uppercase">Conn3ctors</span>
                  </div>
                  <span className="font-['Josefin_Sans'] font-light text-xl text-gold">
                    {data ? data.conn3ctor_count : '...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Back prism shadow effect */}
          <div 
            className="absolute -inset-4 bg-gradient-to-br from-[#C9A96E]/20 via-[#00d4ff]/10 to-[#a855f7]/20 rounded-[40px] blur-2xl -z-10 opacity-60"
            style={{ transform: 'translateZ(-20px)' }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
