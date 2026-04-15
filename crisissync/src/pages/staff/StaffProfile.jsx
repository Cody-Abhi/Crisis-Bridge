// src/pages/staff/StaffProfile.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { STAFF_DESIGNATIONS } from '../../utils/emergencyHelpers'
import toast from 'react-hot-toast'

export default function StaffProfile() {
  const { userProfile, currentUser, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const sp = userProfile?.staffProfile
  const designation = STAFF_DESIGNATIONS[sp?.designation]

  const handleBackToDashboard = () => navigate('/staff/dashboard')

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleBackToDashboard}
            className="text-slate-400 hover:text-white transition text-sm"
          >
            ← Back
          </button>
          <h1 className="text-xl font-black text-white">My Profile</h1>
        </div>

        {/* Avatar + Name */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl flex-shrink-0">
            {userProfile?.name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <div>
            <h2 className="text-white font-black text-lg">{userProfile?.name || '—'}</h2>
            <p className="text-slate-400 text-sm">{userProfile?.email}</p>
            <span className={`inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full
              ${sp?.isApproved
                ? 'bg-green-500/20 text-green-400'
                : 'bg-amber-500/20 text-amber-400'
              }`
            }>
              {sp?.isApproved ? '✅ Approved' : '⏳ Pending Approval'}
            </span>
          </div>
        </div>

        {/* Hotel Details */}
        <div className="bg-slate-800 rounded-2xl p-5 mb-4">
          <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4">Hotel Assignment</h3>
          <div className="space-y-3">
            <ProfileRow label="Hotel" value={sp?.hotelName || '—'} />
            <ProfileRow label="Hotel Code" value={<code className="font-mono text-blue-400">{sp?.hotelCode || '—'}</code>} />
            <ProfileRow label="Designation" value={`${designation?.icon || ''} ${designation?.label || sp?.designation || '—'}`} />
            <ProfileRow label="Employee ID" value={sp?.employeeId || 'N/A'} />
          </div>
        </div>

        {/* Status */}
        <div className="bg-slate-800 rounded-2xl p-5 mb-4">
          <h3 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4">Current Status</h3>
          <div className="space-y-3">
            <ProfileRow
              label="On Duty"
              value={
                <span className={`font-bold ${sp?.isOnDuty ? 'text-green-400' : 'text-slate-400'}`}>
                  {sp?.isOnDuty ? '● On Duty' : '○ Off Duty'}
                </span>
              }
            />
            <ProfileRow
              label="Active Incidents"
              value={`${sp?.activeIncidents?.length || 0} incident(s)`}
            />
            <ProfileRow
              label="Phone"
              value={userProfile?.phone || 'N/A'}
            />
          </div>
        </div>

        {/* Back to dashboard */}
        <button
          onClick={handleBackToDashboard}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}

const ProfileRow = ({ label, value }) => (
  <div className="flex items-center justify-between py-1 border-b border-slate-700/50 last:border-0">
    <span className="text-slate-400 text-sm">{label}</span>
    <span className="text-white font-semibold text-sm">{value}</span>
  </div>
)
