import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../firebase/config'
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import AdminSidebar from '../../components/layout/AdminSidebar'
import toast from 'react-hot-toast'
import { formatDate } from '../../utils/timeHelpers'

export default function StaffManagement() {
  const { currentUser, userProfile } = useAuth()
  const hotelCode = userProfile?.adminProfile?.hotelCode

  // ── Live state from Firestore ──────────────────────────────────────────
  const [pendingRequests, setPendingRequests] = useState([])
  const [activeStaff, setActiveStaff]         = useState([])

  // ── 1. Listen to pending staff requests ────────────────────────────────
  useEffect(() => {
    if (!hotelCode) return

    const q = query(
      collection(db, 'staff_requests'),
      where('hotelCode', '==', hotelCode),
      where('status', '==', 'pending')
    )
    const unsub = onSnapshot(q, (snap) => {
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPendingRequests(requests)
    })

    return () => unsub()
  }, [hotelCode])

  // ── 2. Listen to approved staff for this hotel ─────────────────────────
  useEffect(() => {
    if (!hotelCode) return

    const q = query(
      collection(db, 'users'),
      where('role', '==', 'staff'),
      where('staffProfile.hotelCode', '==', hotelCode),
      where('staffProfile.isApproved', '==', true)
    )
    const unsub = onSnapshot(q, (snap) => {
      const staff = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setActiveStaff(staff)
    })

    return () => unsub()
  }, [hotelCode])

  // ── Approve staff ──────────────────────────────────────────────────────
  const handleApprove = async (req) => {
    try {
      // 1. Update the user doc → staffProfile.isApproved = true
      await updateDoc(doc(db, 'users', req.staffId), {
        'staffProfile.isApproved': true,
        'staffProfile.approvedBy': currentUser.uid,
        'staffProfile.approvedAt': serverTimestamp(),
      })

      // 2. Update the staff_requests doc status
      await updateDoc(doc(db, 'staff_requests', req.staffId), {
        status: 'approved',
        approvedBy: currentUser.uid,
        approvedAt: serverTimestamp(),
      })

      toast.success(`${req.staffName} approved.`)
    } catch (err) {
      console.error('Approve failed:', err)
      toast.error('Failed to approve staff.')
    }
  }

  // ── Reject staff ──────────────────────────────────────────────────────
  const handleReject = async (req) => {
    try {
      // Update status in staff_requests
      await updateDoc(doc(db, 'staff_requests', req.staffId), {
        status: 'rejected',
        rejectedBy: currentUser.uid,
        rejectedAt: serverTimestamp(),
      })

      toast.error(`${req.staffName} rejected.`)
    } catch (err) {
      console.error('Reject failed:', err)
      toast.error('Failed to reject staff.')
    }
  }

  // ── Remove staff ──────────────────────────────────────────────────────
  const handleRemove = async (staffUid) => {
    try {
      // Revoke approval
      await updateDoc(doc(db, 'users', staffUid), {
        'staffProfile.isApproved': false,
        'staffProfile.approvedBy': null,
        'staffProfile.approvedAt': null,
      })
      toast.success('Staff removed from active roster.')
    } catch (err) {
      console.error('Remove failed:', err)
      toast.error('Failed to remove staff.')
    }
  }

  const getRoleBadge = (role) => {
    const roles = {
      fire_safety: 'bg-red-100 text-red-700 border-red-200',
      medical: 'bg-green-100 text-green-700 border-green-200',
      security: 'bg-amber-100 text-amber-700 border-amber-200',
      general: 'bg-purple-100 text-purple-700 border-purple-200'
    }
    return <span className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-md border ${roles[role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{role?.replace('_', ' ')}</span>
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <AdminSidebar hotelCode={hotelCode} pendingCount={pendingRequests.length} />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <header>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Staff Management</h1>
            <p className="text-slate-500 mt-1 font-medium">Approve and manage your emergency response team.</p>
          </header>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
               <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500">pending_actions</span>
                  <h2 className="font-bold text-amber-800">{pendingRequests.length} Pending Staff Requests</h2>
               </div>
               <div className="divide-y divide-slate-100 p-2">
                 {pendingRequests.map(req => (
                   <div key={req.staffId} className="flex items-center justify-between p-4 hover:bg-slate-50 transition rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                          {req.staffName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{req.staffName}</p>
                          <p className="text-xs text-slate-500">{req.staffEmail}</p>
                        </div>
                        <div className="ml-4">
                          {getRoleBadge(req.designation)}
                        </div>
                        <div className="ml-4 text-xs text-slate-400">
                           Applied {formatDate(req.requestedAt)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => handleApprove(req)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition flex items-center gap-1">
                           <span className="material-symbols-outlined text-[16px]">check</span> Approve
                         </button>
                         <button onClick={() => handleReject(req)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 hover:text-red-600 transition flex items-center gap-1">
                           <span className="material-symbols-outlined text-[16px]">close</span> Reject
                         </button>
                      </div>
                   </div>
                 ))}
               </div>
            </section>
          )}

          {/* Active Staff Table */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-500">group</span>
                <h2 className="font-bold text-slate-800">Active Staff Registry</h2>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                     <th className="p-4 font-bold">Name</th>
                     <th className="p-4 font-bold">Designation</th>
                     <th className="p-4 font-bold">Status</th>
                     <th className="p-4 font-bold">Active Incident</th>
                     <th className="p-4 font-bold text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-sm">
                   {activeStaff.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400 italic">No active staff members.</td>
                      </tr>
                   ) : activeStaff.map(staff => (
                     <tr key={staff.id} className="hover:bg-slate-50/50 transition">
                       <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
                            {staff.name?.charAt(0)}
                          </div>
                          {staff.name}
                       </td>
                       <td className="p-4">
                         {getRoleBadge(staff.staffProfile?.designation)}
                       </td>
                       <td className="p-4">
                         {staff.staffProfile?.isOnDuty ? (
                           <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-bold w-max">
                             <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> On Duty
                           </span>
                         ) : (
                           <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-500 text-xs w-max font-bold">
                             <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Off Duty
                           </span>
                         )}
                       </td>
                       <td className="p-4 text-slate-500">
                         {staff.staffProfile?.activeIncidents?.length > 0 ? (
                           <span className="text-red-500 font-medium">Active ({staff.staffProfile.activeIncidents.length})</span>
                         ) : '-'}
                       </td>
                       <td className="p-4 text-right">
                         <button onClick={() => handleRemove(staff.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Remove Staff">
                           <span className="material-symbols-outlined text-[20px]">person_remove</span>
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </section>

        </div>
      </main>
    </div>
  )
}
