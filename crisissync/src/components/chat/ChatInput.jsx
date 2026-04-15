// src/components/chat/ChatInput.jsx
import { useState, useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

export default function ChatInput({ onSend, onTyping, disabled, isEmergency }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Auto-focus when mounted
  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  const handleChange = (e) => {
    setText(e.target.value)
    // Debounced typing indicator
    if (onTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => onTyping(), 300)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim() || disabled) return
    onSend(text)
    setText('')
    inputRef.current?.focus()
  }

  // Handle Shift+Enter for newline, Enter to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(e)
    }
  }

  if (disabled) {
    return (
      <div className="chat-input-bar" style={{ opacity: 0.5, pointerEvents: 'none' }}>
        <input className="chat-input" disabled placeholder="This channel is read-only..." />
      </div>
    )
  }

  return (
    <div className="chat-input-bar">
      <input
        ref={inputRef}
        className="chat-input"
        type="text"
        placeholder={isEmergency ? "Send an emergency message..." : "Type a message..."}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button 
        className="btn-send" 
        onClick={submit}
        disabled={!text.trim()}
        style={{ background: isEmergency ? 'var(--danger)' : 'var(--signal)' }}
      >
        <ArrowUp size={18} />
      </button>
    </div>
  )
}
