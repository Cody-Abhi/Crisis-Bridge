// src/components/staff/StaffSidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { STAFF_DESIGNATIONS } from '../../utils/emergencyHelpers'
import OnDutyToggle from './OnDutyToggle'
import toast from 'react-hot-toast'

export default function StaffSidebar({ isOnDuty, onToggleDuty, activeTab, onTabChange }) {
  const { logout, userProfile } = useAuth()
  const navigate = useNavigate()

  const designation = STAFF_DESIGNATIONS[userProfile?.staffProfile?.designation]

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (err) {
      toast.error('Logout failed')
    }
  }

  const tabs = [
    { id: 'grid',      icon: '🏨', label: 'Room Grid'    },
    { id: 'incident',  icon: '🚨', label: 'My Assignment' },
    { id: 'chat',      icon: '💬', label: 'Incident Chat' },
    { id: 'group',     icon: '📡', label: 'Group Chat'    },
    { id: 'history',   icon: '📋', label: 'My History'    },
  ]

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <svg className="sidebar-brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="14" r="0.5" fill="currentColor" />
        </svg>
        <span className="sidebar-brand-text">CRISIS BRIDGE</span>
      </div>

      {/* Staff Card */}
      <div className="staff-card stitch-border">
        <div className="staff-card-inner">
          <div className="staff-avatar">
            {userProfile?.name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <div className="staff-info">
            <div className="staff-name">{userProfile?.name || 'Staff'}</div>
            <div className={`staff-designation ${userProfile?.staffProfile?.designation === 'fire_safety' ? 'fire' : userProfile?.staffProfile?.designation === 'medical' ? 'medical' : 'fire'}`}>
              {designation?.icon} {designation?.label || 'Staff'}
            </div>
          </div>
        </div>
        <div className="staff-hotel">{userProfile?.staffProfile?.hotelName}</div>
        <div className="staff-hotel-code">{userProfile?.staffProfile?.hotelCode}</div>
      </div>

      {/* Duty Section */}
      <div className="duty-section">
        <div className="duty-label">DUTY STATUS</div>
        <button
          className={`duty-toggle ${isOnDuty ? 'on' : 'off'}`}
          onClick={() => onToggleDuty(!isOnDuty)}
        >
          {isOnDuty ? '● ON DUTY' : 'OFF DUTY'}
        </button>
        <div className="duty-subtext">
          You will receive SOS alerts when on duty
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="nav-emoji">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Emergency Lines */}
      <div className="emergency-lines">
        <div className="emergency-title">EMERGENCY LINES</div>
        <div className="emergency-row">
          <span>🔴</span>
          <a href="tel:101">Fire 101</a>
        </div>
        <div className="emergency-row">
          <span>🟢</span>
          <a href="tel:108">Ambulance 108</a>
        </div>
        <div className="emergency-row">
          <span>🔵</span>
          <a href="tel:100">Police 100</a>
        </div>
        <button
          onClick={handleLogout}
          style={{ marginTop: 16, width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}
        >
          ← Sign Out
        </button>
      </div>
    </aside>
  )
}
