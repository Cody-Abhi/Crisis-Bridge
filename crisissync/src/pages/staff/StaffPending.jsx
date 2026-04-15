// src/pages/staff/StaffPending.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'

function timeAgoFromDate(ts) {
  if (!ts) return 'Recently'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return `${diff} seconds ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  return `${Math.floor(diff / 86400)} days ago`
}

export default function StaffPending() {
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!currentUser) return

    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      const data = snap.data()
      if (data?.staffProfile?.isApproved === true) {
        refreshProfile()
        navigate('/staff/dashboard')
      }
    })

    return () => unsub()
  }, [currentUser])

  const sp = userProfile?.staffProfile
  const designationMap = {
    fire_safety: '🔥 Fire Safety Officer',
    medical:     '🏥 Medical Responder',
    security:    '🛡️ Security Personnel',
    general:     '👷 General Staff',
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Icon + Heading */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 animate-pulse">⏳</div>
          <h1 className="text-2xl font-black text-white mb-2">Account Pending Approval</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your hotel admin needs to approve your account before you can access the dashboard.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6">
          <h3 className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-4">
            Your Submission
          </h3>
          <div className="space-y-3">
            <InfoRow label="Hotel" value={sp?.hotelName || '—'} />
            <InfoRow label="Hotel Code" value={sp?.hotelCode || '—'} />
            <InfoRow label="Designation" value={designationMap[sp?.designation] || sp?.designation || '—'} />
            <InfoRow label="Submitted" value={timeAgoFromDate(userProfile?.createdAt)} />
            <InfoRow label="Status" value={
              <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1 rounded-full">
                PENDING REVIEW
              </span>
            } />
          </div>
        </div>

        {/* Auto-refresh note */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>This page checks for approval automatically. No need to refresh.</span>
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  )
}

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-400 text-sm">{label}</span>
    <span className="text-white font-semibold text-sm">{value}</span>
  </div>
)
