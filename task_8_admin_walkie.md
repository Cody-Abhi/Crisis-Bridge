# TASK 8 — WALKIE-TALKIE: ADMIN PANEL
## Project: CrisisSync | Feature: Push-to-Talk Voice System — Admin Side
## Developer: Admin Developer
## Read EVERY section before writing code. The shared hook (useWalkie.js) must be built FIRST.

---

## WHAT YOU BUILD

1. **`src/hooks/useWalkie.js`** — the core WebRTC engine (shared by all 3 roles, you own it)
2. **`src/components/walkie/WalkiePanel.jsx`** — sidebar UI widget for admin
3. **`src/components/walkie/PTTButton.jsx`** — the push-to-talk button (shared)
4. **`src/components/walkie/ParticipantList.jsx`** — who is in channel (shared)
5. **`src/components/walkie/SpeakingIndicator.jsx`** — animated speaking display (shared)
6. **`src/components/walkie/ChannelTabs.jsx`** — Public / Incident / Direct tabs
7. **`src/components/walkie/DirectCallBanner.jsx`** — initiate/receive direct calls
8. **Modify `AdminDashboard.jsx`** — add WalkiePanel to sidebar

The Staff developer and Guest developer DEPEND on useWalkie.js, PTTButton.jsx, ParticipantList.jsx, and SpeakingIndicator.jsx. Build those FIRST before they start.

---

## FIREBASE RULES — ADD THIS FIRST

In Firebase Console → Realtime Database → Rules, add the `walkie` node:

```json
{
  "rules": {
    "sos":            { ".read": "auth != null", ".write": "auth != null" },
    "chats":          { ".read": "auth != null", ".write": "auth != null" },
    "staff_presence": { ".read": "auth != null", ".write": "auth != null" },
    "webrtc":         { ".read": "auth != null", ".write": "auth != null" },
    "walkie": {
      "$channelId": {
        ".read":  "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## FILE 1 — src/hooks/useWalkie.js (BUILD THIS FIRST — SHARED)

This hook manages the entire WebRTC mesh for any channel. Every peer-to-peer connection, ICE exchange, and PTT state lives here.

```js
// src/hooks/useWalkie.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { ref, set, onValue, off, remove, onDisconnect, update, push } from 'firebase/database'
import { rtdb } from '../firebase/config'
import Peer from 'simple-peer'

