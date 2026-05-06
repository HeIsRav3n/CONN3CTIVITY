import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Game Logic ───────────────────────────────────────────
const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],          // diags
]

function checkWinner(board) {
  for (const line of WINNING_LINES) {
    const [a,b,c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line }
    }
  }
  if (board.every(c => c !== null)) return { winner: 'draw', line: [] }
  return null
}

// Minimax AI for CM
function minimax(board, isMaximizing, depth = 0) {
  const result = checkWinner(board)
  if (result) {
    if (result.winner === 'CM') return 10 - depth
    if (result.winner === 'GM') return depth - 10
    return 0
  }
  if (isMaximizing) {
    let best = -Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'CM'
        best = Math.max(best, minimax(board, false, depth + 1))
        board[i] = null
      }
    }
    return best
  } else {
    let best = Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'GM'
        best = Math.min(best, minimax(board, true, depth + 1))
        board[i] = null
      }
    }
    return best
  }
}

function getBestMove(board) {
  let bestScore = -Infinity
  let bestMove = -1
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'CM'
      const score = minimax(board, false, 0)
      board[i] = null
      if (score > bestScore) { bestScore = score; bestMove = i }
    }
  }
  return bestMove
}

// ── Confetti Particle ────────────────────────────────────
function Particle({ color, delay }) {
  const x = (Math.random() - 0.5) * 600
  const y = (Math.random() - 0.5) * 600
  const rotate = Math.random() * 720 - 360
  const size = Math.random() * 8 + 4
  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
      animate={{ opacity: 0, x, y, rotate, scale: 0 }}
      transition={{ duration: 1.2 + Math.random() * 0.8, delay, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: size, height: size,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        background: color,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    />
  )
}

function Confetti({ active }) {
  const colors = ['#C9A96E','#EDE8DC','#a855f7','#00d4ff','#f59e0b','#ec4899']
  if (!active) return null
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 100 }}>
      {Array.from({ length: 60 }).map((_, i) => (
        <Particle key={i} color={colors[i % colors.length]} delay={i * 0.02} />
      ))}
    </div>
  )
}

// ── Game Cell ────────────────────────────────────────────
function GameCell({ value, index, onClick, isWinning, disabled }) {
  const canClick = !value && !disabled

  return (
    <motion.button
      onClick={canClick ? onClick : undefined}
      whileHover={canClick ? { scale: 1.05, backgroundColor: 'rgba(237,232,220,0.06)' } : {}}
      whileTap={canClick ? { scale: 0.95 } : {}}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1',
        background: isWinning
          ? 'rgba(201,169,110,0.12)'
          : 'rgba(237,232,220,0.03)',
        border: isWinning
          ? '1px solid rgba(201,169,110,0.6)'
          : '1px solid rgba(237,232,220,0.12)',
        borderRadius: 16,
        cursor: canClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'border 0.3s ease, background 0.3s ease',
        boxShadow: isWinning ? '0 0 20px rgba(201,169,110,0.25)' : 'none',
      }}
    >
      <AnimatePresence>
        {value && (
          <motion.div
            key={value + index}
            initial={{ opacity: 0, scale: 0, rotateY: 90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 260 }}
            style={{ width: '75%', height: '75%', position: 'relative' }}
          >
            <img
              src={value === 'GM' ? '/mascot-gm-transparent.png' : '/mascot-cm-transparent.png'}
              alt={value}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: isWinning
                  ? `drop-shadow(0 0 14px ${value === 'GM' ? 'rgba(237,232,220,0.8)' : 'rgba(201,169,110,0.8)'})`
                  : `drop-shadow(0 4px 8px rgba(0,0,0,0.4))`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover ghost mascot hint */}
      {canClick && (
        <div
          className="cell-ghost"
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.2s',
          }}
        >
        </div>
      )}
    </motion.button>
  )
}

