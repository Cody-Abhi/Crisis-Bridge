import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { db, rtdb } from '../../firebase/config'
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { ref, onValue, remove } from 'firebase/database'
import AdminSidebar from '../../components/layout/AdminSidebar'
import RoomGrid from '../../components/sos/RoomGrid'
import IncidentCard from '../../components/sos/IncidentCard'
import ChatWindow from '../../components/chat/ChatWindow'
import AdminAIChatbot from '../../components/admin/ai/AdminAIChatbot'
import WalkiePanelAdmin from '../../components/walkie/WalkiePanel'
import toast from 'react-hot-toast'

// ── Draggable Wrapper ────────────────────────────────────────────────────
const DraggablePanel = ({ children, defaultPos }) => {
  const [pos, setPos] = useState(defaultPos)
  const [isDragging, setIsDragging] = useState(false)
  const [rel, setRel] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging) return
      setPos({ x: e.pageX - rel.x, y: e.pageY - rel.y })
    }
    const onMouseUp = () => setIsDragging(false)
    
    if (isDragging) {
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDragging, rel])

  const onMouseDown = (e) => {
    // Only drag if clicking the handle
    if (!e.target.closest('.drag-handle')) return
    setIsDragging(true)
    setRel({ x: e.pageX - pos.x, y: e.pageY - pos.y })
  }

  return (
    <div 
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
      onMouseDown={onMouseDown}
      className={isDragging ? 'select-none opacity-90' : ''}
    >
      {children}
    </div>
  )
}

