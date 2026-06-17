import { motion } from 'framer-motion'
import { SITE_DATA } from '../data/siteData'

export function Footer() {
  return (
    <footer
      className="relative py-16 px-4 overflow-hidden"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(2,2,8,0.95)',
      }}
    >


      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-4"
            >
              <span
                className="font-orbitron font-black text-2xl"
                style={{
                  color: 'var(--cream)',
                }}
              >
                CONN3CTIVITY
              </span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-space text-sm leading-relaxed"
              style={{ color: 'rgba(240,244,255,0.5)' }}
            >
              The Web3 community bridging projects and people through collaboration management
            </motion.p>
          </div>

          {/* Links */}
          <div>
            <motion.h4
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-orbitron font-bold text-xs tracking-widest mb-6"
              style={{ color: 'rgba(240,244,255,0.4)' }}
            >
              NAVIGATE
            </motion.h4>
            <div className="flex flex-col gap-3">
              {['Home', 'About', 'Partnerships', 'Team', 'Connect'].map((link, i) => (
                <motion.a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="font-space text-sm"
                  style={{ color: 'rgba(240,244,255,0.55)' }}
                  whileHover={{ color: '#00d4ff', x: 4 }}
                >
                  {link}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Social + Discord */}
          <div>
            <motion.h4
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-orbitron font-bold text-xs tracking-widest mb-6"
              style={{ color: 'rgba(240,244,255,0.4)' }}
            >
              CONNECT
            </motion.h4>
            <div className="flex flex-col gap-4">
              <motion.a
                href={SITE_DATA.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 font-space text-sm"
                style={{ color: 'rgba(240,244,255,0.6)' }}
                whileHover={{ color: '#00d4ff' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                conn3ctivity_
              </motion.a>

              <motion.button
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 font-space text-sm text-left"
                style={{ color: 'rgba(240,244,255,0.6)' }}
                whileHover={{ color: '#7c3aed' }}
                onClick={() => alert('CONN3CTIVITY Discord Private Access Reach out via Twitter')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z" />
                </svg>
                Private Discord
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-space text-xs tracking-wider"
            style={{ color: 'rgba(240,244,255,0.3)' }}
          >
            © {new Date().getFullYear()} CONN3CTIVITY All rights reserved
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-orbitron text-xs tracking-widest"
            style={{ color: 'rgba(0,212,255,0.4)' }}
          >
            SEARCH FIND CONN3CT
          </motion.p>
        </div>
      </div>
    </footer>
  )
}
