# TASK 7 — ADMIN AI ASSISTANT CHATBOT
## Project: CrisisSync | Feature: Gemini-Powered Admin Chatbot
## Developer: Admin Developer
## Read this ENTIRE file before writing one line of code.

---

## WHAT YOU ARE BUILDING

A **floating AI chatbot bubble** fixed at the **bottom-right corner** of the Admin Dashboard — exactly like the Meta AI bubble in WhatsApp.

When the admin taps it, a chat panel slides up. Inside, a Gemini-powered AI assistant answers questions about the hotel's live situation — active SOS, staff availability, incident summaries, approval recommendations — using real-time Firebase data as context.

The chatbot also **speaks first** (proactive alerts) when it detects situations that need attention — like an unassigned SOS that has been waiting 30 seconds.

---

## FILES TO CREATE (3 new files)

```
src/
  components/
    admin/
      ai/
        AdminAIChatbot.jsx        ← Main component (bubble + panel + all logic)
        buildAdminContext.js       ← Builds live context string for Gemini
        callGeminiAdmin.js         ← Makes the Gemini API call
```

## FILE TO MODIFY (1 existing file)

```
src/pages/admin/AdminDashboard.jsx   ← Import + render AdminAIChatbot
```

---

## NO NEW NPM PACKAGES NEEDED

Gemini API is called via browser `fetch()` — no SDK required. The API key is already in `.env` as `VITE_GEMINI_API_KEY` from the guest chatbot setup.

---
---

## FILE 1 — src/components/admin/ai/buildAdminContext.js

This function takes live data and returns a formatted string that gets injected into every Gemini system prompt. This is what makes the AI context-aware.

```js
// buildAdminContext.js

export const buildAdminContext = (hotel, activeSOS, staffList, todayStats) => {
  if (!hotel) return 'Hotel data not available.'

  const now = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  // Build active SOS lines
  const sosEntries = activeSOS ? Object.values(activeSOS) : []
  const sosLines = sosEntries.length > 0
    ? sosEntries.map(s => {
        const ageMin = Math.floor((Date.now() - s.triggeredAt) / 60000)
        const ageSec = Math.floor((Date.now() - s.triggeredAt) / 1000) % 60
        const ageStr = ageMin > 0 ? `${ageMin}m ${ageSec}s ago` : `${ageSec}s ago`
        const assigned = s.assignedStaffName
          ? `Assigned: ${s.assignedStaffName} (${s.assignedDesignation || 'staff'})`
          : 'UNASSIGNED — needs attention'
        return `  - Room ${s.roomNumber}: ${s.emergencyType.toUpperCase()} | Triggered ${ageStr} | ${assigned}`
      }).join('\n')
    : '  None — hotel is calm'

  // Build staff lines (cap at 20 to avoid context overflow)
  const staffEntries = staffList ? staffList.slice(0, 20) : []
  const staffLines = staffEntries.length > 0
    ? staffEntries.map(s => {
        const p = s.staffProfile || {}
        const duty = p.isOnDuty ? 'ON DUTY' : 'Off Duty'
        const active = p.activeIncidents?.length > 0
          ? `Handling: ${p.activeIncidents[0]}`
          : 'Free'
        return `  - ${s.name} | ${p.designation || 'staff'} | ${duty} | ${active}`
      }).join('\n')
    : '  No staff data available'

  return `
Hotel: ${hotel.hotelName} (Code: ${hotel.hotelCode})
Time: ${now} | Floors: ${hotel.hotelConfig?.totalFloors || '?'} | Rooms: ${hotel.hotelConfig?.totalRooms || '?'}

ACTIVE EMERGENCIES (${sosEntries.length}):
${sosLines}

STAFF STATUS (${staffEntries.length} total):
${staffLines}

OPERATIONS TODAY:
  - Incidents resolved: ${todayStats?.resolvedCount ?? 0}
  - Average response time: ${todayStats?.avgResponseTime ?? 'N/A'}
  - Pending staff approvals: ${todayStats?.pendingApprovals ?? 0}
`.trim()
}
```

---

## FILE 2 — src/components/admin/ai/callGeminiAdmin.js

```js
// callGeminiAdmin.js

export const callGeminiAdmin = async (userMessage, context, conversationHistory = []) => {
  const systemPrompt =
    `You are an AI assistant embedded in CrisisSync, a hotel emergency management system.
