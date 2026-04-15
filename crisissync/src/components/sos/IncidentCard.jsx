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
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner ${
             sosData.emergencyType === 'fire' ? 'bg-red-50 text-red-600' :
             sosData.emergencyType === 'medical' ? 'bg-green-50 text-green-600' :
             sosData.emergencyType === 'security' ? 'bg-amber-50 text-amber-600' :
             'bg-purple-50 text-purple-600'
          }`}>
            {emergency?.icon}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{emergency?.label}</p>
            <p className="text-xs text-slate-400">{timeAgo(sosData.triggeredAt)}</p>
          </div>
        </div>
        <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-wide ${
          sosData.status === 'active'   ? 'bg-red-50 text-red-600 border border-red-200' :
          sosData.status === 'assigned' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
          'bg-green-50 text-green-600 border border-green-200'
        }`}>
          {sosData.status || 'Active'}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Room</p>
          <p className="font-bold text-slate-800 text-base">{sosData.roomNumber}</p>
        </div>
        <div>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Guest</p>
          <p className="font-semibold text-slate-700 truncate">{sosData.guestName}</p>
        </div>
        <div>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Phone</p>
          <p className="font-semibold text-slate-700">{sosData.guestPhone}</p>
        </div>
        <div>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Assigned Staff</p>
          <p className="font-semibold text-slate-700 truncate">
            {sosData.assignedStaffName || <span className="text-red-500 italic text-xs">Unassigned</span>}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewChat && onViewChat(sosData.incidentId)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 text-white text-xs py-2.5 rounded-lg font-semibold hover:bg-slate-700 transition"
        >
          <span className="text-sm">💬</span> Chat
        </button>
        <button
          onClick={() => onMarkResolved && onMarkResolved(sosData)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white text-xs py-2.5 rounded-lg font-semibold hover:bg-green-600 transition"
        >
          <span className="text-sm">✅</span> Resolve
        </button>
      </div>
    </div>
  )
}
