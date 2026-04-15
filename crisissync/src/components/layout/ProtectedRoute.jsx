import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cs-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300 text-sm">Loading CrisisSync...</p>
        </div>
      </div>
    )
  }

  // Not logged in → go to login
  if (!currentUser) return <Navigate to="/login" replace />

  // Wrong role → go to login
  if (role && userProfile?.role !== role) return <Navigate to="/login" replace />

  // Staff not approved → go to pending page
  if (role === 'staff' && userProfile?.staffProfile?.isApproved === false) {
    return <Navigate to="/staff/pending" replace />
  }

  return children
}
