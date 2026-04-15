# TASK 5 — STAFF PAGES
## Project: CrisisSync | Role: Staff Developer
## Read this entire file before writing a single line of code.

---

## YOUR RESPONSIBILITY
Build everything the hotel staff member sees and interacts with:
- Staff pending approval page
- Staff dashboard with live hotel room grid
- SOS accept/decline popup system
- On-duty toggle with Firebase Realtime DB presence
- Incident chat and call
- Staff group chat
- Staff profile page

You do NOT build auth (that's Task 2). You import `useAuth` from AuthContext.
The ChatWindow, ChatMessage, ChatInput components are shared — build them in
`src/components/chat/` and the Admin task will reuse them.

---

## TECH STACK YOU WILL USE
- React.js + Tailwind CSS
- Firebase Firestore (user profile, incident records, hotel data)
- Firebase Realtime Database (live SOS alerts, on-duty presence, chat, WebRTC)
- React Router v6
- Lucide React + react-hot-toast

---

## FIREBASE IMPORTS TO USE

```js
import { db, rtdb }  from '../../firebase/config'
// Firestore
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where, serverTimestamp, arrayRemove } from 'firebase/firestore'
// Realtime DB
import { ref, set, onValue, off, update, push, remove, onDisconnect } from 'firebase/database'
```

---

## FILES YOU MUST CREATE

```
src/
  pages/
    staff/
      StaffDashboard.jsx        ← Main staff page
      StaffPending.jsx          ← "Waiting for admin approval" page
      StaffProfile.jsx          ← Staff's own profile
  components/
    staff/
      SOSPopup.jsx              ← Full-screen SOS accept/decline modal
      StaffSidebar.jsx          ← Left sidebar for staff pages
      OnDutyToggle.jsx          ← On/Off duty toggle switch
    chat/
      ChatWindow.jsx            ← (Build here — shared with Admin task)
      ChatMessage.jsx           ← (Build here — shared with Admin task)
      ChatInput.jsx             ← (Build here — shared with Admin task)
```

**Note on shared chat components:** If the Admin task developer is ahead of you, coordinate so the same ChatWindow files are used. If you build them first, place them in `src/components/chat/` and the admin developer will import from there.

---

## FILE 1 — src/pages/staff/StaffPending.jsx

### Purpose: Shown when staff account is created but admin hasn't approved yet.

### Visual Layout:
```
Centered screen, slate background

Big pending icon: ⏳ (large, amber color)
Heading: "Account Pending Approval"
Sub: "Your hotel admin needs to approve your account before you can access the dashboard."

Info box (amber):
  Hotel: The Grand Palace
  Designation: Fire Safety Officer
  Submitted: 2 hours ago

Auto-refresh note: "This page checks for approval automatically. No need to refresh."

[← Back to Home] button
```

### Logic:
```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'

export default function StaffPending() {
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!currentUser) return

    // Listen to this staff member's own Firestore document in real-time
    // When admin approves → isApproved flips to true → redirect to dashboard
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      const data = snap.data()
      if (data?.staffProfile?.isApproved === true) {
        refreshProfile()
        navigate('/staff/dashboard')
      }
    })

    return () => unsub()
  }, [currentUser])

  return (
    // ... render pending UI
    // Show userProfile.staffProfile.hotelName, designation, createdAt
  )
}
```

---

## FILE 2 — src/pages/staff/StaffDashboard.jsx

### Layout:
```
┌──────────────────────────────────────────────────────────┐
│ HEADER: CrisisSync | Raj Kumar | 🔥 Fire Safety | [Duty] │
├──────────────────┬───────────────────────────────────────┤
│                  │                                        │
│  STAFF SIDEBAR   │    TAB BAR: [Grid] [My Incidents] [Chat]│
│                  │                                        │
│ 📊 Dashboard     │    HOTEL ROOM GRID (same as admin)     │
│ 💬 Group Chat    │    Floor 1: [101][102][103]            │
│ 📋 My History    │    Floor 2: [201][202][203]            │
│ 👤 Profile       │    Floor 3: [301]🔴[303][304]          │
│                  │                                        │
│  ON DUTY         │    MY CURRENT ASSIGNMENT (if any)      │
│  [Toggle ✅]     │    ┌─────────────────────────────────┐ │
│                  │    │ 🔴 FIRE — Room 305             │ │
│  STATUS: Online  │    │ Guest: Rohit Sharma            │ │
│                  │    │ [📞 Call] [💬 Chat]            │ │
│                  │    │ [✅ Arrived] [✅ Resolve]       │ │
│                  │    └─────────────────────────────────┘ │
└──────────────────┴───────────────────────────────────────┘

SOS POPUP overlays entire screen when new SOS received (see SOSPopup.jsx)
```

### State variables:
```js
const [hotel,          setHotel]          = useState(null)     // hotel config from Firestore
const [activeSOS,      setActiveSOS]      = useState({})       // all active SOS in hotel (roomNum → sosData)
const [myIncident,     setMyIncident]     = useState(null)     // SOS this staff member accepted
const [newSOSAlert,    setNewSOSAlert]    = useState(null)     // incoming SOS for popup
const [isOnDuty,       setIsOnDuty]      = useState(false)
const [activeTab,      setActiveTab]      = useState('grid')   // 'grid' | 'incidents' | 'chat'
const [showGroupChat,  setShowGroupChat]  = useState(false)
```

### On mount — presence + SOS listener:
```js
useEffect(() => {
  if (!userProfile?.staffProfile) return
  const { hotelCode, designation, isOnDuty: savedDuty } = userProfile.staffProfile

  setIsOnDuty(savedDuty || false)

  // 1. Fetch hotel configuration (room layout)
  const fetchHotel = async () => {
    const snap = await getDoc(doc(db, 'hotels', hotelCode))
    if (snap.exists()) setHotel(snap.data())
  }
  fetchHotel()

  // 2. Set online presence in Realtime DB
  const presenceRef = ref(rtdb, `staff_presence/${hotelCode}/${currentUser.uid}`)
  set(presenceRef, {
    staffId:     currentUser.uid,
    name:        userProfile.name,
    designation: designation,
    isOnline:    true,
    isOnDuty:    savedDuty || false,
    lastSeen:    Date.now(),
    currentIncident: null,
  })

  // Auto-set offline when browser tab closes
  onDisconnect(presenceRef).update({ isOnline: false, lastSeen: Date.now() })

  // 3. Listen to all SOS signals in the hotel
  const sosRef = ref(rtdb, `sos/${hotelCode}`)
  onValue(sosRef, (snapshot) => {
    const data = snapshot.val() || {}
    setActiveSOS(data)

    // Check for NEW unassigned SOS that matches this staff member's designation
    Object.values(data).forEach(sos => {
      if (
        sos.status === 'active' &&
        !sos.assignedStaffId &&
        isSOSForMe(sos.emergencyType, designation) &&
        isOnDuty
      ) {
        setNewSOSAlert(sos)
      }
    })

    // Check if staff's own accepted incident is still active
    Object.values(data).forEach(sos => {
      if (sos.assignedStaffId === currentUser.uid) {
        setMyIncident(sos)
      }
    })

    // If their incident was removed (resolved) from Realtime DB
    const hasMyIncident = Object.values(data).some(s => s.assignedStaffId === currentUser.uid)
    if (!hasMyIncident) setMyIncident(null)
  })

  return () => off(sosRef)
}, [userProfile, isOnDuty])

// Helper: does this SOS type route to this staff designation?
const isSOSForMe = (emergencyType, designation) => {
  if (emergencyType === 'common') return true         // All staff get common SOS
  if (emergencyType === 'fire'     && designation === 'fire_safety') return true
  if (emergencyType === 'medical'  && designation === 'medical')     return true
  if (emergencyType === 'security' && designation === 'security')    return true
  return false
}
```

---

## FILE 3 — src/components/staff/SOSPopup.jsx

### Purpose: Full-screen modal when a new SOS arrives. Most critical staff component.

### Visual Layout:
```
Full-screen overlay: semi-transparent dark background

Centered card with THICK colored border (matching emergency type):

  ┌───────────────────────────────────────────┐
  │  🔴  FIRE EMERGENCY                       │  ← Red border, pulsing
  │                                           │
  │  Room:    305    Floor: 3rd               │
  │  Guest:   Rohit Sharma                    │
  │  Phone:   +91-9876543210                  │
  │  Guests:  2 people in room                │
  │  Reported: 23 seconds ago                 │
  │                                           │
  │  ┌──────────────────┐ ┌────────────────┐  │
  │  │ ✅ ACCEPT        │ │ ❌ Decline     │  │
  │  │    & Respond     │ │               │  │
  │  └──────────────────┘ └────────────────┘  │
  │                                           │
  │  ⚠️ If you decline, another staff member  │
  │     will be notified.                     │
  └───────────────────────────────────────────┘

Auto-dismiss: If staff doesn't respond in 90 seconds, popup closes automatically.
Sound alert: Play browser beep on popup appear (optional).
```

### Complete SOSPopup.jsx:
```jsx
import { useEffect, useState } from 'react'
import { getEmergency } from '../../utils/emergencyHelpers'
import { timeAgo } from '../../utils/timeHelpers'

const BORDER_COLORS = {
  fire:     'border-red-500',
  medical:  'border-green-500',
  security: 'border-amber-400',
  common:   'border-purple-500',
}

const BG_COLORS = {
  fire:     'bg-red-50',
  medical:  'bg-green-50',
  security: 'bg-amber-50',
  common:   'bg-purple-50',
}

export default function SOSPopup({ sosData, onAccept, onDecline }) {
  const [secondsLeft, setSecondsLeft] = useState(90)
  const emergency = getEmergency(sosData.emergencyType)

  // Countdown timer — auto-dismiss after 90 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onDecline()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Play alert sound
  useEffect(() => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA...')
      audio.play().catch(() => {}) // Ignore if blocked by browser
    } catch (e) {}
  }, [])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className={`
        bg-white rounded-2xl w-full max-w-sm
        border-4 ${BORDER_COLORS[sosData.emergencyType]}
        shadow-2xl
        animate-[bounce_0.5s_ease-in-out_3]
      `}>
        {/* Emergency type header */}
        <div className={`${BG_COLORS[sosData.emergencyType]} rounded-t-xl px-6 py-4 text-center`}>
          <div className="text-4xl mb-1">{emergency.icon}</div>
          <h2 className="text-xl font-black text-slate-800">{emergency.label}</h2>
          <p className="text-slate-500 text-sm">New emergency alert</p>
        </div>

        {/* Details */}
        <div className="px-6 py-4 space-y-3">
          <DetailRow label="Room"    value={`Room ${sosData.roomNumber}, Floor ${sosData.floor}`} />
          <DetailRow label="Guest"   value={sosData.guestName} />
          <DetailRow label="Phone"   value={<a href={`tel:${sosData.guestPhone}`} className="text-cs-red font-bold hover:underline">{sosData.guestPhone}</a>} />
          <DetailRow label="Guests"  value={`${sosData.numberOfGuests || 1} person(s) in room`} />
          <DetailRow label="Reported" value={timeAgo(sosData.triggeredAt)} />
        </div>

        {/* Timeout bar */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Auto-dismiss in</span>
            <span className="font-bold text-slate-600">{secondsLeft}s</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-cs-red h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${(secondsLeft / 90) * 100}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-5 flex gap-3 mt-2">
          <button
            onClick={() => onAccept(sosData)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-black text-sm transition active:scale-95"
          >
            ✅ Accept & Respond
          </button>
          <button
            onClick={onDecline}
            className="w-24 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-xl font-bold text-sm transition active:scale-95"
          >
            ❌ Decline
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          Declining will notify other available staff members
        </p>
      </div>
    </div>
  )
}

const DetailRow = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-400 text-sm">{label}</span>
    <span className="text-slate-800 font-semibold text-sm">{value}</span>
  </div>
)
```

---

## FILE 4 — ACCEPT SOS LOGIC (inside StaffDashboard.jsx)

```js
import { ref, update, push, set } from 'firebase/database'
import { doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore'

const acceptSOS = async (sosData) => {
  const hotelCode = userProfile.staffProfile.hotelCode

  setNewSOSAlert(null) // Close popup

  try {
    // 1. Update Realtime DB — mark as assigned to this staff member
    const sosRef = ref(rtdb, `sos/${hotelCode}/${sosData.roomNumber}`)
    await update(sosRef, {
      status:            'assigned',
      assignedStaffId:   currentUser.uid,
      assignedStaffName: userProfile.name,
      assignedDesignation: userProfile.staffProfile.designation,
      acceptedAt:        Date.now(),
    })

    // 2. Update Firestore incident record
    await updateDoc(doc(db, 'incidents', sosData.incidentId), {
      'response.assignedStaffId':      currentUser.uid,
      'response.assignedStaffName':    userProfile.name,
      'response.assignedDesignation':  userProfile.staffProfile.designation,
      'response.acceptedAt':           serverTimestamp(),
      status:                          'assigned',
      'timeline': arrayUnion({
        event:     'STAFF_ACCEPTED',
        timestamp: Date.now(),
        actor:     currentUser.uid,
        actorName: userProfile.name,
      }),
    })

    // 3. Update this staff member's own Firestore profile
    await updateDoc(doc(db, 'users', currentUser.uid), {
      'staffProfile.activeIncidents': arrayUnion(sosData.incidentId),
    })

    // 4. Update presence in Realtime DB
    const presenceRef = ref(rtdb, `staff_presence/${hotelCode}/${currentUser.uid}`)
    await update(presenceRef, {
      currentIncident: sosData.incidentId,
    })

    // 5. Add system message to incident chat
    const chatRef = ref(rtdb, `chats/${sosData.incidentId}`)
    const sysMsg = push(chatRef)
    await set(sysMsg, {
      messageId:  sysMsg.key,
      type:       'system_message',
      message:    `${userProfile.name} (${userProfile.staffProfile.designation}) has accepted this emergency and is on the way.`,
      timestamp:  Date.now(),
    })

    setMyIncident({ ...sosData, status: 'assigned', assignedStaffName: userProfile.name })
    toast.success(`You are now responding to Room ${sosData.roomNumber}`)

  } catch (err) {
    console.error('Accept SOS error:', err)
    toast.error('Failed to accept. Try again.')
  }
}
```

---

## FILE 5 — ON DUTY TOGGLE COMPONENT

### src/components/staff/OnDutyToggle.jsx:
```jsx
// Props: isOnDuty, onChange

export default function OnDutyToggle({ isOnDuty, onChange }) {
  return (
    <button
      onClick={() => onChange(!isOnDuty)}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm
        transition-all duration-300
        ${isOnDuty
          ? 'bg-green-500 text-white shadow-green-500/30 shadow-lg'
          : 'bg-slate-200 text-slate-500'
        }
      `}
    >
      <div className={`w-3 h-3 rounded-full ${isOnDuty ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
      {isOnDuty ? '✅ On Duty' : '⭕ Off Duty'}
    </button>
  )
}
```

### Toggle logic inside StaffDashboard.jsx:
```js
const toggleDuty = async (newDutyState) => {
  const hotelCode = userProfile.staffProfile.hotelCode

  setIsOnDuty(newDutyState)

  // Update Realtime DB presence
  const presenceRef = ref(rtdb, `staff_presence/${hotelCode}/${currentUser.uid}`)
  await update(presenceRef, { isOnDuty: newDutyState })

  // Update Firestore profile
  await updateDoc(doc(db, 'users', currentUser.uid), {
    'staffProfile.isOnDuty': newDutyState,
  })

  toast.success(newDutyState ? 'You are now On Duty' : 'You are now Off Duty')
}
```

---

## FILE 6 — MARK ARRIVED + RESOLVE INCIDENT LOGIC

```js
const markArrived = async () => {
  if (!myIncident) return
  const hotelCode = userProfile.staffProfile.hotelCode

  // Update Realtime DB status
  const sosRef = ref(rtdb, `sos/${hotelCode}/${myIncident.roomNumber}`)
  await update(sosRef, { status: 'arrived', arrivedAt: Date.now() })

  // Update Firestore incident timeline
  await updateDoc(doc(db, 'incidents', myIncident.incidentId), {
    'response.arrivedAt': serverTimestamp(),
    'timeline': arrayUnion({
      event:     'STAFF_ARRIVED',
      timestamp: Date.now(),
      actor:     currentUser.uid,
    }),
  })

  // Send chat system message
  const chatRef = ref(rtdb, `chats/${myIncident.incidentId}`)
  const msg = push(chatRef)
  await set(msg, {
    messageId: msg.key,
    type:      'system_message',
    message:   `${userProfile.name} has arrived at Room ${myIncident.roomNumber}.`,
    timestamp: Date.now(),
  })

  toast.success('Marked as arrived. Guest has been notified.')
}

const resolveIncident = async (resolutionNotes) => {
  if (!myIncident) return
  const hotelCode = userProfile.staffProfile.hotelCode

  // 1. REMOVE from Realtime DB → room block returns to gray on all dashboards
  const sosRef = ref(rtdb, `sos/${hotelCode}/${myIncident.roomNumber}`)
  await remove(sosRef)

  // 2. Update Firestore incident — mark resolved
  await updateDoc(doc(db, 'incidents', myIncident.incidentId), {
    'response.resolvedAt':      serverTimestamp(),
    'response.resolutionNotes': resolutionNotes,
    'response.resolvedBy':      currentUser.uid,
    status:                     'resolved',
    'timeline': arrayUnion({
      event:     'RESOLVED',
      timestamp: Date.now(),
      actor:     currentUser.uid,
    }),
  })

  // 3. Remove incident from staff profile's active list
  await updateDoc(doc(db, 'users', currentUser.uid), {
    'staffProfile.activeIncidents': arrayRemove(myIncident.incidentId),
  })

  // 4. Clear current incident from Realtime DB presence
  const presenceRef = ref(rtdb, `staff_presence/${hotelCode}/${currentUser.uid}`)
  await update(presenceRef, { currentIncident: null })

  // 5. Final chat system message
  const chatRef = ref(rtdb, `chats/${myIncident.incidentId}`)
  const msg = push(chatRef)
  await set(msg, {
    messageId: msg.key,
    type:      'system_message',
    message:   `Emergency resolved by ${userProfile.name}. ${resolutionNotes}`,
    timestamp: Date.now(),
  })

  setMyIncident(null)
  toast.success('Emergency resolved and recorded!')
}
```

---

## FILE 7 — MY ACTIVE ASSIGNMENT CARD (inside StaffDashboard.jsx)

```jsx
// Show this card when myIncident is not null

const MyAssignmentCard = ({ incident, onMarkArrived, onResolve, onOpenChat, onCall }) => {
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [notes, setNotes] = useState('')
  const emergency = getEmergency(incident.emergencyType)

  return (
    <div className={`border-l-4 rounded-xl p-4 bg-white shadow-sm ${
      incident.emergencyType === 'fire'     ? 'border-red-500 bg-red-50' :
      incident.emergencyType === 'medical'  ? 'border-green-500 bg-green-50' :
      incident.emergencyType === 'security' ? 'border-amber-500 bg-amber-50' :
      'border-purple-500 bg-purple-50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emergency.icon}</span>
          <div>
            <p className="font-black text-slate-800">{emergency.label}</p>
            <p className="text-xs text-slate-500">Room {incident.roomNumber}</p>
          </div>
        </div>
        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">
          MY ASSIGNMENT
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div><p className="text-xs text-slate-400">Guest</p><p className="font-semibold">{incident.guestName}</p></div>
        <div><p className="text-xs text-slate-400">Phone</p>
          <a href={`tel:${incident.guestPhone}`} className="font-semibold text-cs-red hover:underline">
            {incident.guestPhone}
          </a>
        </div>
        <div><p className="text-xs text-slate-400">Status</p><p className="font-semibold capitalize">{incident.status}</p></div>
        <div><p className="text-xs text-slate-400">Accepted</p><p className="font-semibold">{timeAgo(incident.acceptedAt)}</p></div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => onOpenChat(incident.incidentId)}
          className="flex-1 bg-cs-navy text-white text-xs py-2 rounded-lg font-semibold hover:bg-blue-900 transition">
          💬 Chat with Guest
        </button>
        <button onClick={() => onCall(incident)}
          className="flex-1 bg-green-600 text-white text-xs py-2 rounded-lg font-semibold hover:bg-green-700 transition">
          📞 Call Guest
        </button>
      </div>

      <div className="flex gap-2">
        {incident.status === 'assigned' && (
          <button onClick={onMarkArrived}
            className="flex-1 border-2 border-amber-400 text-amber-700 text-xs py-2 rounded-lg font-semibold hover:bg-amber-50 transition">
            📍 Mark Arrived
          </button>
        )}
        <button onClick={() => setShowResolveForm(!showResolveForm)}
          className="flex-1 bg-green-600 text-white text-xs py-2 rounded-lg font-semibold hover:bg-green-700 transition">
          ✅ Resolve
        </button>
      </div>

      {/* Resolve form */}
      {showResolveForm && (
        <div className="mt-3">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Describe what happened and how it was resolved..."
            rows={3}
            className="w-full border border-slate-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            onClick={() => { if (notes.trim()) onResolve(notes); }}
            disabled={!notes.trim()}
            className="mt-2 w-full bg-green-600 disabled:bg-slate-300 text-white py-2 rounded-lg text-sm font-bold transition"
          >
            Confirm Resolution
          </button>
        </div>
      )}
    </div>
  )
}
```

---

## FILE 8 — src/components/staff/StaffSidebar.jsx

```jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { STAFF_DESIGNATIONS } from '../../utils/emergencyHelpers'
import OnDutyToggle from './OnDutyToggle'
import toast from 'react-hot-toast'

