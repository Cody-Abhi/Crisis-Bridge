import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage         from './pages/Landing'
import LoginPage           from './pages/auth/Login'
import SignupPage          from './pages/auth/Signup'
import AdminDashboard      from './pages/admin/AdminDashboard'
import RegisterHotel       from './pages/admin/RegisterHotel'
import StaffManagement     from './pages/admin/StaffManagement'
import IncidentHistory     from './pages/admin/IncidentHistory'
import StaffChat           from './pages/admin/StaffChat'
import StaffDashboard      from './pages/staff/StaffDashboard'
import StaffPending        from './pages/staff/StaffPending'
import StaffProfile        from './pages/staff/StaffProfile'
import GuestModeSelect     from './pages/guest/ModeSelect'
import GuestDashboard      from './pages/guest/GuestDashboard'
import GuestHistory        from './pages/guest/GuestHistory'
import HotelRegistration   from './pages/guest/HotelRegistration'
import ProtectedRoute      from './components/layout/ProtectedRoute'
import { AuthProvider }    from './contexts/AuthContext'
import { Toaster }         from 'react-hot-toast'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Public */}
          <Route path="/"        element={<LandingPage />} />
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/signup"  element={<SignupPage />} />

          {/* Admin (protected) */}
          <Route path="/admin/dashboard"      element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/register-hotel" element={<ProtectedRoute role="admin"><RegisterHotel /></ProtectedRoute>} />
          <Route path="/admin/chat"           element={<ProtectedRoute role="admin"><StaffChat /></ProtectedRoute>} />
          <Route path="/admin/staff"          element={<ProtectedRoute role="admin"><StaffManagement /></ProtectedRoute>} />
          <Route path="/admin/incidents"      element={<ProtectedRoute role="admin"><IncidentHistory /></ProtectedRoute>} />

          {/* Staff (protected) */}
          <Route path="/staff/dashboard" element={<ProtectedRoute role="staff"><StaffDashboard /></ProtectedRoute>} />
          <Route path="/staff/pending"   element={<ProtectedRoute role="staff"><StaffPending /></ProtectedRoute>} />
          <Route path="/staff/profile"   element={<ProtectedRoute role="staff"><StaffProfile /></ProtectedRoute>} />

          {/* Guest (protected) */}
          <Route path="/guest/mode-select"       element={<ProtectedRoute role="guest"><GuestModeSelect /></ProtectedRoute>} />
          <Route path="/guest/hotel-registration" element={<ProtectedRoute role="guest"><HotelRegistration /></ProtectedRoute>} />
          <Route path="/guest/dashboard"         element={<ProtectedRoute role="guest"><GuestDashboard /></ProtectedRoute>} />
          <Route path="/guest/history"           element={<ProtectedRoute role="guest"><GuestHistory /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
