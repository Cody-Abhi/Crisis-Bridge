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
