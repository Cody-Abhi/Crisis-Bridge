import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { db, rtdb } from '../../firebase/config'
import {
  doc, getDoc, updateDoc, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove,
  collection, query, where, getDocs
} from 'firebase/firestore'
import {
  ref, set, onValue, off, update, push, remove, onDisconnect
} from 'firebase/database'
import { getEmergency } from '../../utils/emergencyHelpers'
import { timeAgo } from '../../utils/timeHelpers'
import StaffSidebar from '../../components/staff/StaffSidebar'
import SOSPopup from '../../components/staff/SOSPopup'
import ChatWindow from '../../components/chat/ChatWindow'
import toast from 'react-hot-toast'

/* ── Tab names from crisis-bridge prototype ── */
const TAB_EMOJIS = ['🏨', '🚨', '💬', '📡', '📋']
const TAB_IDS    = ['grid', 'incident', 'chat', 'group', 'history']

export default function StaffDashboard() {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────────────
  const [hotel,        setHotel]        = useState(null)
  const [activeSOS,    setActiveSOS]    = useState({})
  const [myIncident,   setMyIncident]   = useState(null)
  const [newSOSAlert,  setNewSOSAlert]  = useState(null)
  const [isOnDuty,     setIsOnDuty]     = useState(false)
  const [activeTab,    setActiveTab]    = useState('grid')
  const [clock,        setClock]        = useState('')
  const [assignmentStep, setAssignmentStep] = useState(1) // 1=assigned, 2=arrived, 3=resolved
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [resolveNotes, setResolveNotes] = useState('')
  const [triggeredSeconds, setTriggeredSeconds] = useState(0)
  const [expandedHistory, setExpandedHistory] = useState(null)
  const [historyFilter, setHistoryFilter] = useState({ type: 'all', status: 'all' })
  const [incidentHistory, setIncidentHistory] = useState([])
  const [toast_msg, setToastMsg] = useState(null)

  const isOnDutyRef = useRef(isOnDuty)
  isOnDutyRef.current = isOnDuty

  // ── Live clock ────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('en-GB', { hour12: false }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Timer for triggered assignment ────────────────────────────────────
  useEffect(() => {
    if (myIncident && assignmentStep < 3) {
      const id = setInterval(() => setTriggeredSeconds(s => s + 1), 1000)
      return () => clearInterval(id)
    }
  }, [myIncident, assignmentStep])

  // ── Toast auto-dismiss ────────────────────────────────────────────────
  useEffect(() => {
    if (toast_msg) {
      const id = setTimeout(() => setToastMsg(null), 3000)
      return () => clearTimeout(id)
    }
  }, [toast_msg])

  // ── Helper: does this SOS match my designation? ────────────────────────
  const isSOSForMe = useCallback((emergencyType, designation) => {
    if (emergencyType === 'common') return true
    if (emergencyType === 'fire'     && designation === 'fire_safety') return true
    if (emergencyType === 'medical'  && designation === 'medical')     return true
    if (emergencyType === 'security' && designation === 'security')    return true
    return false
  }, [])

  // ── Main Firebase setup ───────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.staffProfile || !currentUser) return

    const { hotelCode, designation, isOnDuty: savedDuty } = userProfile.staffProfile
    setIsOnDuty(savedDuty || false)

    // 1. Fetch hotel config (room layout)
    const fetchHotel = async () => {
      try {
        const snap = await getDoc(doc(db, 'hotels', hotelCode))
        if (snap.exists()) setHotel(snap.data())
      } catch (err) {
        console.error('Hotel fetch error:', err)
      }
    }
    fetchHotel()

    // 2. Set presence in Realtime DB
    const presenceRef = ref(rtdb, `staff_presence/${hotelCode}/${currentUser.uid}`)
    set(presenceRef, {
      staffId:         currentUser.uid,
      name:            userProfile.name,
      designation,
      isOnline:        true,
      isOnDuty:        savedDuty || false,
      lastSeen:        Date.now(),
      currentIncident: null,
    })
    onDisconnect(presenceRef).update({ isOnline: false, lastSeen: Date.now() })

    // 3. Listen to all SOS signals for this hotel
    const sosRef = ref(rtdb, `sos/${hotelCode}`)
    onValue(sosRef, (snapshot) => {
      const data = snapshot.val() || {}
      setActiveSOS(data)

      // Check for NEW unassigned SOS matching my designation
      Object.values(data).forEach(sos => {
        if (
          sos.status === 'active' &&
          !sos.assignedStaffId &&
          isSOSForMe(sos.emergencyType, designation) &&
          isOnDutyRef.current
        ) {
          setNewSOSAlert(prev => {
            // Don't show if we already have a popup (same incident)
            if (prev?.roomNumber === sos.roomNumber) return prev
            return sos
          })
        }
      })

      // Track my own assigned incident
      const mine = Object.values(data).find(s => s.assignedStaffId === currentUser.uid)
      if (mine) {
        setMyIncident(mine)
        setAssignmentStep(mine.status === 'arrived' ? 2 : 1)
      } else {
        // Cleared from RTDB (resolved)
        setMyIncident(prev => {
          if (prev) setAssignmentStep(3)
          return null
        })
      }
    })

    // 4. Fetch incident history from Firestore
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'incidents'),
          where('response.resolvedBy', '==', currentUser.uid)
        )
        const snap = await getDocs(q)
        setIncidentHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.warn('History fetch error:', err)
      }
    }
    fetchHistory()

    return () => off(sosRef)
  }, [userProfile, currentUser, isSOSForMe])

  // ── Toggle duty ───────────────────────────────────────────────────────
  const toggleDuty = async (newDutyState) => {
    if (!userProfile?.staffProfile) return
    const hotelCode = userProfile.staffProfile.hotelCode
    setIsOnDuty(newDutyState)
    try {
      const presenceRef = ref(rtdb, `staff_presence/${hotelCode}/${currentUser.uid}`)
      await update(presenceRef, { isOnDuty: newDutyState })
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'staffProfile.isOnDuty': newDutyState,
      })
      toast.success(newDutyState ? 'You are now On Duty' : 'You are now Off Duty')
    } catch (err) {
      toast.error('Failed to update duty status')
    }
  }

  // ── Accept SOS ─────────────────────────────────────────────────────────
  const acceptSOS = async (sosData) => {
    const hotelCode = userProfile.staffProfile.hotelCode
    setNewSOSAlert(null)
    try {
      const sosRef = ref(rtdb, `sos/${hotelCode}/${sosData.roomNumber}`)
      await update(sosRef, {
        status:               'assigned',
        assignedStaffId:      currentUser.uid,
        assignedStaffName:    userProfile.name,
        assignedDesignation:  userProfile.staffProfile.designation,
        acceptedAt:           Date.now(),
      })
      if (sosData.incidentId) {
        await updateDoc(doc(db, 'incidents', sosData.incidentId), {
          'response.assignedStaffId':     currentUser.uid,
          'response.assignedStaffName':   userProfile.name,
          'response.acceptedAt':          serverTimestamp(),
          status:                         'assigned',
          timeline: arrayUnion({
            event:     'STAFF_ACCEPTED',
            timestamp: Date.now(),
            actor:     currentUser.uid,
            actorName: userProfile.name,
          }),
        })
        await updateDoc(doc(db, 'users', currentUser.uid), {
          'staffProfile.activeIncidents': arrayUnion(sosData.incidentId),
        })
        const presenceRef = ref(rtdb, `staff_presence/${hotelCode}/${currentUser.uid}`)
        await update(presenceRef, { currentIncident: sosData.incidentId })

        const chatRef = ref(rtdb, `chats/${sosData.incidentId}`)
        const sysMsg = push(chatRef)
        await set(sysMsg, {
          messageId: sysMsg.key,
          type:      'system_message',
          message:   `${userProfile.name} has accepted this emergency and is on the way.`,
          timestamp: Date.now(),
        })
      }
      setMyIncident({ ...sosData, status: 'assigned' })
      setAssignmentStep(1)
      setTriggeredSeconds(0)
      setActiveTab('incident')
      toast.success(`Responding to Room ${sosData.roomNumber}`)
    } catch (err) {
      console.error('Accept SOS error:', err)
      toast.error('Failed to accept. Try again.')
    }
  }

  // ── Mark Arrived ──────────────────────────────────────────────────────
  const markArrived = async () => {
    if (!myIncident) return
    const hotelCode = userProfile.staffProfile.hotelCode
    try {
      const sosRef = ref(rtdb, `sos/${hotelCode}/${myIncident.roomNumber}`)
      await update(sosRef, { status: 'arrived', arrivedAt: Date.now() })
      if (myIncident.incidentId) {
        await updateDoc(doc(db, 'incidents', myIncident.incidentId), {
          'response.arrivedAt': serverTimestamp(),
          timeline: arrayUnion({
            event:     'STAFF_ARRIVED',
            timestamp: Date.now(),
            actor:     currentUser.uid,
          }),
        })
        const chatRef = ref(rtdb, `chats/${myIncident.incidentId}`)
        const msg = push(chatRef)
        await set(msg, {
          messageId: msg.key,
          type:      'system_message',
          message:   `${userProfile.name} has arrived at Room ${myIncident.roomNumber}.`,
          timestamp: Date.now(),
        })
      }
      setAssignmentStep(2)
      toast.success('Marked as arrived. Guest has been notified.')
    } catch (err) {
      toast.error('Failed to mark arrived')
    }
  }

  // ── Resolve Incident ──────────────────────────────────────────────────
  const resolveIncident = async () => {
    if (!myIncident || !resolveNotes.trim()) return
    const hotelCode = userProfile.staffProfile.hotelCode
    try {
      const sosRef = ref(rtdb, `sos/${hotelCode}/${myIncident.roomNumber}`)
      await remove(sosRef)
      if (myIncident.incidentId) {
        await updateDoc(doc(db, 'incidents', myIncident.incidentId), {
          'response.resolvedAt':      serverTimestamp(),
          'response.resolutionNotes': resolveNotes,
          'response.resolvedBy':      currentUser.uid,
          status:                     'resolved',
          timeline: arrayUnion({
            event:     'RESOLVED',
            timestamp: Date.now(),
            actor:     currentUser.uid,
          }),
        })
        await updateDoc(doc(db, 'users', currentUser.uid), {
          'staffProfile.activeIncidents': arrayRemove(myIncident.incidentId),
        })
        const presenceRef = ref(rtdb, `staff_presence/${hotelCode}/${currentUser.uid}`)
        await update(presenceRef, { currentIncident: null })
        const chatRef = ref(rtdb, `chats/${myIncident.incidentId}`)
        const msg = push(chatRef)
        await set(msg, {
          messageId: msg.key,
          type:      'system_message',
          message:   `Emergency resolved by ${userProfile.name}. ${resolveNotes}`,
          timestamp: Date.now(),
        })
      }
      setAssignmentStep(3)
      setShowResolveForm(false)
      toast.success('Emergency resolved and recorded!')
    } catch (err) {
      console.error('Resolve error:', err)
      toast.error('Failed to resolve. Try again.')
    }
  }

  const formatTriggeredTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s.toString().padStart(2, '0')}s ago`
  }

  // ── Rooms from hotel config ────────────────────────────────────────────
  const floors = hotel?.floors || []

  // ── Room type from activeSOS ───────────────────────────────────────────
  const getRoomType = (room) => {
    const key = String(room)
    if (activeSOS[key]) return activeSOS[key].emergencyType || 'normal'
    return 'normal'
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <StaffSidebar
        isOnDuty={isOnDuty}
        onToggleDuty={toggleDuty}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ── Main Area ── */}
      <main className="main-area">
        <div className="header-bar">
          <h1 className="header-title">
            {{ grid: 'Room Grid', incident: 'My Assignment', chat: 'Incident Chat', group: 'Group Chat', history: 'My History' }[activeTab]}
          </h1>
          <span className="header-clock">{clock}</span>
          <div className="header-right">
            <span className={`status-dot ${isOnDuty ? 'on' : 'off'}`} />
          </div>
        </div>

        <div className="content-area">
          <div className="tab-content" key={activeTab}>
            {activeTab === 'grid' && (
              <RoomGridTab floors={floors} activeSOS={activeSOS} getRoomType={getRoomType} />
            )}
            {activeTab === 'incident' && (
              <MyAssignmentTab
                myIncident={myIncident}
                step={assignmentStep}
                triggeredSeconds={triggeredSeconds}
                formatTime={formatTriggeredTime}
                onMarkArrived={markArrived}
                showResolveForm={showResolveForm}
                setShowResolveForm={setShowResolveForm}
                resolveNotes={resolveNotes}
                setResolveNotes={setResolveNotes}
                onResolve={resolveIncident}
              />
            )}
            {activeTab === 'chat' && myIncident?.incidentId && (
              <ChatWindow
                channelId={myIncident.incidentId}
                currentUser={currentUser}
                userProfile={userProfile}
                title={`INCIDENT CHANNEL — ROOM ${myIncident.roomNumber} 🔥`}
                isReadOnly={false}
              />
            )}
            {activeTab === 'chat' && !myIncident?.incidentId && (
              <div className="no-assignment">
                <div className="shield-icon">💬</div>
                <h3>NO ACTIVE INCIDENT</h3>
                <p>Accept an emergency to join the incident chat</p>
              </div>
            )}
            {activeTab === 'group' && (
              <ChatWindow
                channelId={`staff_${userProfile?.staffProfile?.hotelCode}`}
                currentUser={currentUser}
                userProfile={userProfile}
                title={`STAFF CHANNEL — ${userProfile?.staffProfile?.hotelName || 'HOTEL'} 📡`}
                isReadOnly={false}
              />
            )}
            {activeTab === 'history' && (
              <IncidentHistoryTab
                history={incidentHistory}
                filter={historyFilter}
                setFilter={setHistoryFilter}
                expanded={expandedHistory}
                setExpanded={setExpandedHistory}
              />
            )}
          </div>
        </div>
      </main>

      {/* ── SOS Popup ── */}
      {newSOSAlert && isOnDuty && (
        <SOSPopup
          sosData={newSOSAlert}
          onAccept={acceptSOS}
          onDecline={() => setNewSOSAlert(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast_msg && <div className="toast">{toast_msg}</div>}
    </div>
  )
}


// ════════════════════════════════════════
// ROOM GRID TAB
// ════════════════════════════════════════
function RoomGridTab({ floors, activeSOS, getRoomType }) {
  const [hover, setHover] = useState(null)

  const getTooltip = (room) => {
    const key = String(room)
    const sos = activeSOS[key]
    if (sos) {
      const minutesAgo = sos.triggeredAt
        ? Math.floor((Date.now() - sos.triggeredAt) / 60000)
        : '?'
      return `Room ${room} — ${(sos.emergencyType || 'SOS').toUpperCase()} — ${minutesAgo}m ago`
    }
    return `Room ${room} — Available`
  }

  if (!floors.length) {
    return (
      <div>
        <div className="section-header">
          <h2 className="section-title">LIVE HOTEL GRID</h2>
          <span className="section-subtitle">Loading hotel layout...</span>
        </div>
        <div className="no-assignment" style={{ height: '40vh' }}>
          <div style={{ fontSize: 40 }}>🏨</div>
          <h3>LOADING HOTEL DATA</h3>
          <p>Fetching room configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">LIVE HOTEL GRID</h2>
        <span className="section-subtitle">Last updated: just now</span>
      </div>

      {floors.map((f) => (
        <div className="floor-section" key={f.floor}>
          <div className="floor-label">
            <span className="floor-text">
              FLOOR <span className="floor-num">{f.floor}</span>
            </span>
            <div className="floor-line" />
          </div>
          <div className="rooms-grid">
            {(f.rooms || []).map((room) => {
              const type = getRoomType(room)
              return (
                <div
                  key={room}
                  className={`room-block ${type}`}
                  onMouseEnter={() => setHover(room)}
                  onMouseLeave={() => setHover(null)}
                >
                  {room}
                  {hover === room && (
                    <div className="room-tooltip">{getTooltip(room)}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="room-legend">
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#DC2626' }} />FIRE
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#16A34A' }} />MEDICAL
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#F59E0B' }} />SECURITY
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#7C3AED' }} />COMMON
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#141B26', border: '1px solid #1E2D40' }} />AVAILABLE
        </div>
      </div>
    </div>
  )
}


// ════════════════════════════════════════
// MY ASSIGNMENT TAB
// ════════════════════════════════════════
function MyAssignmentTab({ myIncident, step, triggeredSeconds, formatTime, onMarkArrived, showResolveForm, setShowResolveForm, resolveNotes, setResolveNotes, onResolve }) {
  if (!myIncident && step !== 3) {
    return (
      <div className="no-assignment">
        <div className="shield-icon">🛡️</div>
        <h3>NO ACTIVE ASSIGNMENT</h3>
        <p>Stay on duty to receive emergency alerts</p>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div>
        <div className="resolved-banner">
          <h2>✅ EMERGENCY RESOLVED</h2>
          <p>Room resolved successfully</p>
        </div>
        <div className="timeline stitch-border" style={{ marginTop: 20 }}>
          {['SOS TRIGGERED', 'ASSIGNED', 'ARRIVED', 'RESOLVED'].map((label, i) => (
            <TimelineItem key={i} label={label} state="resolved" isLast={i === 3} />
          ))}
        </div>
      </div>
    )
  }

  const emergency = getEmergency(myIncident?.emergencyType)
  const steps = ['SOS TRIGGERED', 'ASSIGNED', 'ARRIVED', 'RESOLVED']

  return (
    <div>
      <div className={`assignment-banner ${myIncident.emergencyType || 'fire'}`}>
        <h2>{emergency.icon} {emergency.label?.toUpperCase()}</h2>
      </div>

      <div className="assignment-info stitch-border">
        <div className="room-display">
          <span className="label">ROOM</span>
          <div className="room-number-big">{myIncident.roomNumber}</div>
          <span className="room-floor">FLOOR {myIncident.floor || '—'}</span>
        </div>
        <div>
          <div className="info-detail">
            <span className="label">GUEST</span>
            <div className="value">{myIncident.guestName || 'Unknown'}</div>
          </div>
          <div className="info-detail">
            <span className="label">PHONE</span>
            <div className="value mono">{myIncident.guestPhone || 'N/A'}</div>
          </div>
          <div className="info-detail">
            <span className="label">TRIGGERED</span>
            <div className="value mono">{formatTime(triggeredSeconds)}</div>
          </div>
          <div className="status-chip signal" style={{ marginTop: 8 }}>ASSIGNED TO YOU</div>
        </div>
      </div>

      <div className="timeline stitch-border">
        {steps.map((label, i) => {
          let state = 'pending'
          if (i <= step) state = 'completed'
          return <TimelineItem key={i} label={label} state={state} isLast={i === 3} />
        })}
      </div>

      <div style={{ padding: '0 4px' }}>
        {step === 1 && (
          <button className="btn-action signal-outline" onClick={onMarkArrived}>
            MARK ARRIVED
          </button>
        )}
        {step === 2 && !showResolveForm && (
          <button className="btn-action danger-solid" onClick={() => setShowResolveForm(true)}>
            RESOLVE EMERGENCY
          </button>
        )}
        {showResolveForm && (
          <div className="resolve-form">
            <textarea
              className="stitch-border"
              placeholder="Resolution notes..."
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              style={{ width: '100%', minHeight: 80, padding: 12, background: 'var(--surface)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 14, resize: 'vertical' }}
            />
            <button className="btn-action signal-outline" onClick={onResolve} style={{ marginTop: 8 }}>
              CONFIRM RESOLVE
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TimelineItem({ label, state, isLast }) {
  return (
    <>
      <div className="timeline-step">
        <div className={`timeline-dot ${state}`}>
          {state === 'completed' || state === 'resolved' ? '●' : '○'}
        </div>
        <span className={`timeline-label ${state}`}>{label}</span>
      </div>
      {!isLast && <div className={`timeline-connector ${state}`} />}
    </>
  )
}


// ════════════════════════════════════════
// INCIDENT HISTORY TAB
// ════════════════════════════════════════
function IncidentHistoryTab({ history, filter, setFilter, expanded, setExpanded }) {
  const filtered = history.filter(item => {
    if (filter.type !== 'all' && item.emergencyType !== filter.type) return false
    if (filter.status !== 'all' && item.status !== filter.status) return false
    return true
  })

  const resolvedCount = history.filter(i => i.status === 'resolved').length

  return (
    <div>
      <div className="history-header">
        <h2 className="section-title">INCIDENT HISTORY</h2>
        <span className="history-count">{resolvedCount} RESOLVED</span>
      </div>

      <div className="filter-row stitch-border">
        <select
          className="filter-select"
          value={filter.type}
          onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
        >
          <option value="all">All Types</option>
          <option value="fire">Fire</option>
          <option value="medical">Medical</option>
          <option value="security">Security</option>
          <option value="common">Common</option>
        </select>
        <select
          className="filter-select"
          value={filter.status}
          onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="all">All Status</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
      </div>

      <div className="history-list">
        {filtered.map((item) => (
          <div key={item.id}>
            <div
              className="history-card stitch-border"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              style={{ flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', width: '100%' }}>
                <div className={`history-accent ${item.emergencyType || item.type}`} />
                <div className="history-content">
                  <div className="history-left">
                    <span className={`history-type-badge ${item.emergencyType || item.type}`}>
                      {(item.emergencyType || item.type || 'unknown').toUpperCase()}
                    </span>
                    <span className="history-room">{item.roomNumber || item.room}</span>
                    <span className="history-meta">
                      {item.guestName || item.guest} | {item.date || item.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </span>
                  </div>
                  <div className="history-right">
                    <span className="resolution-time">
                      Resolved in {item.response?.resolutionTime || '—'}
                    </span>
                    <span className={`status-chip ${item.status === 'resolved' ? 'green' : 'amber'}`}>
                      {(item.status || 'unknown').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              {expanded === item.id && (
                <div className="history-expanded">
                  <div className="history-notes">
                    {item.response?.resolutionNotes || item.notes || 'No resolution notes'}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="no-assignment" style={{ height: '30vh' }}>
            <h3>No incidents match the filter</h3>
          </div>
        )}
      </div>
    </div>
  )
}
