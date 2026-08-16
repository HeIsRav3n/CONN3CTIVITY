import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

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
    </motion.button>
  )
}

// ── Score Display ────────────────────────────────────────
function ScoreBoard({ scores, currentPlayer, isMultiplayer, mySymbol }) {
  const gmLabel = isMultiplayer ? (mySymbol === 'GM' ? 'YOU' : 'P2') : 'YOU'
  const cmLabel = isMultiplayer ? (mySymbol === 'CM' ? 'YOU' : 'P2') : 'AI'

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
          {gmLabel}
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
          {cmLabel}
        </div>
        <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontWeight: 200, fontSize: '1.6rem', color: '#C9A96E', lineHeight: 1 }}>
          {scores.CM}
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Game Modal ──────────────────────────────────────
export function MascotTicTacToe({ isOpen, onClose, user }) {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState('GM')
  const [gameResult, setGameResult] = useState(null)
  const [scores, setScores] = useState({ GM: 0, CM: 0, draws: 0 })
  
  // Single Player AI mode vs Multiplayer Mode
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [mySymbol, setMySymbol] = useState('GM') // GM starts
  const [opponent, setOpponent] = useState(null)
  const [, setRoomId] = useState(null)
  
  // Realtime Lobby States
  const [onlineUsers, setOnlineUsers] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const lobbyChannelRef = useRef(null)
  const gameChannelRef = useRef(null)
  const joinGameRoomRef = useRef(null)

  const [showConfetti, setShowConfetti] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const aiTimerRef = useRef(null)

  // -- Supabase Realtime Setup --
  useEffect(() => {
    if (!isOpen || !user || !supabase) return;

    // Join Global Lobby
    const lobby = supabase.channel('ttt-lobby', {
      config: { presence: { key: user.id } }
    })

    lobby
      .on('presence', { event: 'sync' }, () => {
        const newState = lobby.presenceState()
        const users = []
        for (const [id, stateArray] of Object.entries(newState)) {
          if (id !== user.id && stateArray.length > 0) {
            users.push(stateArray[0].user)
          }
        }
        // Deduplicate and filter out self
        const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values())
        setOnlineUsers(uniqueUsers)
      })
      .on('broadcast', { event: 'game-request' }, ({ payload }) => {
        if (payload.targetId === user.id) {
          setIncomingRequests(prev => [...prev, payload.requester])
        }
      })
      .on('broadcast', { event: 'request-accepted' }, ({ payload }) => {
        if (payload.targetId === user.id) {
          joinGameRoomRef.current?.(payload.roomId, payload.acceptor, 'GM')
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await lobby.track({ user: { id: user.id, username: user.username, avatar_url: user.avatar_url, avatar: user.avatar } })
        }
      })

    lobbyChannelRef.current = lobby

    return () => {
      supabase.removeChannel(lobby)
      if (gameChannelRef.current) supabase.removeChannel(gameChannelRef.current)
    }
  }, [isOpen, user])

  // Multi-player Game Room Actions
  const joinGameRoom = (newRoomId, opp, symbol) => {
    setIsMultiplayer(true)
    setRoomId(newRoomId)
    setOpponent(opp)
    setMySymbol(symbol)
    resetGame()
    setScores({ GM: 0, CM: 0, draws: 0 })

    if (gameChannelRef.current) supabase.removeChannel(gameChannelRef.current)

    const gameChan = supabase.channel(`game-${newRoomId}`)
    
    gameChan
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        setBoard(payload.newBoard)
        setCurrentPlayer(payload.nextPlayer)
      })
      .on('broadcast', { event: 'play-again' }, () => {
        resetGame()
      })
      .on('broadcast', { event: 'leave' }, () => {
        alert(`${opp.username} left the game.`)
        exitMultiplayer()
      })
      .subscribe()
    
    gameChannelRef.current = gameChan
  }

  useEffect(() => {
    joinGameRoomRef.current = joinGameRoom
  })

  const sendRequest = async (targetUser) => {
    if (!lobbyChannelRef.current) return
    await lobbyChannelRef.current.send({
      type: 'broadcast',
      event: 'game-request',
      payload: { targetId: targetUser.id, requester: user }
    })
    alert(`Challenge sent to ${targetUser.username}! Waiting for them to accept...`)
  }

  const acceptRequest = async (requester) => {
    if (!lobbyChannelRef.current) return
    const newRoomId = `${user.id}-${requester.id}-${Date.now()}`
    
    await lobbyChannelRef.current.send({
      type: 'broadcast',
      event: 'request-accepted',
      payload: { targetId: requester.id, acceptor: user, roomId: newRoomId }
    })
    
    setIncomingRequests(prev => prev.filter(r => r.id !== requester.id))
    joinGameRoom(newRoomId, requester, 'CM') // Acceptor plays as CM
  }

  const exitMultiplayer = () => {
    if (gameChannelRef.current) {
      gameChannelRef.current.send({ type: 'broadcast', event: 'leave' })
      supabase.removeChannel(gameChannelRef.current)
      gameChannelRef.current = null
    }
    setIsMultiplayer(false)
    setRoomId(null)
    setOpponent(null)
    resetGame()
  }

  // Check game win condition
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

  // Single Player AI Turn
  useEffect(() => {
    if (isMultiplayer || currentPlayer !== 'CM' || gameResult) return
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
  }, [currentPlayer, isMultiplayer, board, gameResult])

  const handleCellClick = useCallback((index) => {
    if (board[index] || gameResult) return
    
    if (isMultiplayer) {
      if (currentPlayer !== mySymbol) return // Not my turn
      const nextBoard = [...board]
      nextBoard[index] = mySymbol
      const nextPlayer = mySymbol === 'GM' ? 'CM' : 'GM'
      
      setBoard(nextBoard)
      setCurrentPlayer(nextPlayer)
      
      if (gameChannelRef.current) {
        gameChannelRef.current.send({
          type: 'broadcast',
          event: 'move',
          payload: { newBoard: nextBoard, nextPlayer }
        })
      }
    } else {
      if (currentPlayer === 'CM') return // AI turn
      const nextBoard = [...board]
      nextBoard[index] = currentPlayer
      setBoard(nextBoard)
      setCurrentPlayer('CM')
    }
  }, [board, currentPlayer, gameResult, isMultiplayer, mySymbol])

  const resetGame = () => {
    clearTimeout(aiTimerRef.current)
    setBoard(Array(9).fill(null))
    setCurrentPlayer('GM')
    setGameResult(null)
    setAiThinking(false)
    setShowConfetti(false)
  }

  const handlePlayAgain = () => {
    resetGame()
    if (isMultiplayer && gameChannelRef.current) {
      gameChannelRef.current.send({ type: 'broadcast', event: 'play-again' })
    }
  }

  const resetAll = () => {
    resetGame()
    setScores({ GM: 0, CM: 0, draws: 0 })
  }

  const winningCells = new Set(gameResult?.line || [])
  const getStatusText = () => {
    if (gameResult) {
      if (gameResult.winner === 'draw') return "It's a Draw!"
      if (isMultiplayer) {
        return gameResult.winner === mySymbol ? '🎉 You Win!' : `😔 ${opponent.username} Wins!`
      } else {
        return gameResult.winner === 'GM' ? '🐺 You Win!' : '🦅 AI Wins!'
      }
    }
    if (isMultiplayer) {
      return currentPlayer === mySymbol ? 'Your Turn' : `Waiting for ${opponent.username}...`
    } else {
      return aiThinking ? 'AI is thinking...' : 'Your Turn'
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

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
          role="dialog"
          aria-modal="true"
          aria-label="Mascot tic-tac-toe"
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
            className="relative flex flex-col md:flex-row max-w-4xl w-full gap-4"
          >
            {/* ── Left side: The Game ── */}
            <div style={{
              flex: 1,
              position: 'relative',
              background: 'linear-gradient(145deg, #1a1816, #111009)',
              border: '1px solid rgba(201,169,110,0.25)',
              borderRadius: 24,
              padding: '32px 28px 28px',
              boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 60px rgba(201,169,110,0.06)',
              overflow: 'hidden',
            }}>
              <Confetti active={showConfetti} />

              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.6), transparent)',
              }} />

              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{
                  fontFamily: "'Josefin Sans', sans-serif", fontWeight: 100, fontSize: '0.55rem',
                  letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', marginBottom: 6,
                }}>
                  {isMultiplayer ? 'MULTIPLAYER MATCH' : 'CONN3CT TO WIN'}
                </div>
                <h2 style={{
                  fontFamily: "'Josefin Sans', sans-serif", fontWeight: 300, fontSize: '1.4rem',
                  letterSpacing: '0.25em', textTransform: 'uppercase', color: '#EDE8DC', margin: 0,
                }}>
                  GM <span style={{ color: '#C9A96E' }}>×</span> CM
                </h2>
              </div>

              {/* Scoreboard */}
              <ScoreBoard scores={scores} currentPlayer={gameResult ? null : currentPlayer} isMultiplayer={isMultiplayer} mySymbol={mySymbol} />

              {/* Status bar */}
              <motion.div
                key={getStatusText()}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  textAlign: 'center', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 300,
                  fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                  color: gameResult
                    ? gameResult.winner === 'draw' ? 'rgba(237,232,220,0.6)' : gameResult.winner === 'GM' ? '#EDE8DC' : '#C9A96E'
                    : 'rgba(237,232,220,0.5)',
                  marginTop: 16, marginBottom: 16, minHeight: 22,
                }}
              >
                {getStatusText()}
              </motion.div>

              {/* Game Board */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                {board.map((cell, i) => (
                  <GameCell
                    key={i} value={cell} index={i} onClick={() => handleCellClick(i)}
                    isWinning={winningCells.has(i)}
                    disabled={!!gameResult || (isMultiplayer ? currentPlayer !== mySymbol : aiThinking)}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  onClick={handlePlayAgain}
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(237,232,220,0.12)' }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 font-['Josefin_Sans'] font-light text-[0.65rem] tracking-[0.2em] uppercase py-2.5 rounded-lg border border-cream/20 bg-cream/5 text-cream/80 cursor-pointer transition-colors"
                >
                  Play Again
                </motion.button>

                {!isMultiplayer && (
                  <motion.button
                    onClick={resetAll}
                    whileHover={{ scale: 1.03, backgroundColor: 'rgba(201,169,110,0.15)' }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 font-['Josefin_Sans'] font-light text-[0.65rem] tracking-[0.2em] uppercase py-2.5 rounded-lg border border-gold/30 bg-gold/10 text-gold cursor-pointer transition-colors"
                  >
                    Reset Score
                  </motion.button>
                )}

                {isMultiplayer && (
                  <motion.button
                    onClick={exitMultiplayer}
                    whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,100,100,0.15)' }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 font-['Josefin_Sans'] font-light text-[0.65rem] tracking-[0.2em] uppercase py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 cursor-pointer transition-colors"
                  >
                    Leave Match
                  </motion.button>
                )}
              </div>
            </div>

            {/* ── Right side: Multiplayer Lobby ── */}
            <div className="flex-1 min-w-[280px] bg-[#111009] border border-[#C9A96E]/20 rounded-[24px] p-6 flex flex-col relative overflow-hidden h-full max-h-[550px]">
              <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#C9A96E]/40 to-transparent" />
              
              <h3 className="font-['Josefin_Sans'] text-sm tracking-[0.3em] uppercase text-[#C9A96E] mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Active Conn3ctors
              </h3>

              {!user ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <p className="text-white/40 font-['Josefin_Sans'] text-xs tracking-widest leading-relaxed">
                    You must be logged in to challenge other Conn3ctors.
                  </p>
                </div>
              ) : isMultiplayer ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-4">
                  <div className="relative">
                    <img src={opponent.avatar_url || `https://cdn.discordapp.com/avatars/${opponent.id}/${opponent.avatar}.png`} alt="Opponent" className="w-16 h-16 rounded-full border border-gold/50 object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-black" />
                  </div>
                  <div>
                    <div className="text-white font-['Josefin_Sans'] text-lg">{opponent.username}</div>
                    <div className="text-white/40 text-xs font-space uppercase tracking-widest">Playing as {mySymbol === 'GM' ? 'CM' : 'GM'}</div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
                  {/* Incoming Requests */}
                  {incomingRequests.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[0.6rem] text-white/50 tracking-widest uppercase mb-2 font-['Josefin_Sans']">Incoming Challenges</div>
                      <div className="space-y-2">
                        {incomingRequests.map((req, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gold/40 bg-gold/5">
                            <div className="flex items-center gap-3">
                              <img src={req.avatar_url || `https://cdn.discordapp.com/avatars/${req.id}/${req.avatar}.png`} className="w-8 h-8 rounded-full border border-gold/20" alt="avatar" />
                              <span className="text-sm text-white/90 font-space truncate max-w-[100px]">{req.username}</span>
                            </div>
                            <button 
                              onClick={() => acceptRequest(req)}
                              className="px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold text-[0.6rem] uppercase tracking-widest rounded transition-colors"
                            >
                              Accept
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[0.6rem] text-white/50 tracking-widest uppercase mb-2 font-['Josefin_Sans']">Online Lobby ({onlineUsers.length})</div>
                  {onlineUsers.length === 0 ? (
                    <div className="text-center text-white/30 text-xs italic mt-4">No other players online.</div>
                  ) : (
                    onlineUsers.map(onlineUser => (
                      <div key={onlineUser.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={onlineUser.avatar_url || `https://cdn.discordapp.com/avatars/${onlineUser.id}/${onlineUser.avatar}.png`} className="w-8 h-8 rounded-full border border-white/20" alt="avatar" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-black" />
                          </div>
                          <span className="text-sm text-white/70 font-space truncate max-w-[100px]">{onlineUser.username}</span>
                        </div>
                        <button 
                          onClick={() => sendRequest(onlineUser)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[0.6rem] uppercase tracking-widest rounded transition-colors"
                        >
                          Challenge
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {/* Floating Close Button outside for mobile or inside for desktop */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 md:top-4 md:right-4 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
