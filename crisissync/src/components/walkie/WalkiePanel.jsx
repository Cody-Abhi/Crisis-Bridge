import { useState, useEffect } from 'react'
import { useWalkie }         from '../../hooks/useWalkie'
import PTTButton             from './PTTButton'
import SpeakingIndicator     from './SpeakingIndicator'
import ParticipantList       from './ParticipantList'
import ChannelTabs           from './ChannelTabs'
import DirectCallBanner      from './DirectCallBanner'

// Props (Admin):
//   hotelCode, activeSOS, staffList, currentUser, userProfile

export default function WalkiePanelAdmin({ hotelCode, activeSOS, staffList, currentUser, userProfile }) {
  const [isOpen,          setIsOpen]          = useState(true)
  const [activeChannelId, setActiveChannelId] = useState(`public_${hotelCode}`)
  const [directTarget,    setDirectTarget]    = useState(null)  // staff to direct-call
  const [channels,        setChannels]        = useState([])

  const {
    participants, isSpeaking, speakingUser, isConnected, isConnecting,
    micPermission, startPTT, stopPTT, joinChannel, leaveChannel, volume, setVolume,
  } = useWalkie(activeChannelId, currentUser, userProfile)

  // ── Build channel list from active SOS ──────────────────────────────
  useEffect(() => {
    const chs = [{ id: `public_${hotelCode}`, label: 'Public Hotel', hasActivity: false }]
    if (activeSOS) {
      Object.values(activeSOS).forEach(sos => {
        chs.push({
          id:          `incident_${sos.incidentId}`,
          label:       `Room ${sos.roomNumber} ${sos.emergencyType}`,
          hasActivity: !sos.assignedStaffId,
        })
      })
    }
    if (directTarget) {
      const dmId = [currentUser.uid, directTarget.uid].sort().join('_')
      chs.push({ id: `dm_${dmId}`, label: `Direct: ${directTarget.name}`, hasActivity: false })
    }
    setChannels(chs)
  }, [activeSOS, directTarget, hotelCode, currentUser.uid])

  // ── Auto-join public channel and any new incident channel ────────────
  useEffect(() => {
    joinChannel(activeChannelId)
    return () => leaveChannel()
  }, [activeChannelId])

  // ── Auto-join new incident channels as they appear ───────────────────
  useEffect(() => {
    if (!activeSOS) return
    // If admin is on public channel and new SOS appears, switch to incident
    // Only auto-switch if currently on public, not in middle of another incident
    const sosValues = Object.values(activeSOS)
    if (sosValues.length === 1 && activeChannelId === `public_${hotelCode}`) {
      const newIncidentId = `incident_${sosValues[0].incidentId}`
      setActiveChannelId(newIncidentId)
    }
  }, [activeSOS])

  const handleSwitchChannel = (chId) => {
    setActiveChannelId(chId)
  }

  const handleInitiateDirect = (staffMember) => {
    setDirectTarget(staffMember)
    const dmId = [currentUser.uid, staffMember.uid].sort().join('_')
    setActiveChannelId(`dm_${dmId}`)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-sm font-semibold text-orange-700 hover:bg-orange-100 transition"
      >
        <span>📻</span> Walkie-Talkie
        {Object.keys(participants).length > 0 && (
          <span className="ml-auto bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {Object.keys(participants).length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-cs-navy px-3 py-2 flex items-center justify-between drag-handle cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <span className="text-lg">📻</span>
          <div>
            <p className="text-white font-bold text-sm leading-none">Walkie-Talkie</p>
            <p className="text-slate-300 text-xs">
              {isConnecting ? 'Connecting...' : isConnected ? `${Object.keys(participants).length} in channel` : 'Ready'}
            </p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition text-lg no-drag select-none">−</button>
      </div>

      {/* Mic permission warning */}
      {micPermission === 'denied' && (
        <div className="bg-red-50 px-3 py-2 border-b border-red-200">
          <p className="text-red-700 text-xs font-semibold">🎤 Microphone blocked</p>
          <p className="text-red-500 text-xs">Enable mic in browser settings to use walkie-talkie</p>
        </div>
      )}

      <div className="p-3 space-y-3">
        {/* Channel tabs */}
        <ChannelTabs
          channels={channels}
          activeChannel={activeChannelId}
          onSwitch={handleSwitchChannel}
        />

        {/* Direct call banner */}
        {directTarget && (
          <DirectCallBanner
            targetStaff={directTarget}
            mode="initiate"
            onAccept={() => { /* already joined on tab click */ }}
            onDecline={() => {
              setDirectTarget(null)
              setActiveChannelId(`public_${hotelCode}`)
            }}
          />
        )}

        {/* Speaking indicator */}
        <SpeakingIndicator speakingUser={speakingUser} isSpeaking={isSpeaking} />

        {/* Participants */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">IN CHANNEL</p>
          <ParticipantList participants={participants} currentUserId={currentUser.uid} />
        </div>

        {/* Staff list with direct-call buttons */}
        {staffList && staffList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">DIRECT CALL</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {staffList
                .filter(s => s.staffProfile?.isOnDuty)
                .map(s => (
                  <div key={s.uid} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-700">{s.name}</span>
                    <button
                      onClick={() => handleInitiateDirect(s)}
                      className="text-orange-500 hover:text-orange-700 font-semibold transition"
                      title={`Direct call to ${s.name}`}
                    >
                      📞
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Volume control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">🔊</span>
          <input
            type="range" min="0" max="100" value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-slate-500 w-8 text-right">{volume}%</span>
        </div>

        {/* PTT Button */}
        <PTTButton
          startPTT={startPTT}
          stopPTT={stopPTT}
          isSpeaking={isSpeaking}
          disabled={micPermission === 'denied' || (!isConnected && !isConnecting)}
        />
      </div>
    </div>
  )
}