You help the hotel admin manage emergencies, staff, and hotel operations.
Rules:
- Be concise (max 100 words per reply), calm, and actionable
- Always refer to specific rooms, staff names, and times from the context
- Never say "I don't know" — use context to give your best specific answer
- If there are active unassigned emergencies, mention them even if not asked
- Plain text only. No markdown, no asterisks, no bullet symbols
- If asked something outside hotel operations, politely redirect

=== LIVE HOTEL CONTEXT ===
${context}
=========================`

  // Build message array with conversation history (last 10 turns for memory)
  const recentHistory = conversationHistory.slice(-10)
  const contents = [
    { role: 'user',  parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I am monitoring your hotel and ready to help.' }] },
    ...recentHistory.map(m => ({
      role:  m.sender === 'admin' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ]

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature:     0.4,   // Low = factual and grounded
            maxOutputTokens: 220,   // ~100 words
            topP:            0.85,
          },
        }),
      }
    )

    if (response.status === 429) {
      throw new Error('RATE_LIMIT')
    }

    if (!response.ok) {
      throw new Error(`API_ERROR_${response.status}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text
      || 'I could not generate a response. Please try again.'

  } catch (err) {
    if (err.message === 'RATE_LIMIT') throw err
    throw new Error('NETWORK_ERROR')
  }
}
```

---

## FILE 3 — src/components/admin/ai/AdminAIChatbot.jsx

This is the main component. Build it section by section exactly as described.

### 3.1 — Imports and constants

```jsx
import { useState, useEffect, useRef } from 'react'
import { buildAdminContext } from './buildAdminContext'
import { callGeminiAdmin }   from './callGeminiAdmin'

// Quick action chips — pre-built prompts for one-tap answers
const QUICK_CHIPS = [
  { label: 'Status now',     prompt: 'Give me a brief status of the hotel right now in 3 sentences.' },
  { label: 'Free staff',     prompt: 'Which staff members are on duty and free to respond right now?' },
  { label: 'Unassigned SOS', prompt: 'Are there any active emergencies with no staff assigned yet?' },
  { label: 'Today summary',  prompt: 'Give me a summary of all incidents and activity today.' },
  { label: 'Approve staff?', prompt: 'Should I approve any pending staff requests? Give your recommendation.' },
]
```

### 3.2 — Component signature and state

```jsx
export default function AdminAIChatbot({
  hotel,        // Firestore hotel document
  activeSOS,    // Object from Firebase Realtime DB  { roomNum: sosData }
  staffList,    // Array of staff user documents from Firestore
  todayStats,   // { resolvedCount, avgResponseTime, pendingApprovals }
  currentUser,  // From useAuth()
}) {
  const [isOpen,           setIsOpen]           = useState(false)
  const [messages,         setMessages]         = useState([])
  const [inputText,        setInputText]        = useState('')
  const [isLoading,        setIsLoading]        = useState(false)
  const [hasUnread,        setHasUnread]        = useState(false)
  const [unreadCount,      setUnreadCount]      = useState(0)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const [proactiveChecked, setProactiveChecked] = useState(new Set())

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const hasEmergency = activeSOS && Object.keys(activeSOS).length > 0
```

### 3.3 — Auto scroll to bottom on new message

```jsx
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
```

### 3.4 — Auto-greet when panel opens for first time

```jsx
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Focus the input
      setTimeout(() => inputRef.current?.focus(), 300)
      // Silent greeting — only AI bubble shown, no user message
      handleSend('Give me a brief status of the hotel right now.', true)
    }
    // Clear unread when panel opens
    if (isOpen) {
      setHasUnread(false)
      setUnreadCount(0)
    }
  }, [isOpen])
```

### 3.5 — Proactive alert useEffect (MOST IMPORTANT)

```jsx
  useEffect(() => {
    if (!activeSOS || Object.keys(activeSOS).length === 0) return

    const checkProactive = async () => {
      for (const [room, sos] of Object.entries(activeSOS)) {
        // Only trigger for unassigned SOS older than 30 seconds
        const ageSeconds = (Date.now() - sos.triggeredAt) / 1000
        const alertKey   = `${sos.incidentId}_unassigned`

        if (
          !sos.assignedStaffId       &&
          ageSeconds > 30            &&
          !proactiveChecked.has(alertKey) &&
          !isLoading
        ) {
          setProactiveChecked(prev => new Set([...prev, alertKey]))

          try {
            const ctx    = buildAdminContext(hotel, activeSOS, staffList, todayStats)
            const prompt = `Room ${room} ${sos.emergencyType} SOS has been unassigned for ${Math.floor(ageSeconds)} seconds. What should I do right now?`
            const reply  = await callGeminiAdmin(prompt, ctx, messages)

            const proactiveMsg = {
              id:          Date.now(),
              sender:      'ai',
              text:        reply,
              timestamp:   Date.now(),
              isProactive: true,    // Different visual style
            }

            setMessages(prev => [...prev, proactiveMsg])

            // Show unread badge if panel is closed
            if (!isOpen) {
              setHasUnread(true)
              setUnreadCount(prev => prev + 1)
            }
          } catch (err) {
            console.error('Proactive alert error:', err)
          }
        }
      }
    }

    // Delay slightly to avoid firing on every render
    const timeout = setTimeout(checkProactive, 1000)
    return () => clearTimeout(timeout)
  }, [activeSOS])
