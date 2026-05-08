import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function CryptoRadar() {
  const [prices, setPrices] = useState([])
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true')
        if (!res.ok) throw new Error('API Error')
        const data = await res.json()
        
        setPrices([
          { id: 'BTC', name: 'Bitcoin', data: data.bitcoin, color: '#F7931A' },
          { id: 'ETH', name: 'Ethereum', data: data.ethereum, color: '#627EEA' },
          { id: 'SOL', name: 'Solana', data: data.solana, color: '#14F195' }
        ])
        setError(false)
      } catch (err) {
        console.warn('Failed to fetch crypto prices', err)
        // Fallback mock data if API limits are hit
        if (prices.length === 0) {
            setPrices([
                { id: 'BTC', name: 'Bitcoin', data: { usd: 65420.00, usd_24h_change: 2.4 }, color: '#F7931A' },
                { id: 'ETH', name: 'Ethereum', data: { usd: 3450.00, usd_24h_change: -1.2 }, color: '#627EEA' },
                { id: 'SOL', name: 'Solana', data: { usd: 145.20, usd_24h_change: 5.6 }, color: '#14F195' }
            ])
            setError(true)
        }
      }
    }
    
    fetchPrices()
    const interval = setInterval(fetchPrices, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [])

  if (prices.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 2, duration: 1, type: 'spring' }}
      className="hidden md:flex absolute bottom-24 left-4 md:left-12 lg:left-24 z-[90] pointer-events-auto flex-col gap-3"
    >
      {/* Radar header */}
      <div className="flex items-center gap-2 mb-1 px-2">
        <div className="relative flex items-center justify-center w-4 h-4">
          <div className="absolute inset-0 border border-[#00d4ff] rounded-full animate-[ping_2s_linear_infinite]" />
          <div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full shadow-[0_0_8px_#00d4ff]" />
        </div>
        <span className="font-['Josefin_Sans'] text-[0.6rem] tracking-[0.3em] uppercase text-[#00d4ff]/80">
          Market Radar
        </span>
      </div>

      {prices.map((coin, idx) => {
        const isPositive = coin.data.usd_24h_change >= 0;
        return (
          <motion.div
            key={coin.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2 + (idx * 0.1), duration: 0.5 }}
            className="group relative w-48 rounded-xl overflow-hidden backdrop-blur-md p-3 cursor-default"
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
            {/* Hover glow line */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-300 opacity-50 group-hover:opacity-100 group-hover:w-1 group-hover:shadow-[0_0_10px_currentColor]"
              style={{ backgroundColor: coin.color, color: coin.color }}
            />

            <div className="flex justify-between items-end pl-2">
              <div className="flex flex-col">
                <span className="font-['Orbitron'] font-bold text-sm text-cream tracking-wider">
                  {coin.id}
                </span>
                <span className="font-space text-[10px] text-cream/40">
                  {coin.name}
                </span>
              </div>
              
              <div className="flex flex-col items-end">
                <span className="font-['Josefin_Sans'] text-base text-white tracking-wide">
                  ${coin.data.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span 
                  className="font-space text-[9px] flex items-center gap-1"
                  style={{ color: isPositive ? '#22c55e' : '#ef4444' }}
                >
                  {isPositive ? '▲' : '▼'} {Math.abs(coin.data.usd_24h_change).toFixed(2)}%
                </span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
