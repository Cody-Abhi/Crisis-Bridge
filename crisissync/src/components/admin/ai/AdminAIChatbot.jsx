import { useState, useEffect, useRef, useCallback } from 'react'
import { buildAdminContext } from './buildAdminContext'
import { callGeminiAdmin }   from './callGeminiAdmin'

// ── Quick action chips — pre-built prompts for one-tap answers ───────────────
const QUICK_CHIPS = [
  { label: 'Status now',     prompt: 'Give me a brief status of the hotel right now in 3 sentences.' },
  { label: 'Free staff',     prompt: 'Which staff members are on duty and free to respond right now?' },
  { label: 'Unassigned SOS', prompt: 'Are there any active emergencies with no staff assigned yet?' },
  { label: 'Today summary',  prompt: 'Give me a summary of all incidents and activity today.' },
  { label: 'Approve staff?', prompt: 'Should I approve any pending staff requests? Give your recommendation.' },
]

// ── Helper: normalize activeSOS to always be an array ────────────────────────
const toSOSArray = (activeSOS) => {
  if (!activeSOS) return []
  if (Array.isArray(activeSOS)) return activeSOS
  return Object.entries(activeSOS).map(([key, val]) => ({
    incidentId: key,
    ...val,
  }))
}

export default function AdminAIChatbot({
  hotel,
  activeSOS,
  staffList,
  todayStats,
  currentUser,
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [isOpen,           setIsOpen]           = useState(false)
  const [messages,         setMessages]         = useState([])
  const [inputText,        setInputText]        = useState('')
  const [isLoading,        setIsLoading]        = useState(false)
  const [hasUnread,        setHasUnread]        = useState(false)
  const [unreadCount,      setUnreadCount]      = useState(0)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const [proactiveChecked, setProactiveChecked] = useState(new Set())

  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const isOpenRef    = useRef(isOpen)       // Track isOpen in a ref for async closures
  const messagesRef  = useRef(messages)     // Track messages ref for proactive calls
  const isLoadingRef = useRef(isLoading)

  // Keep refs in sync
  useEffect(() => { isOpenRef.current = isOpen },       [isOpen])
  useEffect(() => { messagesRef.current = messages },   [messages])
  useEffect(() => { isLoadingRef.current = isLoading }, [isLoading])

  // ── Derived state ──────────────────────────────────────────────────────────
  const sosArray     = toSOSArray(activeSOS)
  const hasEmergency = sosArray.length > 0

  // ── Auto-scroll to bottom on new message ───────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Auto-greet when panel opens for first time ─────────────────────────────
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => inputRef.current?.focus(), 300)
      handleSend('Give me a brief status of the hotel right now.', true)
    }
    if (isOpen) {
      setHasUnread(false)
      setUnreadCount(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ── Proactive alert: detect unassigned SOS older than 30 seconds ───────────
  useEffect(() => {
    if (sosArray.length === 0) return

    const checkProactive = async () => {
      for (const sos of sosArray) {
        if (!sos.triggeredAt) continue

        const ageSeconds = (Date.now() - sos.triggeredAt) / 1000
        const alertKey   = `${sos.incidentId || sos.roomNumber}_unassigned`

        if (
          !sos.assignedStaffId &&
          ageSeconds > 30 &&
          !proactiveChecked.has(alertKey) &&
          !isLoadingRef.current
        ) {
          // Mark as checked FIRST to prevent duplicates
          setProactiveChecked(prev => new Set([...prev, alertKey]))

          try {
            const ctx    = buildAdminContext(hotel, activeSOS, staffList, todayStats)
            const room   = sos.roomNumber || '?'
            const type   = sos.emergencyType || 'emergency'
            const prompt = `Room ${room} ${type} SOS has been unassigned for ${Math.floor(ageSeconds)} seconds. What specific action should I take right now? Who is free to respond?`
            const reply  = await callGeminiAdmin(prompt, ctx, messagesRef.current)

            setMessages(prev => [...prev, {
              id:          Date.now(),
              sender:      'ai',
              text:        reply,
              timestamp:   Date.now(),
              isProactive: true,
            }])

            // Badge the bubble if panel is closed
            if (!isOpenRef.current) {
              setHasUnread(true)
              setUnreadCount(prev => prev + 1)
            }
          } catch (err) {
            console.error('[AdminAI] Proactive alert failed:', err.message)
          }
        }
      }
    }

    const timeout = setTimeout(checkProactive, 1500)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSOS])

  // ── Rate-limit countdown timer ─────────────────────────────────────────────
  useEffect(() => {
    if (rateLimitSeconds <= 0) return
    const timer = setInterval(() => {
      setRateLimitSeconds(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [rateLimitSeconds])

  // ── handleSend: the core send function ─────────────────────────────────────
  const handleSend = useCallback(async (textOverride = null, silent = false) => {
    const text = textOverride || inputText.trim()
    if (!text || isLoading) return

    setInputText('')

    // Show user message bubble (unless silent greeting)
    if (!silent) {
      setMessages(prev => [...prev, {
        id:        Date.now(),
        sender:    'admin',
        text,
        timestamp: Date.now(),
      }])
    }

    setIsLoading(true)

    try {
      const ctx   = buildAdminContext(hotel, activeSOS, staffList, todayStats)
      const reply = await callGeminiAdmin(text, ctx, messagesRef.current)

      setMessages(prev => [...prev, {
        id:          Date.now() + 1,
        sender:      'ai',
        text:        reply,
        timestamp:   Date.now(),
        isProactive: false,
      }])
    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        setRateLimitSeconds(10)
        setMessages(prev => [...prev, {
          id:        Date.now() + 1,
          sender:    'ai',
          text:      'Too many requests. Please wait 10 seconds before asking again.',
          timestamp: Date.now(),
          isError:   true,
        }])
      } else {
        setMessages(prev => [...prev, {
          id:        Date.now() + 1,
          sender:    'ai',
          text:      'Could not connect to AI right now. Your hotel data is still live — try again in a moment.',
          timestamp: Date.now(),
          isError:   true,
        }])
      }
    }

    setIsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, isLoading, hotel, activeSOS, staffList, todayStats])

  // ── Clear chat handler ─────────────────────────────────────────────────────
  const handleClearChat = () => {
    setMessages([])
    setProactiveChecked(new Set())
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ── RENDER ─────────────────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

      {/* ── CHAT PANEL (opens upward) ─────────────────────────────────────── */}
      {isOpen && (
        <div
          className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200
                     flex flex-col overflow-hidden animate-in"
          style={{ height: '520px' }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="bg-cs-navy px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-black text-sm">G</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">Admin AI Assistant</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <p className="text-slate-300 text-xs">Powered by Gemini</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearChat}
                title="Clear chat"
                className="text-slate-400 hover:text-white text-xs transition"
              >
                🗑
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-light leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* ── Emergency banner ─────────────────────────────────────────── */}
          {hasEmergency && (
            <div className="bg-red-50 border-b border-red-200 px-3 py-2 flex items-center gap-2 shrink-0">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <p className="text-red-700 text-xs font-semibold">
                {sosArray.length} active {sosArray.length === 1 ? 'emergency' : 'emergencies'} — ask me what to do
              </p>
            </div>
          )}

          {/* ── Messages area ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 && !isLoading && (
              <div className="text-center mt-8">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-black text-lg">G</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Ask me anything about your hotel
                </p>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <span className="text-white font-black text-xs">G</span>
                  </div>
                )}

                <div
                  className={`max-w-[78%] px-3 py-2 rounded-xl text-sm leading-relaxed
                    ${msg.sender === 'admin'
                      ? 'bg-cs-navy text-white rounded-tr-sm'
                      : msg.isProactive
                        ? 'bg-amber-50 border-l-4 border-amber-500 text-slate-800 rounded-tl-sm'
                        : msg.isError
                          ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
                          : 'bg-blue-50 text-slate-800 rounded-tl-sm'
                    }
                  `}
                >
                  {msg.isProactive && (
                    <p className="text-amber-600 font-bold text-xs mb-1">⚡ AI Alert</p>
                  )}
                  {msg.text}
                  <p className={`text-xs mt-1 ${
                    msg.sender === 'admin' ? 'text-slate-300' : 'text-slate-400'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit', hour12: true
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mr-2 shrink-0">
                  <span className="text-white font-black text-xs">G</span>
                </div>
                <div className="bg-blue-50 px-4 py-3 rounded-xl rounded-tl-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map(delay => (
                      <div
                        key={delay}
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Quick action chips ──────────────────────────────────────── */}
          <div className="px-3 pt-2 pb-1 flex gap-1.5 flex-wrap shrink-0 border-t border-slate-100">
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip.label}
                onClick={() => handleSend(chip.prompt)}
                disabled={isLoading || rateLimitSeconds > 0}
                className="text-xs border border-cs-navy text-cs-navy px-2.5 py-1 rounded-full
                           hover:bg-cs-navy hover:text-white transition
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* ── Input bar ───────────────────────────────────────────────── */}
          <div className="flex gap-2 p-3 border-t border-slate-200 shrink-0">
            <input
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={
                rateLimitSeconds > 0
                  ? `Wait ${rateLimitSeconds}s...`
                  : 'Ask about your hotel...'
              }
              disabled={isLoading || rateLimitSeconds > 0}
              className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400
                         disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputText.trim() || rateLimitSeconds > 0}
              className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200
                         rounded-full flex items-center justify-center text-white
                         transition disabled:cursor-not-allowed shrink-0"
            >
              ↑
            </button>
          </div>

          {/* Privacy note */}
          <p className="text-center text-slate-400 text-xs pb-2 px-3">
            Do not share passwords. Chat is not stored.
          </p>
        </div>
      )}

      {/* ── FLOATING BUBBLE ─────────────────────────────────────────────────── */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={`
            w-14 h-14 rounded-full flex items-center justify-center
            shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95
            ${hasEmergency
              ? 'bg-red-600 animate-pulse shadow-red-500/60'
              : 'bg-blue-600 shadow-blue-500/40'
            }
          `}
          title="Admin AI Assistant"
        >
          {isOpen ? (
            <span className="text-white text-2xl font-light">×</span>
          ) : (
            <span className="text-white font-black text-xl">G</span>
          )}
        </button>

        {/* Unread badge */}
        {!isOpen && hasUnread && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full
                          flex items-center justify-center border-2 border-white">
            <span className="text-white text-xs font-bold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}

        {/* Auto-suggestion tooltip */}
        {!isOpen && hasEmergency && hasUnread && (
          <div className="absolute bottom-full right-0 mb-2 bg-slate-900 text-white
                          text-xs rounded-xl px-3 py-2 whitespace-nowrap shadow-xl
                          animate-bounce">
            ⚡ Emergency needs attention — tap me
            <div className="absolute bottom-0 right-4 translate-y-full
                            border-4 border-transparent border-t-slate-900" />
          </div>
        )}
      </div>
    </div>
  )
}
