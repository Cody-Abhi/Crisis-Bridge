// src/components/chat/ChatWindow.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { rtdb } from '../../firebase/config'
import { ref, onValue, push, set } from 'firebase/database'
import { ArrowDown } from 'lucide-react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'

export default function ChatWindow({ channelId, currentUser, userProfile, title, isReadOnly, channelTheme = 'default' }) {
  const [messages, setMessages] = useState([])
  const [showScrollFab, setShowScrollFab] = useState(false)
  const messagesEndRef = useRef(null)
  const containerRef = useRef(null)
  const prevMsgCountRef = useRef(0)

  // ── Listen to Realtime DB chat channel ──────────────────────────────────
  useEffect(() => {
    if (!channelId) return

    const chatRef = ref(rtdb, `chats/${channelId}/messages`)
    const unsub = onValue(chatRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        setMessages([])
        return
      }
      // Convert object to sorted array
      const msgArray = Object.entries(data)
        .map(([key, val]) => ({ messageId: key, ...val }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      setMessages(msgArray)
    })

    return () => unsub()
  }, [channelId])

  // ── Scroll to bottom helper ─────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollFab(false)
  }, [])

  // ── Initial scroll and new message scroll ──────────────────────────────
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      // If we're already near bottom, scroll down
      const el = containerRef.current
      if (el) {
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
        if (isNearBottom) {
          scrollToBottom()
        } else {
          setShowScrollFab(true)
        }
      } else {
        scrollToBottom()
      }
    }
    prevMsgCountRef.current = messages.length
  }, [messages, scrollToBottom])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setShowScrollFab(scrollHeight - scrollTop - clientHeight > 150)
  }

  // ── Send message via RTDB push ──────────────────────────────────────────
  const sendMessage = async (text) => {
    if (!text.trim() || !channelId) return

    const chatRef = ref(rtdb, `chats/${channelId}/messages`)
    await push(chatRef, {
      senderId:   currentUser?.uid || 'unknown',
      senderName: userProfile?.name || 'Staff',
      senderRole: userProfile?.staffProfile?.designation || 'staff',
      message:    text.trim(),
      timestamp:  Date.now(),
      type:       'text',
    })
  }

  // ── Send typing indicator ───────────────────────────────────────────────
  const handleTyping = useCallback(() => {
    if (!channelId || !currentUser) return
    const typingRef = ref(rtdb, `chats/${channelId}/typing/${currentUser.uid}`)
    set(typingRef, {
      name: userProfile?.name || 'Staff',
      timestamp: Date.now(),
    })
    // Clear after 3 seconds
    const timer = setTimeout(() => {
      set(typingRef, null)
    }, 3000)
    return () => clearTimeout(timer)
  }, [channelId, currentUser, userProfile])

  // ── Check if messages are from same sender in sequence ──────────────────
  const isSameSender = (msg, prevMsg) => {
    if (!prevMsg) return false
    return msg.senderId === prevMsg.senderId &&
           (msg.timestamp - prevMsg.timestamp) < 120000 // 2-min gap
  }

  const isEmergencyTheme = channelTheme === 'emergency'

  return (
    <div className="chat-panel-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="chat-header">
        <h2>{title || 'CHANNEL'}</h2>
        <div className="live-dot" />
      </div>

      <div className="chat-container">
        <div 
          className="chat-messages" 
          ref={containerRef} 
          onScroll={handleScroll}
        >
          {messages.length === 0 && (
            <div className="msg-system">
              <span className="msg-system-text">No messages yet. Start the conversation.</span>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessage
              key={msg.messageId}
              message={msg}
              isOwn={msg.senderId === (currentUser?.uid || 'local-user')}
              isGrouped={isSameSender(msg, messages[idx - 1])}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {showScrollFab && (
          <button className="scroll-fab" onClick={scrollToBottom}>
            <ArrowDown size={18} />
          </button>
        )}

        <ChatInput
          onSend={sendMessage}
          onTyping={handleTyping}
          disabled={isReadOnly}
          isEmergency={isEmergencyTheme}
        />
      </div>
    </div>
  )
}