```

### 3.6 — handleSend function

```jsx
  const handleSend = async (textOverride = null, silent = false) => {
    const text = textOverride || inputText.trim()
    if (!text || isLoading) return

    setInputText('')

    // Add user message to chat (unless it's a silent greeting)
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
      const reply = await callGeminiAdmin(text, ctx, messages)

      setMessages(prev => [...prev, {
        id:        Date.now() + 1,
        sender:    'ai',
        text:      reply,
        timestamp: Date.now(),
        isProactive: false,
      }])

    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        // Start 10-second cooldown
        setRateLimitSeconds(10)
        const interval = setInterval(() => {
          setRateLimitSeconds(prev => {
            if (prev <= 1) { clearInterval(interval); return 0 }
            return prev - 1
          })
        }, 1000)
        setMessages(prev => [...prev, {
          id:      Date.now() + 1,
          sender:  'ai',
          text:    'Too many requests. Please wait 10 seconds before asking again.',
          timestamp: Date.now(),
          isError: true,
        }])
      } else {
        setMessages(prev => [...prev, {
          id:      Date.now() + 1,
          sender:  'ai',
          text:    'Could not connect to AI right now. Your hotel data is still live. Try again in a moment.',
          timestamp: Date.now(),
          isError: true,
        }])
      }
    }

    setIsLoading(false)
  }
