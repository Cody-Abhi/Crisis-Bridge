import { useEffect, useState } from 'react'
import { getEmergency } from '../../utils/emergencyHelpers'

export default function SOSPopup({ sosData, onAccept, onDecline }) {
  const [countdown, setCountdown] = useState(45)
  const circumference = 2 * Math.PI * 26 // radius 26 for 60px SVG
  const emergency = getEmergency(sosData?.emergencyType)

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(id)
          onDecline()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [onDecline])

  // Play alert sound (browser beep)
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const beep = (freq, start, duration) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + duration)
      }
      beep(880, 0, 0.15)
      beep(660, 0.2, 0.15)
      beep(880, 0.4, 0.3)
    } catch (e) {}
  }, [])

  if (!sosData) return null

  const progress = ((45 - countdown) / 45) * circumference

  return (
    <div className="sos-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onDecline(); }}>
      <div className={`sos-modal stitch-border-danger`}>
        <div className="sos-accent-bar" />
        <div className="sos-content">
          <div className="sos-top-row">
            <span className="sos-label">🚨 INCOMING EMERGENCY</span>
            <span className="sos-pulse-dot" />
          </div>

          <div className="sos-type">{emergency.label?.toUpperCase()}</div>
          <div className="sos-subtext">Immediate intervention required</div>
          <div className="sos-divider" />

          <div className="sos-info-grid">
            <div className="sos-info-item">
              <span className="label">📍 ROOM</span>
              <div className="value">{sosData.roomNumber}</div>
            </div>
            <div className="sos-info-item">
              <span className="label">🏢 FLOOR</span>
              <div className="value small">{sosData.floor} Floor</div>
            </div>
            <div className="sos-info-item">
              <span className="label">👤 GUEST</span>
              <div className="value body">{sosData.guestName || 'GUEST'}</div>
            </div>
            <div className="sos-info-item">
              <span className="label">📞 PHONE</span>
              <div className="value phone">
                <a href={`tel:${sosData.guestPhone}`}>{sosData.guestPhone || 'N/A'}</a>
              </div>
            </div>
          </div>

          <div className="countdown-row">
            <div>
              <div className="countdown-label">AUTO-ESCALATING IN</div>
            </div>
            <div className="countdown-ring">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle className="ring-bg" cx="30" cy="30" r="26" />
                <circle
                  className="ring-progress"
                  cx="30" cy="30" r="26"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                />
              </svg>
              <div className="countdown-number">{countdown}</div>
            </div>
          </div>

          <div className="sos-actions">
            <button className="btn-sos-accept" onClick={() => onAccept(sosData)}>
              ACCEPT EMERGENCY
            </button>
            <button className="btn-sos-decline" onClick={onDecline}>
              DECLINE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