export const useWalkie = (channelId, currentUser, userProfile) => {
  const [participants,  setParticipants]  = useState({})  // { uid: { name, role, isSpeaking } }
  const [isSpeaking,   setIsSpeaking]    = useState(false)
  const [speakingUser, setSpeakingUser]  = useState(null)
  const [isConnected,  setIsConnected]   = useState(false)
  const [isConnecting, setIsConnecting]  = useState(false)
  const [micPermission,setMicPermission] = useState('prompt') // 'granted'|'denied'|'prompt'
  const [volume,       setVolume]        = useState(80)

  // Internal refs — don't trigger re-renders
  const localStreamRef  = useRef(null)   // MediaStream from getUserMedia
  const peersRef        = useRef({})     // { uid: Peer instance }
  const audioElementsRef = useRef({})    // { uid: HTMLAudioElement }
  const channelRef      = useRef(null)   // current channelId
  const joinedRef       = useRef(false)  // prevent double-join

  // ── 1. Request mic permission on hook mount ────────────────────────────
  useEffect(() => {
    const requestMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Immediately mute — only enable on PTT press
        stream.getAudioTracks()[0].enabled = false
        localStreamRef.current = stream
        setMicPermission('granted')
      } catch (err) {
        setMicPermission('denied')
        console.warn('Mic permission denied:', err.message)
      }
    }
    requestMic()

    // Cleanup local stream on unmount
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ── 2. Sync volume to all remote audio elements ────────────────────────
  useEffect(() => {
    Object.values(audioElementsRef.current).forEach(el => {
      el.volume = volume / 100
    })
  }, [volume])

  // ── 3. Helper: create RTCPeerConnection to one remote user ─────────────
  const createPeerTo = useCallback((remoteUid, isInitiator) => {
    if (!localStreamRef.current) return
    if (peersRef.current[remoteUid]) return // already connected

    const peer = new Peer({
      initiator: isInitiator,
      stream:    localStreamRef.current,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    })

    peer.on('signal', (signalData) => {
      const path = isInitiator
        ? `walkie/${channelRef.current}/offers/${currentUser.uid}_${remoteUid}`
        : `walkie/${channelRef.current}/answers/${currentUser.uid}_${remoteUid}`
      set(ref(rtdb, path), JSON.stringify(signalData))
    })

    peer.on('stream', (remoteStream) => {
      // Create hidden audio element to play remote audio
      if (!audioElementsRef.current[remoteUid]) {
        const audio = document.createElement('audio')
        audio.autoplay = true
        audio.volume   = volume / 100
        audio.srcObject = remoteStream
        document.body.appendChild(audio)
        audioElementsRef.current[remoteUid] = audio
      }
      setIsConnected(true)
      setIsConnecting(false)
    })

    peer.on('error', (err) => {
      console.error(`Peer error with ${remoteUid}:`, err.message)
      cleanupPeer(remoteUid)
    })

    peer.on('close', () => cleanupPeer(remoteUid))

    peersRef.current[remoteUid] = peer
  }, [currentUser, volume])

  // ── 4. Helper: cleanup one peer ────────────────────────────────────────
  const cleanupPeer = useCallback((remoteUid) => {
    try { peersRef.current[remoteUid]?.destroy() } catch {}
    delete peersRef.current[remoteUid]
    // Remove audio element
    const audio = audioElementsRef.current[remoteUid]
    if (audio) { audio.srcObject = null; audio.remove(); delete audioElementsRef.current[remoteUid] }
    setIsConnected(Object.keys(peersRef.current).length > 0)
  }, [])

  // ── 5. Join channel ────────────────────────────────────────────────────
  const joinChannel = useCallback(async (chId) => {
    if (joinedRef.current && channelRef.current === chId) return
    if (joinedRef.current) await leaveChannel()

    if (micPermission === 'denied') return
    if (!localStreamRef.current) return

    channelRef.current = chId
    joinedRef.current  = true
    setIsConnecting(true)

    const myParticipantRef = ref(rtdb, `walkie/${chId}/participants/${currentUser.uid}`)

    // Write self to participants
    await set(myParticipantRef, {
      joined:     true,
      name:       userProfile?.name || 'Unknown',
      role:       userProfile?.role || 'guest',
      isSpeaking: false,
      joinedAt:   Date.now(),
    })

    // Auto-remove self on disconnect
    onDisconnect(myParticipantRef).remove()

    // ── Listen to participants ──────────────────────────────────────────
    const participantsRef = ref(rtdb, `walkie/${chId}/participants`)
    onValue(participantsRef, (snap) => {
      const data = snap.val() || {}
      setParticipants(data)

      // Find who is speaking
      const speaker = Object.entries(data).find(([uid, p]) => p.isSpeaking && uid !== currentUser.uid)
      setSpeakingUser(speaker ? speaker[1].name : null)

      // Create peer to anyone new who joined after us (we are NOT initiator)
      Object.entries(data).forEach(([uid, pData]) => {
        if (uid === currentUser.uid) return
        if (!peersRef.current[uid] && pData.joined) {
          createPeerTo(uid, false) // they will initiate to us
        }
      })

      // Cleanup peers for anyone who left
      Object.keys(peersRef.current).forEach(uid => {
        if (!data[uid]) cleanupPeer(uid)
      })
    })

    // ── Listen for offers (someone wants to connect to us) ─────────────
    const offersRef = ref(rtdb, `walkie/${chId}/offers`)
    onValue(offersRef, (snap) => {
      const offers = snap.val() || {}
      Object.entries(offers).forEach(([key, sdpStr]) => {
        const [offererId, receiverId] = key.split('_')
        if (receiverId !== currentUser.uid) return
        if (peersRef.current[offererId]) {
          try { peersRef.current[offererId].signal(JSON.parse(sdpStr)) } catch {}
        } else {
          // Create peer as non-initiator and apply offer
          createPeerTo(offererId, false)
          setTimeout(() => {
            try { peersRef.current[offererId]?.signal(JSON.parse(sdpStr)) } catch {}
          }, 200)
        }
      })
    })

    // ── Listen for answers (our offer was answered) ─────────────────────
    const answersRef = ref(rtdb, `walkie/${chId}/answers`)
    onValue(answersRef, (snap) => {
      const answers = snap.val() || {}
      Object.entries(answers).forEach(([key, sdpStr]) => {
        const [offererId, receiverId] = key.split('_')
        if (offererId !== currentUser.uid) return
        try { peersRef.current[receiverId]?.signal(JSON.parse(sdpStr)) } catch {}
      })
    })

    // ── Listen for ICE candidates ───────────────────────────────────────
    const iceRef = ref(rtdb, `walkie/${chId}/ice`)
    onValue(iceRef, (snap) => {
      const ice = snap.val() || {}
      Object.entries(ice).forEach(([key, candidates]) => {
        const [senderId, receiverId] = key.split('_')
        if (receiverId !== currentUser.uid) return
        Object.values(candidates).forEach(c => {
          try { peersRef.current[senderId]?.signal({ candidate: c }) } catch {}
        })
      })
    })

    // ── Initiate connections to existing participants ────────────────────
    // Get snapshot of who is already there and be the initiator to them
    const existingSnap = await new Promise(res => {
      const r = ref(rtdb, `walkie/${chId}/participants`)
      onValue(r, s => { res(s); off(r) }, { onlyOnce: true })
    })
    const existing = existingSnap.val() || {}
    Object.entries(existing).forEach(([uid]) => {
      if (uid === currentUser.uid) return
      createPeerTo(uid, true) // WE initiate to people already there
    })

  }, [currentUser, userProfile, micPermission, createPeerTo, cleanupPeer])

  // ── 6. Leave channel ───────────────────────────────────────────────────
  const leaveChannel = useCallback(async () => {
    if (!channelRef.current) return

    // Cleanup all peers
    Object.keys(peersRef.current).forEach(uid => cleanupPeer(uid))

    // Remove self from Firebase participants
    await remove(ref(rtdb, `walkie/${channelRef.current}/participants/${currentUser.uid}`))

    // Turn off all listeners
    off(ref(rtdb, `walkie/${channelRef.current}/participants`))
    off(ref(rtdb, `walkie/${channelRef.current}/offers`))
    off(ref(rtdb, `walkie/${channelRef.current}/answers`))
    off(ref(rtdb, `walkie/${channelRef.current}/ice`))

    channelRef.current = null
    joinedRef.current  = false
    setParticipants({})
    setIsConnected(false)
    setIsConnecting(false)
    setIsSpeaking(false)
    setSpeakingUser(null)
  }, [currentUser, cleanupPeer])

  // ── 7. PTT controls ────────────────────────────────────────────────────
  const startPTT = useCallback(async () => {
    if (!localStreamRef.current || !channelRef.current) return
    localStreamRef.current.getAudioTracks()[0].enabled = true
    setIsSpeaking(true)
    await update(ref(rtdb, `walkie/${channelRef.current}/participants/${currentUser.uid}`), { isSpeaking: true })
  }, [currentUser])

  const stopPTT = useCallback(async () => {
    if (!localStreamRef.current || !channelRef.current) return
    localStreamRef.current.getAudioTracks()[0].enabled = false
    setIsSpeaking(false)
    await update(ref(rtdb, `walkie/${channelRef.current}/participants/${currentUser.uid}`), { isSpeaking: false })
  }, [currentUser])

  return {
    participants, isSpeaking, speakingUser, isConnected, isConnecting,
    micPermission, startPTT, stopPTT, joinChannel, leaveChannel, volume, setVolume,
  }
}
```

---

## FILE 2 — src/components/walkie/PTTButton.jsx (SHARED — build this second)

```jsx
// Props: startPTT, stopPTT, isSpeaking, disabled, size ('large'|'normal')
import { useState } from 'react'