export default function StaffSidebar({ isOnDuty, onToggleDuty }) {
  const { logout, userProfile } = useAuth()
  const navigate = useNavigate()

  const designation = STAFF_DESIGNATIONS[userProfile?.staffProfile?.designation]

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const links = [
    { to: '/staff/dashboard', icon: '📊', label: 'Dashboard'    },
    { to: '/staff/profile',   icon: '👤', label: 'My Profile'   },
  ]

  return (
    <aside className="w-64 bg-cs-navy h-screen flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-cs-red rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">SOS</span>
          </div>
          <span className="text-white font-black text-lg">CrisisSync</span>
        </div>
        {/* Staff info */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            {userProfile?.name?.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-white font-semibold text-sm truncate">{userProfile?.name}</p>
            <p className="text-slate-300 text-xs">{designation?.icon} {designation?.label}</p>
          </div>
        </div>
      </div>

      {/* On Duty Toggle — prominently placed */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <span className="text-slate-300 text-sm">Status</span>
        <OnDutyToggle isOnDuty={isOnDuty} onChange={onToggleDuty} />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
        {/* Staff group chat */}
        <button
          onClick={() => navigate('/staff/dashboard', { state: { openGroupChat: true } })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
        >
          <span>💬</span>
          <span>Staff Group Chat</span>
        </button>
      </nav>

      {/* Hotel code */}
      <div className="p-4 border-t border-white/10">
        <p className="text-slate-400 text-xs mb-1">Hotel</p>
        <p className="text-white text-sm font-semibold truncate">{userProfile?.staffProfile?.hotelName}</p>
        <code className="text-slate-300 font-mono text-xs">{userProfile?.staffProfile?.hotelCode}</code>
        <button
          onClick={handleLogout}
          className="w-full mt-3 text-slate-400 hover:text-white text-xs py-1 transition text-left"
        >
          ← Sign Out
        </button>
      </div>
    </aside>
  )
}
```

---

## FILE 9 — STAFF GROUP CHAT (inside StaffDashboard.jsx)

```jsx
// The Staff Group Chat is a persistent channel per hotel
// Channel key in Realtime DB: "staff_{hotelCode}"
// Render ChatWindow with channelId = `staff_${hotelCode}`

// In JSX (when showGroupChat is true):
<ChatWindow
  channelId={`staff_${userProfile.staffProfile.hotelCode}`}
  currentUser={currentUser}
  userProfile={userProfile}
  title="Staff Group Chat — The Grand Palace"
  isReadOnly={false}
/>
```

---

## CHAT COMPONENTS — Build these (shared with Admin too)

**Build these in `src/components/chat/` — they are the same files Admin will import.**

See detailed spec in **TASK 3 (Admin)** files — ChatWindow.jsx, ChatMessage.jsx, ChatInput.jsx.

Build them exactly as specified there. Both Admin and Staff pages will use the same components.

---

## WEBRTC EMERGENCY CALL (Optional but impactful for demo)

```js
// src/components/call/useWebRTC.js
// This hook manages the WebRTC peer connection for staff side

import { useEffect, useRef, useState } from 'react'
import { ref, onValue, set, push, off } from 'firebase/database'
import { rtdb } from '../../firebase/config'
import Peer from 'simple-peer'

export const useWebRTC = (incidentId, currentUserId, isInitiator) => {
  const [callActive,      setCallActive]       = useState(false)
  const [remoteStream,    setRemoteStream]      = useState(null)
  const peerRef   = useRef(null)
  const streamRef = useRef(null)

  const startCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const peer = new Peer({ initiator: isInitiator, stream })

    peer.on('signal', (signalData) => {
      const sigRef = ref(rtdb, `webrtc/${incidentId}/${isInitiator ? 'offer' : 'answer'}`)
      set(sigRef, JSON.stringify(signalData))
    })

    peer.on('stream', (remote) => {
      setRemoteStream(remote)
      setCallActive(true)
    })

    // Listen for the other side's signal
    const listenKey = isInitiator ? 'answer' : 'offer'
    const sigListenRef = ref(rtdb, `webrtc/${incidentId}/${listenKey}`)
    onValue(sigListenRef, (snap) => {
      if (snap.exists() && !peer.destroyed) {
        peer.signal(JSON.parse(snap.val()))
      }
    })

    peerRef.current = peer
  }

  const endCall = () => {
    peerRef.current?.destroy()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCallActive(false)
    setRemoteStream(null)
    // Clean up Realtime DB
    remove(ref(rtdb, `webrtc/${incidentId}`))
  }

  return { callActive, remoteStream, startCall, endCall }
}
```

---

## WHAT "DONE" LOOKS LIKE FOR YOUR TASK

- [ ] StaffPending.jsx auto-redirects when admin approves (Firestore real-time listener)
- [ ] StaffDashboard.jsx renders hotel room grid from Firestore hotel config
- [ ] Firebase Realtime DB listener for sos/{hotelCode} is working
- [ ] SOSPopup appears when new SOS arrives matching staff designation
- [ ] "Common" SOS triggers popup for ALL staff regardless of designation
- [ ] Staff can Accept SOS (updates Realtime DB + Firestore incident)
- [ ] Staff can Decline SOS (closes popup)
- [x] Refactor `SOSPopup.jsx` to use `crisis-bridge` CSS
- [x] Refactor `OnDutyToggle.jsx` to use `crisis-bridge` CSS
- [x] Refactor shared Chat components to use `crisis-bridge` CSS
    - [x] `ChatWindow.jsx`
    - [x] `ChatMessage.jsx`
    - [x] `ChatInput.jsx`
- [x] Final polish of `StaffDashboard.jsx` and transitions
- [/] Verify SOS lifecycle and presence toggling
- [ ] Final walkthrough and documentation

---

## DO NOT TOUCH
- Do not modify auth files (AuthContext, Login, Signup)
- Do not build Guest or Admin pages
- Do not modify App.jsx routing
- Do not change emergencyHelpers.js or timeHelpers.js (Landing task owns those)
