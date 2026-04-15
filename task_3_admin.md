# TASK 3 — ADMIN PAGES
## Project: CrisisSync | Role: Admin Developer
## Read this entire file before writing a single line of code.

---

## YOUR RESPONSIBILITY
Build all Admin-facing pages and their Firebase logic:
- Hotel registration (creates hotel in Firestore, generates unique code)
- Admin dashboard (live hotel room grid with glowing SOS blocks)
- Staff management (approve/reject pending staff)
- Incident history log
- Staff group chat

You do NOT build auth (that's Task 2). You import `useAuth` from AuthContext.

---

## TECH STACK YOU WILL USE
- React.js + Tailwind CSS
- Firebase Firestore (hotel data, incident records, staff management)
- Firebase Realtime Database (live SOS signals — listen only, admin doesn't trigger)
- React Router v6
- Lucide React icons
- nanoid (for hotel code generation)
- react-hot-toast (for notifications)

---

## FIREBASE IMPORTS TO USE IN EVERY FILE

```js
import { db, rtdb }  from '../../firebase/config'
// Firestore
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, orderBy, getDocs, serverTimestamp, arrayUnion } from 'firebase/firestore'
// Realtime DB
import { ref, onValue, off } from 'firebase/database'
```

---

## FILES YOU MUST CREATE

```
src/
  pages/
    admin/
      AdminDashboard.jsx         ← Main dashboard with room grid
      RegisterHotel.jsx          ← Hotel registration form
      StaffManagement.jsx        ← Approve/reject staff
      IncidentHistory.jsx        ← Past incidents table
  components/
    sos/
      RoomGrid.jsx               ← Hotel room grid component
      RoomBlock.jsx              ← Individual room block
      IncidentCard.jsx           ← Active SOS summary card
    chat/
      ChatWindow.jsx             ← Shared chat component (used by admin + staff)
      ChatMessage.jsx            ← Single message bubble
      ChatInput.jsx              ← Message input bar
    layout/
      AdminSidebar.jsx           ← Left sidebar for admin pages
```

---

## FILE 1 — src/pages/admin/RegisterHotel.jsx

### Purpose:
First-time admin flow. Generates 6-char hotel code. Creates hotel in Firestore.

### Visual Layout:
```
Centered card on white/slate background
Header: CrisisSync logo + "Register Your Hotel"

SECTION 1 — Hotel Information
  Hotel Name (required)
  Full Address (required)
  City / State / Pincode

SECTION 2 — Contact Details
  Phone Number
  Email
  Emergency Contact

SECTION 3 — Hotel Configuration
  Total Floors (number input, 1-50)
  Total Rooms (number input)
  Room Numbering:
    Option A: Auto-generate (e.g. 101-108, 201-208...)
    Option B: Manual entry (comma-separated)

SECTION 4 — Emergency Numbers
  Fire: [___]   Ambulance: [___]   Police: [___]   Security: [___]

SECTION 5 — Staff Categories Available
  Checkboxes: [✅ Fire Safety] [✅ Medical] [✅ Security] [✅ General]

[Generate Code & Register Hotel] — big red button
```

### Logic:
```js
import { customAlphabet } from 'nanoid'
const generateHotelCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)
// e.g. outputs: "HTL42X"

// On submit:
// 1. Generate code: const code = generateHotelCode()
// 2. Build roomNumbers array based on floors and rooms input
// 3. Write to Firestore: doc(db, 'hotels', code)
// 4. Update admin's user profile: adminProfile.hotelCode, adminProfile.hotelName, adminProfile.isHotelRegistered = true
// 5. Show success screen with the code displayed prominently
// 6. navigate('/admin/dashboard')

// Room number auto-generation:
const generateRooms = (floors, roomsPerFloor) => {
  const rooms = []
  for (let f = 1; f <= floors; f++) {
    for (let r = 1; r <= roomsPerFloor; r++) {
      rooms.push(`${f}${String(r).padStart(2, '0')}`)
    }
  }
  return rooms // e.g. ["101","102",...,"801","802"]
}

// Firestore document structure:
const hotelDoc = {
  hotelCode: code,
  hotelName: formData.hotelName,
  adminId:   currentUser.uid,
  adminName: userProfile.name,
  adminEmail: currentUser.email,
  address: {
    street:  formData.street,
    city:    formData.city,
    state:   formData.state,
    pincode: formData.pincode,
  },
  contact: {
    phone:          formData.phone,
    email:          formData.email,
    emergencyPhone: formData.emergencyContact,
  },
  hotelConfig: {
    totalFloors:    parseInt(formData.floors),
    totalRooms:     roomNumbers.length,
    roomNumbers:    roomNumbers,
    roomsPerFloor:  parseInt(formData.roomsPerFloor),
    floorLayout:    floorLayout,   // { "1": ["101","102",...], "2": [...] }
  },
  emergencyNumbers: {
    fire:       formData.fireNumber      || '101',
    ambulance:  formData.ambulanceNumber || '108',
    police:     formData.policeNumber    || '100',
    security:   formData.securityNumber  || '',
  },
  staffCategories: {
    fire_safety: formData.hasFireSafety,
    medical:     formData.hasMedical,
    security:    formData.hasSecurity,
    general:     formData.hasGeneral,
  },
  registeredAt: serverTimestamp(),
  isActive: true,
}

await setDoc(doc(db, 'hotels', code), hotelDoc)

// Update admin's own profile
await updateDoc(doc(db, 'users', currentUser.uid), {
  'adminProfile.hotelCode':         code,
  'adminProfile.hotelName':         formData.hotelName,
  'adminProfile.isHotelRegistered': true,
})
```

### After registration — Success Screen:
```
Show a success state (don't navigate away immediately):

  ✅ Hotel Registered Successfully!
  
  Your Hotel Code:
  ┌─────────────────────────┐
  │  H T L 4 2 X            │  ← Big, monospace, prominent
  └─────────────────────────┘
  [📋 Copy Code]
  
  Share this code with your staff when they sign up.
  Keep it safe — this cannot be changed.
  
  [Go to Dashboard →]
```

---

## FILE 2 — src/pages/admin/AdminDashboard.jsx

### Layout:
```
┌──────────────────────────────────────────────────────────┐
│ HEADER: Logo | Hotel Name | Code: HTLX42 | 🔔 [3] | Logout│
├──────────────────┬───────────────────────────────────────┤
│                  │                                        │
│  ADMIN SIDEBAR   │         MAIN CONTENT AREA             │
│                  │                                        │
│  📊 Dashboard    │  [Tab: Room Grid] [Tab: Active SOS]   │
│  👥 Staff        │                                        │
│  💬 Group Chat   │  ROOM GRID (default tab)              │
│  📋 Incidents    │  Floor 1: [101][102][103][104]        │
│  ⚙️  Settings    │  Floor 2: [201][202][203][204]        │
│                  │  Floor 3: [301][302]🔴[304][305]      │
│  HOTEL CODE      │                                        │
│  [HTLX42]        │  ACTIVE SOS PANEL (below grid)        │
│  [📋 Copy]       │  Cards for each active SOS            │
│                  │                                        │
└──────────────────┴───────────────────────────────────────┘
```

### Data fetching logic:
```js
// In AdminDashboard.jsx:
// 1. On mount — fetch hotel data from Firestore
// 2. Subscribe to live SOS from Firebase Realtime DB
// 3. Subscribe to staff requests count from Firestore

useEffect(() => {
  if (!userProfile?.adminProfile?.hotelCode) return
  const hotelCode = userProfile.adminProfile.hotelCode

  // a. Fetch hotel config (rooms list, floor layout)
  const fetchHotel = async () => {
    const snap = await getDoc(doc(db, 'hotels', hotelCode))
    if (snap.exists()) setHotel(snap.data())
  }
  fetchHotel()

  // b. Subscribe to live SOS signals (Realtime DB)
  const sosRef = ref(rtdb, `sos/${hotelCode}`)
  onValue(sosRef, (snapshot) => {
    const data = snapshot.val()
    setActiveSOS(data ? Object.values(data) : [])
  })

  // c. Subscribe to pending staff requests
  const q = query(
    collection(db, 'staff_requests'),
    where('hotelCode', '==', hotelCode),
    where('status', '==', 'pending')
  )
  const unsub = onSnapshot(q, (snap) => {
    setPendingCount(snap.docs.length)
    setPendingRequests(snap.docs.map(d => d.data()))
  })

  return () => {
    off(sosRef)
    unsub()
  }
}, [userProfile])
```

---

## FILE 3 — src/components/sos/RoomGrid.jsx

### Purpose: Renders the hotel room grid with live SOS color coding.

```jsx
// Props:
// rooms: string[]          — array of room numbers e.g. ["101","102","201"]
// floorLayout: object      — { "1": ["101","102"], "2": ["201","202"] }
// activeSOS: object[]      — array of active SOS objects from Realtime DB

import RoomBlock from './RoomBlock'

export default function RoomGrid({ floorLayout, activeSOS }) {
  // Build a map of roomNumber → sosData for fast lookup
  const sosMap = {}
  activeSOS.forEach(sos => {
    sosMap[sos.roomNumber] = sos
  })

  const floors = Object.keys(floorLayout).sort((a, b) => Number(a) - Number(b))

  return (
    <div className="space-y-3">
      {floors.map(floor => (
        <div key={floor} className="flex items-center gap-2 flex-wrap">
          {/* Floor label */}
          <span className="text-xs font-bold text-slate-400 w-14 shrink-0">
            Floor {floor}
          </span>
          {/* Room blocks */}
          <div className="flex flex-wrap gap-2">
            {floorLayout[floor].map(roomNum => (
              <RoomBlock
                key={roomNum}
                roomNumber={roomNum}
                sosData={sosMap[roomNum] || null}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## FILE 4 — src/components/sos/RoomBlock.jsx

### Purpose: Individual room block. Shows normal gray or glowing emergency color.

```jsx
// Props:
// roomNumber: string    — "305"
// sosData: object|null  — SOS data if active, null if normal

import { useState } from 'react'
import { getEmergency } from '../../utils/emergencyHelpers'

// Pulse animation CSS (add to index.css if not already):
// @keyframes sos-pulse {
//   0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.7); }
//   50%      { box-shadow: 0 0 0 10px rgba(220,38,38,0); }
// }

const SOS_ANIMATIONS = {
  fire:     'bg-red-600     shadow-red-500/50     shadow-lg animate-[sos-pulse_1s_ease-in-out_infinite]',
  medical:  'bg-green-600   shadow-green-500/50   shadow-lg animate-[sos-pulse_1s_ease-in-out_infinite]',
  security: 'bg-amber-500   shadow-amber-400/50   shadow-lg animate-[sos-pulse_1s_ease-in-out_infinite]',
  common:   'bg-purple-600  shadow-purple-500/50  shadow-lg animate-[sos-pulse_1s_ease-in-out_infinite]',
}

export default function RoomBlock({ roomNumber, sosData, onClick }) {
  const [hovered, setHovered] = useState(false)

  const isActive = !!sosData
  const emergency = isActive ? getEmergency(sosData.emergencyType) : null

  return (
    <div
      onClick={() => isActive && onClick && onClick(sosData)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative w-12 h-12 rounded-lg flex flex-col items-center justify-center
        text-xs font-bold transition-all duration-300 select-none
        ${isActive
          ? `${SOS_ANIMATIONS[sosData.emergencyType]} text-white cursor-pointer`
          : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-default'
        }
        ${isActive && hovered ? 'scale-110' : ''}
      `}
      title={isActive ? `${emergency.label} — Room ${roomNumber}` : `Room ${roomNumber}`}
    >
      <span className="text-[10px] leading-none">{isActive ? emergency.icon : ''}</span>
      <span className="leading-none mt-0.5">{roomNumber}</span>

      {/* Tooltip on hover */}
      {isActive && hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-xl">
          <p className="font-bold">{emergency.label}</p>
          <p className="text-slate-300">{sosData.guestName}</p>
          <p className="text-slate-400">Status: {sosData.status}</p>
        </div>
      )}
    </div>
  )
}
```

---

## FILE 5 — src/components/sos/IncidentCard.jsx

### Purpose: Card shown in the Active SOS Panel for each active emergency.

```jsx
// Props: sosData object, onViewChat, onMarkResolved, isAdmin

import { timeAgo } from '../../utils/timeHelpers'
import { getEmergency } from '../../utils/emergencyHelpers'

export default function IncidentCard({ sosData, onViewChat, onMarkResolved }) {
  const emergency = getEmergency(sosData.emergencyType)

  return (
    <div className={`border-l-4 rounded-xl p-4 bg-white shadow-sm ${
      sosData.emergencyType === 'fire'     ? 'border-red-500' :
      sosData.emergencyType === 'medical'  ? 'border-green-500' :
      sosData.emergencyType === 'security' ? 'border-amber-500' :
      'border-purple-500'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emergency.icon}</span>
          <div>
            <p className="font-bold text-slate-800 text-sm">{emergency.label}</p>
            <p className="text-xs text-slate-400">{timeAgo(sosData.triggeredAt)}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          sosData.status === 'active'   ? 'bg-red-100 text-red-700' :
          sosData.status === 'assigned' ? 'bg-amber-100 text-amber-700' :
          'bg-green-100 text-green-700'
        }`}>
          {sosData.status?.toUpperCase()}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <p className="text-slate-400 text-xs">Room</p>
          <p className="font-bold text-slate-800">Room {sosData.roomNumber}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Guest</p>
          <p className="font-semibold text-slate-700">{sosData.guestName}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Phone</p>
          <p className="font-semibold text-slate-700">{sosData.guestPhone}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Assigned Staff</p>
          <p className="font-semibold text-slate-700">
            {sosData.assignedStaffName || <span className="text-red-500">Unassigned</span>}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewChat(sosData.incidentId)}
          className="flex-1 bg-cs-navy text-white text-xs py-2 rounded-lg font-semibold hover:bg-blue-900 transition"
        >
          💬 Open Chat
        </button>
        <button
          onClick={() => onMarkResolved(sosData)}
          className="flex-1 bg-green-500 text-white text-xs py-2 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          ✅ Mark Resolved
        </button>
      </div>
    </div>
  )
}
```

---

## FILE 6 — src/pages/admin/StaffManagement.jsx

### Layout:
```
Two sections:

SECTION 1 — PENDING REQUESTS (shown if any pending)
  Orange/amber header: "3 Pending Staff Requests"
  Cards for each pending request:
    Name | Email | Designation | Hotel | Requested At
    [✅ Approve]  [❌ Reject]

SECTION 2 — ACTIVE STAFF TABLE
  Table with columns: Name | Designation | On Duty | Active Incident | Actions
  Each row: staff member data + [Remove] button
```

### Approve/Reject Logic:
```js
const approveStaff = async (request) => {
  // 1. Update staff_requests document
  await updateDoc(doc(db, 'staff_requests', request.staffId), {
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy: currentUser.uid,
  })
  // 2. Update the staff user's profile
  await updateDoc(doc(db, 'users', request.staffId), {
    'staffProfile.isApproved': true,
    'staffProfile.approvedBy': currentUser.uid,
    'staffProfile.approvedAt': serverTimestamp(),
  })
  toast.success(`${request.staffName} has been approved!`)
}

const rejectStaff = async (request) => {
  await updateDoc(doc(db, 'staff_requests', request.staffId), {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'users', request.staffId), {
    'staffProfile.isApproved': false,
  })
  toast.error(`${request.staffName}'s request has been rejected.`)
}
```

### Fetch active staff:
```js
// In useEffect:
const fetchStaff = async () => {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'staff'),
    where('staffProfile.hotelCode', '==', hotelCode),
    where('staffProfile.isApproved', '==', true)
  )
  const snap = await getDocs(q)
  setStaffList(snap.docs.map(d => d.data()))
}
```

---

## FILE 7 — src/pages/admin/IncidentHistory.jsx

### Layout:
```
Filter bar:
  [Date Range picker] [Emergency Type dropdown] [Status dropdown] [Search room#]

Incidents table:
  Columns: Date | Room | Type (badge) | Guest | Staff | Duration | Status | Actions

Row expand: Click to see full timeline + resolution notes

Empty state: "No incidents found for the selected filters"
```

### Fetch incidents:
```js
// Fetch all incidents for this hotel, ordered by newest first
const fetchIncidents = async () => {
  const q = query(
    collection(db, 'incidents'),
    where('hotelCode', '==', hotelCode),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  setIncidents(snap.docs.map(d => d.data()))
}
```

---

## FILE 8 — src/components/chat/ChatWindow.jsx

### Purpose: Reusable chat component. Used for incident chat AND staff group chat.

```jsx
// Props:
// channelId: string       — incidentId or "staff_{hotelCode}"
// currentUser: object
// userProfile: object
// title: string           — "Incident Chat" or "Staff Group Chat"
// isReadOnly: boolean     — true if incident is resolved

import { useState, useEffect, useRef } from 'react'
import { ref, onValue, push, set, off } from 'firebase/database'
import { rtdb } from '../../firebase/config'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'

export default function ChatWindow({ channelId, currentUser, userProfile, title, isReadOnly }) {
  const [messages, setMessages] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!channelId) return
    const chatRef = ref(rtdb, `chats/${channelId}`)
    onValue(chatRef, (snapshot) => {
      const data = snapshot.val()
      const msgs = data
        ? Object.values(data).sort((a, b) => a.timestamp - b.timestamp)
        : []
      setMessages(msgs)
    })
    return () => off(chatRef)
  }, [channelId])

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim() || !channelId) return
    const chatRef = ref(rtdb, `chats/${channelId}`)
    const newMsg = push(chatRef)
    await set(newMsg, {
      messageId:   newMsg.key,
      senderId:    currentUser.uid,
      senderName:  userProfile.name,
      senderRole:  userProfile.role,
      message:     text.trim(),
      timestamp:   Date.now(),
      type:        'text',
    })
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-cs-navy rounded-t-xl">
        <h3 className="text-white font-bold text-sm">{title}</h3>
        {isReadOnly && (
          <p className="text-slate-400 text-xs">This incident is resolved. Chat is read-only.</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-slate-400 text-sm mt-8">
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map(msg => (
          <ChatMessage
            key={msg.messageId || msg.timestamp}
            message={msg}
            isOwn={msg.senderId === currentUser.uid}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isReadOnly && <ChatInput onSend={sendMessage} />}
    </div>
  )
}
```

### ChatMessage.jsx:
```jsx
// Props: message object, isOwn boolean
import { formatTime } from '../../utils/timeHelpers'

const ROLE_COLORS = {
  guest: 'bg-purple-100 text-purple-800',
  staff: 'bg-teal-100 text-teal-800',
  admin: 'bg-navy-100 text-cs-navy',
}

export default function ChatMessage({ message, isOwn }) {
  if (message.type === 'system_message') {
    return (
      <div className="flex justify-center">
        <span className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full italic">
          {message.message}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Role badge + name */}
        <div className={`flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[message.senderRole] || 'bg-slate-100 text-slate-600'}`}>
            {message.senderRole}
          </span>
          <span className="text-xs text-slate-500">{message.senderName}</span>
        </div>
        {/* Bubble */}
        <div className={`px-3 py-2 rounded-2xl text-sm ${
          isOwn
            ? 'bg-cs-navy text-white rounded-tr-sm'
            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
        }`}>
          {message.message}
        </div>
        <span className="text-[10px] text-slate-400">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}
```

### ChatInput.jsx:
```jsx
import { useState } from 'react'
export default function ChatInput({ onSend }) {
  const [text, setText] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text)
    setText('')
  }
  return (
    <form onSubmit={submit} className="flex gap-2 p-3 border-t border-slate-200">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cs-red"
      />
      <button type="submit"
        className="bg-cs-red text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-700 transition font-bold text-lg">
        ↑
      </button>
    </form>
  )
}
```

---

## FILE 9 — src/components/layout/AdminSidebar.jsx

```jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AdminSidebar({ hotelCode, pendingCount }) {
  const { logout, userProfile } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
    toast.success('Logged out successfully')
  }

  const links = [
    { to: '/admin/dashboard',  icon: '📊', label: 'Dashboard'  },
    { to: '/admin/staff',      icon: '👥', label: `Staff ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
    { to: '/admin/incidents',  icon: '📋', label: 'Incidents'  },
  ]

  return (
    <aside className="w-64 bg-cs-navy h-screen flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cs-red rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">SOS</span>
          </div>
          <span className="text-white font-black text-lg">CrisisSync</span>
        </div>
        <p className="text-slate-400 text-xs mt-1">{userProfile?.adminProfile?.hotelName}</p>
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
            {l.label.includes('Staff') && pendingCount > 0 && (
              <span className="ml-auto bg-cs-red text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}

        {/* Staff Group Chat */}
        <button
          onClick={() => navigate('/admin/dashboard', { state: { openChat: true } })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
        >
          <span>💬</span>
          <span>Staff Group Chat</span>
        </button>
      </nav>

      {/* Hotel code box */}
      <div className="p-4 border-t border-white/10">
        <p className="text-slate-400 text-xs mb-1">Hotel Code</p>
        <div className="flex items-center gap-2">
          <code className="bg-white/10 text-white font-mono font-bold px-3 py-1 rounded-lg text-sm tracking-widest">
            {hotelCode}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(hotelCode); toast.success('Code copied!') }}
            className="text-slate-400 hover:text-white transition text-xs"
          >
            📋
          </button>
        </div>
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

## RESOLVE SOS LOGIC (in AdminDashboard.jsx)

```js
import { ref, remove } from 'firebase/database'

const resolveEmergency = async (sosData, resolutionNotes) => {
  const hotelCode = userProfile.adminProfile.hotelCode

  // 1. Delete from Realtime DB (removes the glowing block)
  const sosRef = ref(rtdb, `sos/${hotelCode}/${sosData.roomNumber}`)
  await remove(sosRef)

  // 2. Update Firestore incident record
  await updateDoc(doc(db, 'incidents', sosData.incidentId), {
    'response.resolvedAt':       serverTimestamp(),
    'response.resolutionNotes':  resolutionNotes,
    'response.resolvedBy':       currentUser.uid,
    status:                      'resolved',
  })

  // 3. Write system message to chat
  const chatRef = ref(rtdb, `chats/${sosData.incidentId}`)
  const newMsg = push(chatRef)
  await set(newMsg, {
    type:      'system_message',
    message:   `Emergency resolved by Admin. ${resolutionNotes}`,
    timestamp: Date.now(),
  })

  toast.success(`Room ${sosData.roomNumber} emergency marked as resolved.`)
}
```

---

## WHAT "DONE" LOOKS LIKE FOR YOUR TASK

- [ ] Hotel registration form works and writes to Firestore
- [ ] 6-char unique hotel code is generated via nanoid
- [ ] Admin's user profile updated with hotelCode after registration
- [ ] Admin dashboard renders hotel room grid from Firestore data
- [ ] Room blocks glow when SOS is active (Firebase Realtime DB listener working)
- [ ] Active SOS panel shows IncidentCard for each active emergency
- [ ] Admin can open incident chat (ChatWindow)
- [ ] Admin can mark emergency as resolved (removes Realtime DB entry)
- [ ] Staff Management page shows pending requests with Approve/Reject
- [ ] Approving staff updates Firestore (isApproved: true)
- [ ] Incident History page shows past incidents from Firestore
- [ ] Staff Group Chat works via Firebase Realtime DB
- [ ] AdminSidebar navigation works for all admin pages
- [ ] Hotel code visible and copyable in sidebar
- [ ] All pages mobile responsive

---

## DO NOT TOUCH
- Do not modify auth files (AuthContext, Login, Signup)
- Do not build Guest or Staff pages
- Do not modify App.jsx routes