// ── Score Display ────────────────────────────────────────
function ScoreBoard({ scores, currentPlayer, vsAI }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
      {/* GM Score */}
      <motion.div
        animate={{ scale: currentPlayer === 'GM' ? [1, 1.06, 1] : 1 }}
        transition={{ duration: 0.5, repeat: currentPlayer === 'GM' ? Infinity : 0, repeatDelay: 0.8 }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          padding: '10px 18px',
          borderRadius: 12,
          background: currentPlayer === 'GM' ? 'rgba(237,232,220,0.08)' : 'rgba(237,232,220,0.03)',
          border: currentPlayer === 'GM' ? '1px solid rgba(237,232,220,0.4)' : '1px solid rgba(237,232,220,0.1)',
          transition: 'all 0.3s ease',
          minWidth: 80,
        }}
      >
        <img src="/mascot-gm-transparent.png" alt="GM" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(237,232,220,0.6)', textTransform: 'uppercase' }}>
          {vsAI ? 'YOU' : 'GM'}
        </div>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 200, fontSize: '1.6rem', color: '#EDE8DC', lineHeight: 1 }}>
          {scores.GM}
        </div>
      </motion.div>

      {/* VS divider */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 100, fontSize: '1.1rem', letterSpacing: '0.25em', color: 'rgba(201,169,110,0.6)' }}>VS</div>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 300, fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(237,232,220,0.3)', textTransform: 'uppercase' }}>
          {scores.draws} draws
        </div>
      </div>

      {/* CM Score */}
      <motion.div
        animate={{ scale: currentPlayer === 'CM' ? [1, 1.06, 1] : 1 }}
        transition={{ duration: 0.5, repeat: currentPlayer === 'CM' ? Infinity : 0, repeatDelay: 0.8 }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          padding: '10px 18px',
          borderRadius: 12,
          background: currentPlayer === 'CM' ? 'rgba(201,169,110,0.08)' : 'rgba(201,169,110,0.03)',
          border: currentPlayer === 'CM' ? '1px solid rgba(201,169,110,0.5)' : '1px solid rgba(201,169,110,0.1)',
          transition: 'all 0.3s ease',
          minWidth: 80,
        }}
      >
        <img src="/mascot-cm-transparent.png" alt="CM" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(201,169,110,0.6)', textTransform: 'uppercase' }}>
          {vsAI ? 'AI' : 'CM'}
        </div>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 200, fontSize: '1.6rem', color: '#C9A96E', lineHeight: 1 }}>
          {scores.CM}
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Game Modal ──────────────────────────────────────
export function MascotTicTacToe({ isOpen, onClose }) {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState('GM')
  const [gameResult, setGameResult] = useState(null) // { winner, line }
  const [scores, setScores] = useState({ GM: 0, CM: 0, draws: 0 })
  const [vsAI, setVsAI] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const aiTimerRef = useRef(null)

  // Check result whenever board changes
  useEffect(() => {
    const result = checkWinner(board)
    if (result && !gameResult) {
      setGameResult(result)
      if (result.winner !== 'draw') {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2500)
        setScores(prev => ({ ...prev, [result.winner]: prev[result.winner] + 1 }))
      } else {
        setScores(prev => ({ ...prev, draws: prev.draws + 1 }))
      }
    }
  }, [board, gameResult])

  // AI move
  useEffect(() => {
    if (!vsAI || currentPlayer !== 'CM' || gameResult) return
    if (board.every(c => c === null)) return // wait for GM to go first

    setAiThinking(true)
    aiTimerRef.current = setTimeout(() => {
      const move = getBestMove([...board])
      if (move !== -1) {
        setBoard(prev => {
          const next = [...prev]
          next[move] = 'CM'
          return next
        })
        setCurrentPlayer('GM')
      }
      setAiThinking(false)
    }, 600)

    return () => clearTimeout(aiTimerRef.current)
  }, [currentPlayer, vsAI, board, gameResult])

  const handleCellClick = useCallback((index) => {
    if (board[index] || gameResult) return
    if (vsAI && currentPlayer === 'CM') return

    const next = [...board]
    next[index] = currentPlayer
    setBoard(next)
    setCurrentPlayer(p => p === 'GM' ? 'CM' : 'GM')
  }, [board, currentPlayer, gameResult, vsAI])

  const resetGame = () => {
    clearTimeout(aiTimerRef.current)
    setBoard(Array(9).fill(null))
    setCurrentPlayer('GM')
    setGameResult(null)
    setAiThinking(false)
    setShowConfetti(false)
  }

  const resetAll = () => {
    resetGame()
    setScores({ GM: 0, CM: 0, draws: 0 })
  }

  const winningCells = new Set(gameResult?.line || [])
  const statusText = gameResult
    ? gameResult.winner === 'draw'
      ? "It's a Draw!"
      : gameResult.winner === 'GM'
        ? vsAI ? '🐺 You Win!' : '🐺 GM Wins!'
        : vsAI ? '🦅 AI Wins!' : '🦅 CM Wins!'
    : aiThinking
      ? 'CM is thinking...'
      : currentPlayer === 'GM'
        ? vsAI ? 'Your Turn (GM)' : 'GM\'s Turn'
        : 'CM\'s Turn'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ttt-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(16px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            key="ttt-panel"
            initial={{ opacity: 0, scale: 0.85, y: 40, rotateX: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 440,
              background: 'linear-gradient(145deg, #1a1816, #111009)',
              border: '1px solid rgba(201,169,110,0.25)',
              borderRadius: 24,
              padding: '32px 28px 28px',
              boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 60px rgba(201,169,110,0.06)',
              overflow: 'hidden',
            }}
          >
            <Confetti active={showConfetti} />

            {/* Decorative top glow */}
            <div style={{
              position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.6), transparent)',
            }} />

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                fontFamily: "'Josefin Sans', sans-serif",
                fontWeight: 100,
                fontSize: '0.55rem',
                letterSpacing: '0.4em',
                textTransform: 'uppercase',
                color: 'rgba(201,169,110,0.6)',
                marginBottom: 6,
              }}>
                CONN3CT TO WIN
              </div>
              <h2 style={{
                fontFamily: "'Josefin Sans', sans-serif",
                fontWeight: 300,
                fontSize: '1.4rem',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#EDE8DC',
                margin: 0,
              }}>
                GM <span style={{ color: '#C9A96E' }}>×</span> CM
              </h2>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{
                display: 'flex',
                background: 'rgba(237,232,220,0.04)',
                border: '1px solid rgba(237,232,220,0.1)',
                borderRadius: 8,
                padding: 3,
                gap: 2,
              }}>
                {[{ label: 'VS AI', val: true }, { label: '2 PLAYER', val: false }].map(({ label, val }) => (
                  <button
                    key={label}
                    onClick={() => { setVsAI(val); resetGame() }}
                    style={{
                      fontFamily: "'Josefin Sans', sans-serif",
                      fontWeight: 400,
                      fontSize: '0.6rem',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      padding: '5px 14px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: vsAI === val ? 'rgba(201,169,110,0.2)' : 'transparent',
                      color: vsAI === val ? '#C9A96E' : 'rgba(237,232,220,0.4)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scoreboard */}
            <ScoreBoard scores={scores} currentPlayer={gameResult ? null : currentPlayer} vsAI={vsAI} />

            {/* Status bar */}
            <motion.div
              key={statusText}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                textAlign: 'center',
                fontFamily: "'Josefin Sans', sans-serif",
                fontWeight: 300,
                fontSize: '0.75rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: gameResult
                  ? gameResult.winner === 'draw'
                    ? 'rgba(237,232,220,0.6)'
                    : gameResult.winner === 'GM' ? '#EDE8DC' : '#C9A96E'
                  : 'rgba(237,232,220,0.5)',
                marginTop: 16,
                marginBottom: 16,
                minHeight: 22,
              }}
            >
              {statusText}
            </motion.div>

            {/* Game Board */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 20,
            }}>
              {board.map((cell, i) => (
                <GameCell
                  key={i}
                  value={cell}
                  index={i}
                  onClick={() => handleCellClick(i)}
                  isWinning={winningCells.has(i)}
                  disabled={!!gameResult || aiThinking || (vsAI && currentPlayer === 'CM')}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                onClick={resetGame}
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(237,232,220,0.12)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1,
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: '0.65rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '10px 0',
                  borderRadius: 8,
                  border: '1px solid rgba(237,232,220,0.2)',
                  background: 'rgba(237,232,220,0.06)',
                  color: 'rgba(237,232,220,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                New Game
              </motion.button>

              <motion.button
                onClick={resetAll}
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(201,169,110,0.15)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1,
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: '0.65rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '10px 0',
                  borderRadius: 8,
                  border: '1px solid rgba(201,169,110,0.3)',
                  background: 'rgba(201,169,110,0.08)',
                  color: '#C9A96E',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Reset All
              </motion.button>

              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,100,100,0.12)' }}
                whileTap={{ scale: 0.95 }}
                style={{
                  width: 42,
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '1rem',
                  padding: '10px 0',
                  borderRadius: 8,
                  border: '1px solid rgba(237,232,220,0.12)',
                  background: 'rgba(237,232,220,0.04)',
                  color: 'rgba(237,232,220,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                ✕
              </motion.button>
            </div>

            {/* Hint label */}
            <div style={{
              textAlign: 'center',
              marginTop: 12,
              fontFamily: "'Josefin Sans', sans-serif",
              fontWeight: 300,
              fontSize: '0.55rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(237,232,220,0.2)',
            }}>
              {vsAI ? 'You are GM · AI is CM' : 'Player 1 is GM · Player 2 is CM'}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