```

### 3.7 — JSX (the visual)

```jsx
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

      {/* ── CHAT PANEL (opens upward) ─────────────────────────────────── */}
      {isOpen && (
        <div
          className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200
                     flex flex-col overflow-hidden"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="bg-cs-navy px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {/* Gemini G icon */}
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
              {/* Clear chat */}
              <button
                onClick={() => setMessages([])}
                title="Clear chat"
                className="text-slate-400 hover:text-white text-xs transition"
              >
                🗑
              </button>
              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-light leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Emergency banner — shown when SOS is active */}
          {hasEmergency && (
            <div className="bg-red-50 border-b border-red-200 px-3 py-2 flex items-center gap-2 shrink-0">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <p className="text-red-700 text-xs font-semibold">
                {Object.keys(activeSOS).length} active emergency — ask me what to do
              </p>
            </div>
          )}

          {/* Messages area */}
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
                {/* AI avatar */}
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
                  {/* Proactive badge */}
                  {msg.isProactive && (
                    <p className="text-amber-600 font-bold text-xs mb-1">
                      ⚡ AI Alert
                    </p>
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

          {/* Quick action chips */}
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

          {/* Input bar */}
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

      {/* ── FLOATING BUBBLE ──────────────────────────────────────────── */}
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

        {/* Unread badge (shown when panel is closed and new AI message arrived) */}
        {!isOpen && hasUnread && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full
                          flex items-center justify-center border-2 border-white">
            <span className="text-white text-xs font-bold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}

        {/* Auto-suggestion tooltip (shown 30s after unassigned SOS) */}
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
```

---

## FILE 4 — Changes to AdminDashboard.jsx

### Step 1 — Import at the top

```jsx
import AdminAIChatbot from '../../components/admin/ai/AdminAIChatbot'
```

### Step 2 — Compute todayStats in AdminDashboard

Add this anywhere in your AdminDashboard where you already have the data:

```jsx
// Compute todayStats from your existing state variables
// (you should already have pendingRequests and incidents data)
const todayStats = {
  resolvedCount:   incidents.filter(i => i.status === 'resolved').length,
  avgResponseTime: computeAvgResponseTime(incidents),  // see helper below
  pendingApprovals: pendingRequests.length,
}

// Helper function (add anywhere in the file or in utils/timeHelpers.js)
const computeAvgResponseTime = (incidents) => {
  const resolved = incidents.filter(
    i => i.status === 'resolved' && i.response?.acceptedAt && i.emergency?.triggeredAt
  )
  if (resolved.length === 0) return 'N/A'
  const avgMs = resolved.reduce((sum, i) => {
    return sum + (i.response.acceptedAt.toMillis() - i.emergency.triggeredAt.toMillis())
  }, 0) / resolved.length
  const avgSec = Math.floor(avgMs / 1000)
  return avgSec < 60
    ? `${avgSec}s`
    : `${Math.floor(avgSec / 60)}m ${avgSec % 60}s`
}
```

### Step 3 — Render AdminAIChatbot at the bottom of AdminDashboard JSX

Place this as the LAST element inside your outermost `<div>`, so it sits on top of everything:

```jsx
{/* Admin AI Assistant — floating bubble bottom right */}
<AdminAIChatbot
  hotel={hotel}
  activeSOS={activeSOS}
  staffList={staffList}
  todayStats={todayStats}
  currentUser={currentUser}
/>
```

---

## COMPLETE STATE VARIABLES SUMMARY

Add all of these inside `AdminAIChatbot`:

```jsx
const [isOpen,           setIsOpen]           = useState(false)
const [messages,         setMessages]         = useState([])
const [inputText,        setInputText]        = useState('')
const [isLoading,        setIsLoading]        = useState(false)
const [hasUnread,        setHasUnread]        = useState(false)
const [unreadCount,      setUnreadCount]      = useState(0)
const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
const [proactiveChecked, setProactiveChecked] = useState(new Set())

const bottomRef = useRef(null)
const inputRef  = useRef(null)

const hasEmergency = activeSOS && Object.keys(activeSOS).length > 0
```

---

## DONE CHECKLIST

- [ ] `buildAdminContext.js` created — builds formatted context string from hotel/SOS/staff/stats
- [ ] `callGeminiAdmin.js` created — makes Gemini API call, throws RATE_LIMIT and NETWORK_ERROR
- [ ] `AdminAIChatbot.jsx` created with all state variables
- [ ] Bubble renders at fixed bottom-right (fixed, z-50, bottom-6, right-6)
- [ ] Bubble is blue when no emergency, red + pulsing when activeSOS is non-empty
- [ ] Chat panel opens upward — 320px wide, 520px tall, rounded-2xl
- [ ] Panel header: Gemini G icon, 'Admin AI Assistant', green Online dot, X button, clear button
- [ ] Red emergency banner shown inside panel when SOS is active
- [ ] Auto-greeting fires when panel opens for first time (silent, only AI reply shown)
- [ ] Admin messages show right-aligned in navy
- [ ] AI messages show left-aligned in blue-tinted bg
- [ ] Proactive messages show with amber left border and '⚡ AI Alert' label
- [ ] Error messages show in red styling
- [ ] Typing indicator (3 bouncing dots) shows while isLoading is true
- [ ] 5 quick action chips render below input — one-tap sends correct prompt
- [ ] Input bar: text input + send button. Enter key also sends.
- [ ] Rate limit error caught — 10-second countdown disables input, friendly message shown
- [ ] Network error caught — retry message shown
- [ ] Unread badge (red circle, count number) shows on bubble when panel closed + new AI message
- [ ] Auto-suggestion tooltip pops above bubble when unread + emergency active
- [ ] Proactive useEffect fires for SOS unassigned > 30 seconds
- [ ] proactiveChecked Set prevents duplicate proactive alerts for same SOS
- [ ] Privacy note at bottom of panel: 'Do not share passwords. Chat is not stored.'
- [ ] `AdminDashboard.jsx` updated — import + render + todayStats computed
- [ ] Tested: open panel → auto-greeting shows hotel status
- [ ] Tested: type message → Gemini replies with hotel-specific info (not generic)
- [ ] Tested: tap quick chip → correct prompt sent → specific reply returned
- [ ] Tested: make SOS unassigned for 30s → proactive alert pops automatically
- [ ] Tested: bubble turns red when activeSOS is non-empty in Firebase
- [ ] Tested: close panel after proactive → unread badge appears on bubble
- [ ] Tested: rate limit error → countdown shown → input re-enables after 10s

---

## DO NOT TOUCH

- Do not modify Guest chatbot (GeminiChatbot.jsx) — that is a separate component
- Do not modify AuthContext.jsx
- Do not modify Staff or Guest pages
- Do not add any new npm packages
