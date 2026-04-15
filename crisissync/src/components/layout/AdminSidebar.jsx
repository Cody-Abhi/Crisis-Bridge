import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AdminSidebar({ hotelCode, pendingCount = 0 }) {
  const { logout, userProfile } = useAuth()
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
      toast.success('Logged out successfully')
    } catch (error) {
      console.error(error)
      // fallback
      navigate('/')
    }
  }

  const links = [
    { to: '/admin/dashboard',  icon: 'dashboard', label: 'Dashboard'  },
    { to: '/admin/chat',       icon: 'forum',     label: 'Staff Chat'  },
    { to: '/admin/staff',      icon: 'groups',    label: 'Staff Requests' },
    { to: '/admin/incidents',  icon: 'history',   label: 'Incidents'  },
  ]

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-slate-900 h-screen flex flex-col relative z-40 shadow-xl border-r border-slate-800 shrink-0`}>
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-slate-800 text-slate-300 hover:text-white rounded-full w-6 h-6 flex items-center justify-center border border-slate-700 shadow-md z-50"
      >
        <span className="material-symbols-outlined text-[14px]">
          {isCollapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      {/* Logo */}
      <div className={`p-6 border-b border-white/5 flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
        <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
          <span className="text-white font-black text-[10px] tracking-wider">SOS</span>
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <span className="text-white font-black text-xl tracking-tight block">CrisisSync</span>
            <p className="text-slate-400 text-xs mt-1 font-medium truncate">
              {userProfile?.adminProfile?.hotelName || 'My Hotel'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 p-4 space-y-2 ${isCollapsed ? 'px-2' : ''}`}>
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            title={isCollapsed ? l.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isCollapsed ? 'justify-center px-0' : 'px-4'
              } ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{l.icon}</span>
            {!isCollapsed && <span>{l.label}</span>}
            {l.to === '/admin/staff' && pendingCount > 0 && !isCollapsed && (
              <span className="ml-auto bg-amber-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">
                {pendingCount}
              </span>
            )}
            {l.to === '/admin/staff' && pendingCount > 0 && isCollapsed && (
              <span className="absolute right-2 top-2 bg-amber-500 text-white w-2 h-2 rounded-full"></span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Context Area */}
      <div className={`p-5 border-t border-white/5 relative ${isCollapsed ? 'items-center px-2 flex flex-col' : ''}`}>
        {!isCollapsed && <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2">Hotel Code</p>}
        {isCollapsed ? (
           <button
             onClick={() => { 
                if(hotelCode) {
                    navigator.clipboard.writeText(hotelCode); 
                    toast.success('Code copied!') 
                }
             }}
             className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600 transition flex items-center justify-center mb-4"
             title="Copy Hotel Code"
           >
             <span className="material-symbols-outlined text-[16px]">content_copy</span>
           </button>
        ) : (
          <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50 mb-4">
            <code className="flex-1 text-center text-slate-200 font-mono font-bold text-sm tracking-widest">
              {hotelCode || '------'}
            </code>
            <button
              onClick={() => { 
                  if(hotelCode) {
                      navigator.clipboard.writeText(hotelCode); 
                      toast.success('Code copied!') 
                  }
              }}
              className="w-8 h-8 rounded bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600 transition flex items-center justify-center"
              title="Copy Hotel Code"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
            </button>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Sign Out" : undefined}
          className={`w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-400 text-sm py-2 font-semibold transition ${isCollapsed ? 'px-0' : ''}`}
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  )
}