export default function PTTButton({ startPTT, stopPTT, isSpeaking, disabled, size = 'normal' }) {
  const [pressing, setPressing] = useState(false)

  const handleStart = async (e) => {
    e.preventDefault()
    if (disabled) return
    setPressing(true)
    await startPTT()
  }

  const handleEnd = async (e) => {
    e.preventDefault()
    if (!pressing) return
    setPressing(false)
    await stopPTT()
  }

  const isLarge = size === 'large'

  return (
    <button
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      onMouseUp={handleEnd}
      onTouchEnd={handleEnd}
      onMouseLeave={handleEnd}
      disabled={disabled}
      className={`
        select-none transition-all duration-150 font-bold
        flex flex-col items-center justify-center gap-1
        ${isLarge ? 'w-full py-8 rounded-2xl text-xl' : 'w-full py-4 rounded-xl text-sm'}
        ${disabled
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
          : pressing || isSpeaking
            ? 'bg-red-600 text-white shadow-lg shadow-red-500/50 scale-[0.98] ring-4 ring-red-400 ring-offset-2 animate-pulse'
            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md active:scale-[0.97]'
        }
      `}
    >
      <span className={isLarge ? 'text-4xl' : 'text-2xl'}>🎙</span>
      <span>{pressing || isSpeaking ? 'TRANSMITTING...' : 'HOLD TO TALK'}</span>
      {disabled && <span className="text-xs font-normal opacity-70">Mic unavailable</span>}
    </button>
  )
}
```

---

## FILE 3 — src/components/walkie/SpeakingIndicator.jsx (SHARED)

```jsx
// Props: speakingUser (string | null), isSpeaking (boolean — am I speaking?)
export default function SpeakingIndicator({ speakingUser, isSpeaking }) {
  if (!speakingUser && !isSpeaking) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-lg">
        <div className="w-2 h-2 bg-slate-300 rounded-full" />
        <span className="text-slate-400 text-xs">Channel quiet</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-green-50 border border-green-200 rounded-lg">
      {/* Animated sound bars */}
      <div className="flex items-end gap-0.5 h-4">
        {[3, 5, 4, 6, 3].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-green-500 rounded-full animate-bounce"
            style={{ height: `${h * 2}px`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <span className="text-green-700 text-xs font-semibold">
        {isSpeaking ? 'You are speaking' : `${speakingUser} is speaking`}
      </span>
    </div>
  )
}
```

---

## FILE 4 — src/components/walkie/ParticipantList.jsx (SHARED)

```jsx
// Props: participants object { uid: { name, role, isSpeaking } }, currentUserId
export default function ParticipantList({ participants, currentUserId }) {
  const list = Object.entries(participants)
  if (list.length === 0) {
    return <p className="text-slate-400 text-xs italic py-1">No one in channel</p>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map(([uid, p]) => (
        <div
          key={uid}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
            p.isSpeaking
              ? 'bg-green-100 border-green-400 text-green-800'
              : uid === currentUserId
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-slate-100 border-slate-300 text-slate-600'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${p.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
          {p.name}{uid === currentUserId ? ' (You)' : ''}
        </div>
      ))}
    </div>
  )
}
```

---

## FILE 5 — src/components/walkie/ChannelTabs.jsx

```jsx
// Props: channels [{id, label, hasActivity}], activeChannel, onSwitch
export default function ChannelTabs({ channels, activeChannel, onSwitch }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {channels.map(ch => (
        <button
          key={ch.id}
          onClick={() => onSwitch(ch.id)}
          className={`relative text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            activeChannel === ch.id
              ? 'bg-cs-navy text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {ch.label}
          {ch.hasActivity && activeChannel !== ch.id && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      ))}
    </div>
  )
}
```

---

## FILE 6 — src/components/walkie/DirectCallBanner.jsx

```jsx
// Props: targetStaff { uid, name, designation }, onInitiate, onDismiss
// Used two ways:
//   1. Admin initiates: shows "Start direct call with Raj Kumar?" + [Call] [Cancel]
//   2. Staff receives: shows "Admin wants to speak privately" + [Accept] [Decline]

export default function DirectCallBanner({ targetStaff, mode, onAccept, onDecline }) {
  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">📻</span>
        <div>
          <p className="font-bold text-amber-800 text-sm">
            {mode === 'initiate'
              ? `Direct call to ${targetStaff?.name}`
              : 'Admin wants to speak privately'
            }
          </p>
          <p className="text-amber-600 text-xs">{targetStaff?.designation || ''}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs py-2 rounded-lg font-bold transition"
        >
          {mode === 'initiate' ? '📞 Start Call' : '✅ Accept'}
        </button>
        <button
          onClick={onDecline}
          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs py-2 rounded-lg font-semibold transition"
        >
          {mode === 'initiate' ? '✕ Cancel' : '❌ Decline'}
        </button>
      </div>
    </div>
  )
}
```

---

## FILE 7 — src/components/walkie/WalkiePanel.jsx

```jsx
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
      <div className="bg-cs-navy px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📻</span>
          <div>
            <p className="text-white font-bold text-sm leading-none">Walkie-Talkie</p>
            <p className="text-slate-300 text-xs">
              {isConnecting ? 'Connecting...' : isConnected ? `${Object.keys(participants).length} in channel` : 'Ready'}
            </p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition text-lg">−</button>
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
```

---

## MODIFY AdminDashboard.jsx

### Add import:
```jsx
import WalkiePanelAdmin from '../../components/walkie/WalkiePanel'
```

### Add activeWalkieChannel state:
```jsx
const [activeWalkieChannel, setActiveWalkieChannel] = useState(`public_${userProfile?.adminProfile?.hotelCode}`)
```

### Add to sidebar JSX (above AI chatbot):
```jsx
{/* Walkie-Talkie Panel */}
{hotel && (
  <div className="mb-4">
    <WalkiePanelAdmin
      hotelCode={hotel.hotelCode}
      activeSOS={activeSOS}
      staffList={staffList}
      currentUser={currentUser}
      userProfile={userProfile}
    />
  </div>
)}
```

---

## DONE CHECKLIST — ADMIN TASK

- [ ] Firebase Realtime DB `walkie` rules added and published
- [ ] `src/hooks/useWalkie.js` created with full WebRTC mesh logic
- [ ] `PTTButton.jsx` created — orange normal, red pulsing when transmitting
- [ ] `SpeakingIndicator.jsx` created — animated sound bars + speaker name
- [ ] `ParticipantList.jsx` created — green highlight on speaking user
- [ ] `ChannelTabs.jsx` created — red dot badge on channels with activity
- [ ] `DirectCallBanner.jsx` created — initiate + receive modes
- [ ] `WalkiePanel.jsx` (Admin) created with all channel logic
- [ ] Admin auto-joins public channel on dashboard load
- [ ] Admin auto-switches to incident channel when first SOS appears
- [ ] Direct call: 📞 icon next to on-duty staff → opens direct channel
- [ ] Mic permission denied warning shown in panel
- [ ] Volume slider works — adjusts all remote audio elements
- [ ] PTT button hold → transmits → release → mute (test with another browser tab)
- [ ] `AdminDashboard.jsx` updated — WalkiePanel in sidebar above AI chatbot
- [ ] Shared files (PTTButton, SpeakingIndicator, ParticipantList) confirmed working before Staff dev starts

---

## DO NOT TOUCH
- Guest pages and Staff pages — those are separate tasks
- AuthContext.jsx
- Any SOS or chat logic
