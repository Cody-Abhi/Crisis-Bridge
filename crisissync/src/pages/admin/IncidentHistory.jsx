import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../firebase/config'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import AdminSidebar from '../../components/layout/AdminSidebar'
import { formatDate, formatTime } from '../../utils/timeHelpers'
import { getEmergency } from '../../utils/emergencyHelpers'

export default function IncidentHistory() {
  const { userProfile } = useAuth()
  const hotelCode = userProfile?.adminProfile?.hotelCode

  // ── Live state from Firestore ──────────────────────────────────────────
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)

  // ── Listen to incident_history collection ──────────────────────────────
  useEffect(() => {
    if (!hotelCode) { setLoading(false); return }

    const q = query(
      collection(db, 'incident_history'),
      where('hotelCode', '==', hotelCode),
      orderBy('resolvedAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setHistory(records)
      setLoading(false)
    }, (err) => {
      console.error('Incident history listener error:', err)
      setLoading(false)
    })

    return () => unsub()
  }, [hotelCode])

  // Helper to safely convert Firestore timestamp or millis to Date
  const toDate = (ts) => {
    if (!ts) return null
    if (ts.toDate) return ts.toDate()
    if (typeof ts === 'number') return new Date(ts)
    return new Date(ts)
  }

  const getDuration = (start, end) => {
    const startDate = toDate(start)
    const endDate   = toDate(end)
    if (!startDate || !endDate) return '-'
    const mins = Math.round((endDate - startDate) / 60000)
    return `${mins} mins`
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <AdminSidebar hotelCode={hotelCode} />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <header>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Incident Log</h1>
            <p className="text-slate-500 mt-1 font-medium">Historical record of all resolved emergencies.</p>
          </header>

          {loading ? (
            <div className="flex justify-center py-20">
              <span className="material-symbols-outlined animate-spin text-4xl text-blue-500">progress_activity</span>
            </div>
          ) : (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                       <th className="p-4 font-bold">Date & Time</th>
                       <th className="p-4 font-bold">Type</th>
                       <th className="p-4 font-bold">Room</th>
                       <th className="p-4 font-bold">Details</th>
                       <th className="p-4 font-bold">Resolution</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 text-sm">
                     {history.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-slate-400 italic">No historical records found.</td>
                        </tr>
                     ) : history.map(incident => {
                       const emergency = getEmergency(incident.emergencyType)
                       const triggeredDate = toDate(incident.triggeredAt)
                       return (
                         <tr key={incident.id} className="hover:bg-slate-50/50 transition">
                           <td className="p-4 text-slate-500 font-medium">
                             {triggeredDate ? triggeredDate.toLocaleDateString() : '-'} <br/>
                             <span className="text-xs">{triggeredDate ? triggeredDate.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : ''}</span>
                           </td>
                           <td className="p-4">
                              <div className="flex items-center gap-2">
                                 <span className="text-lg">{emergency?.icon}</span>
                                 <span className="font-bold text-slate-700">{emergency?.label}</span>
                              </div>
                           </td>
                           <td className="p-4 font-bold text-slate-800 text-base">
                             {incident.roomNumber}
                           </td>
                           <td className="p-4">
                             <p className="text-slate-700 font-semibold">{incident.guestName || '-'}</p>
                             <p className="text-xs text-slate-400 mt-1">Duration: {getDuration(incident.triggeredAt, incident.resolvedAt)}</p>
                           </td>
                           <td className="p-4 max-w-xs">
                             <p className="text-slate-800 line-clamp-2" title={incident.resolutionNotes}>{incident.resolutionNotes || '-'}</p>
                             <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">By {incident.resolvedBy || 'Admin'}</p>
                           </td>
                         </tr>
                       )
                     })}
                   </tbody>
                 </table>
               </div>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}