const computeAvgResponseTime = (incidents) => {
  const resolved = incidents.filter(
    i => i.status === 'resolved' && i.response?.acceptedAt && i.emergency?.triggeredAt
  )
  if (resolved.length === 0) return 'N/A'
  const avgMs = resolved.reduce((sum, i) => {
    const accepted = i.response.acceptedAt?.toMillis ? i.response.acceptedAt.toMillis() : (i.response.acceptedAt || 0)
    const triggered = i.emergency.triggeredAt?.toMillis ? i.emergency.triggeredAt.toMillis() : (i.emergency.triggeredAt || 0)
    return sum + Math.abs(accepted - triggered)
  }, 0) / resolved.length
  const avgSec = Math.floor(avgMs / 1000)
  return avgSec < 60
    ? `${avgSec}s`
    : `${Math.floor(avgSec / 60)}m ${avgSec % 60}s`
}
export default function AdminDashboard() {
  const { currentUser, userProfile } = useAuth()
  const hotelCode = userProfile?.adminProfile?.hotelCode

  // ── State ────────────────────────────────────────────────────────────────
  const [hotel, setHotel]             = useState(null)
  const [activeSOS, setActiveSOS]     = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [staffList, setStaffList]     = useState([])
  const [incidents, setIncidents]     = useState([])
  const [openChatId, setOpenChatId]   = useState(null)
  const [activeWalkieChannel, setActiveWalkieChannel] = useState(`public_${hotelCode}`)
  const [loading, setLoading]         = useState(true)

  const todayStats = {
    resolvedCount: incidents.filter(i => i.status === 'resolved').length,
    avgResponseTime: computeAvgResponseTime(incidents),
    pendingApprovals: pendingCount,
  }

  // ── 1. Fetch hotel config from Firestore ────────────────────────────────
  useEffect(() => {
    if (!hotelCode) { setLoading(false); return }

    const fetchHotel = async () => {
      try {
        const snap = await getDoc(doc(db, 'hotels', hotelCode))
        if (snap.exists()) setHotel(snap.data())
      } catch (err) {
        console.error('Failed to fetch hotel:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHotel()
  }, [hotelCode])

  // ── 2. Listen to active SOS from Realtime Database ──────────────────────
  useEffect(() => {
    if (!hotelCode) return

    const sosRef = ref(rtdb, `sos/${hotelCode}`)
    const unsub = onValue(sosRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) { setActiveSOS([]); return }

      const sosList = Object.entries(data).map(([key, val]) => ({
        incidentId: key,
        ...val,
      }))
      setActiveSOS(sosList)
    })

    return () => unsub()
  }, [hotelCode])

  // ── 3. Listen to pending staff requests count from Firestore ───────────
  useEffect(() => {
    if (!hotelCode) return

    const q = query(
      collection(db, 'staff_requests'),
      where('hotelCode', '==', hotelCode),
      where('status', '==', 'pending')
    )
    const unsub = onSnapshot(q, (snap) => {
      setPendingCount(snap.size)
    })

    return () => unsub()
  }, [hotelCode])

  // ── 4. Listen to staff details ─────────────────────────────────────────
  useEffect(() => {
    if (!hotelCode) return

    const q = query(
      collection(db, 'users'),
      where('hotelCode', '==', hotelCode),
      where('role', '==', 'staff')
    )
    const unsub = onSnapshot(q, (snap) => {
      setStaffList(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
    })

    return () => unsub()
  }, [hotelCode])

  // ── 5. Listen to incidents for today history ───────────────────────────
  useEffect(() => {
    if (!hotelCode) return

    const q = query(
      collection(db, 'incident_history'),
      where('hotelCode', '==', hotelCode)
    )
    const unsub = onSnapshot(q, (snap) => {
      setIncidents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    return () => unsub()
  }, [hotelCode])

  // ── Resolve an emergency ───────────────────────────────────────────────
  const handleResolve = async (sosData) => {
    try {
      // 1. Remove from Realtime DB
      await remove(ref(rtdb, `sos/${hotelCode}/${sosData.incidentId}`))

      // 2. Write resolved record to Firestore incident_history
      await addDoc(collection(db, 'incident_history'), {
        ...sosData,
        hotelCode,
        status:          'resolved',
        resolvedAt:      serverTimestamp(),
        resolvedBy:      userProfile?.name || 'Admin',
        resolvedByUid:   currentUser.uid,
        resolutionNotes: '',
      })

      if (openChatId === sosData.incidentId) setOpenChatId(null)
      toast.success(`Incident in Room ${sosData.roomNumber} resolved.`)
    } catch (err) {
      console.error('Failed to resolve:', err)
      toast.error('Failed to resolve incident.')
    }
  }

  // ── Loading & no-hotel guard ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-blue-500">progress_activity</span>
      </div>
    )
  }

  if (!hotelCode) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">No hotel registered yet.</p>
          <a href="/admin/register-hotel" className="text-blue-600 underline font-bold">Register your hotel</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <AdminSidebar hotelCode={hotelCode} pendingCount={pendingCount} />
      <main className="flex-1 flex flex-col h-screen min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Real-Time Dashboard</h1>
            <p className="text-sm text-slate-500 font-medium">{activeSOS.length} Active Emergencies</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer hover:bg-slate-50 p-2 rounded-full transition">
              <span className="material-symbols-outlined text-slate-600 outline-none">notifications</span>
              {activeSOS.length > 0 && (
                <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-mono text-sm border border-blue-200">
                {userProfile?.name?.charAt(0) || 'A'}
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-800 truncate max-w-[120px]">{userProfile?.name || 'Admin User'}</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            
            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Left Column: Grid */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500">grid_on</span>
                      Live Facility Map
                    </h2>
                    <span className="text-xs font-bold px-3 py-1 bg-green-100 text-green-700 rounded-full tracking-wide">
                      System Online
                    </span>
                  </div>
                  <div className="p-6 overflow-x-auto flex justify-center">
                    <div className="inline-block max-w-full">
                      <RoomGrid 
                        floorLayout={hotel?.hotelConfig?.floorLayout || {}} 
                        activeSOS={activeSOS} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Active SOS & Chat */}
              <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
                {openChatId ? (
                  <div className="flex-1 flex flex-col min-h-0 relative z-20 shadow-2xl rounded-xl">
                     <button
                        onClick={() => setOpenChatId(null)}
                        className="absolute right-3 top-3 z-30 text-slate-400 hover:text-slate-800 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center"
                     >
                       <span className="material-symbols-outlined text-sm">close</span>
                     </button>
                     <ChatWindow 
                        channelId={openChatId}
                        currentUser={currentUser}
                        userProfile={userProfile}
                        title={`Emergency Chat`}
                     />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
                      <span className="material-symbols-outlined text-red-500">emergency</span>
                      <h2 className="font-bold text-slate-800">Active Alerts</h2>
                      <span className="ml-auto bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{activeSOS.length}</span>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
                      {activeSOS.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-5xl mb-3 opacity-30">check_circle</span>
                          <p className="font-medium text-sm">All clear.</p>
                          <p className="text-xs">No active emergencies.</p>
                        </div>
                      ) : (
                        activeSOS.map(sos => (
                          <IncidentCard 
                            key={sos.incidentId} 
                            sosData={sos} 
                            onViewChat={setOpenChatId}
                            onMarkResolved={handleResolve}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </main>

      {/* Floating Walkie-Talkie Panel - Draggable */}
      <DraggablePanel defaultPos={{ x: 280, y: window.innerHeight - 450 }}>
        <div className="w-80 shadow-2xl rounded-xl">
          <WalkiePanelAdmin 
            hotelCode={hotelCode}
            activeSOS={activeSOS}
            staffList={staffList}
            currentUser={currentUser}
            userProfile={userProfile}
          />
        </div>
      </DraggablePanel>

      {/* Admin AI Assistant — floating bubble bottom right */}
      <AdminAIChatbot
        hotel={hotel}
        activeSOS={activeSOS}
        staffList={staffList}
        todayStats={todayStats}
        currentUser={currentUser}
      />
    </div>
  )
}
