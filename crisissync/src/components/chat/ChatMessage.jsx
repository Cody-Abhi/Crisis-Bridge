// src/components/chat/ChatMessage.jsx
import { useMemo } from 'react'

export default function ChatMessage({ message, isOwn, isGrouped }) {
  const { senderName, senderRole, message: text, timestamp, type, isAnnouncement, announcement } = message
  
  const time = useMemo(() => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }, [timestamp])

  if (type === 'system_message' || type === 'system') {
    return (
      <div className="msg-system">
        <span className="msg-system-text">{text || message.message}</span>
      </div>
    )
  }

  if (isAnnouncement) {
    return (
      <div className="admin-announcement">
        <div className="msg-sender">
          <span className="msg-chip admin">{senderName || 'ADMIN'}</span>
        </div>
        <div className="announcement-body" style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>
          {announcement || text || message.message}
        </div>
        <div className="msg-time">{time}</div>
      </div>
    )
  }

  // Determine bubble and chip types
  const role = senderRole?.toLowerCase() || 'general'
  const isStaff = ['staff', 'fire_safety', 'medical', 'security', 'general'].includes(role)
  
  const bubbleType = role === 'admin' ? 'admin' : isOwn ? 'staff' : 'guest'
  const chipType = role === 'admin' ? 'admin' : isStaff ? 'staff' : 'guest'
  
  // Dot color logic
  const dotColor = role === 'admin' ? 'var(--void-purple)' : isStaff ? 'var(--signal)' : 'var(--caution)'

  return (
    <div className={`msg-row ${isOwn ? 'right' : 'left'} ${isGrouped ? 'grouped' : ''}`}>
      {!isGrouped && (
        <div className="msg-sender">
          {!isOwn && <span className="msg-avatar-dot" style={{ background: dotColor }} />}
          <span className={`msg-chip ${chipType}`}>
            {senderName} {isOwn ? '(YOU)' : ''}
          </span>
          {isOwn && <span className="msg-avatar-dot" style={{ background: dotColor }} />}
        </div>
      )}
      <div className={`msg-bubble ${bubbleType}`}>
        {text || message.message}
        <div className="msg-time">{time}</div>
      </div>
    </div>
  )
}
