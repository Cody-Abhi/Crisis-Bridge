import { useState } from 'react'
import { getEmergency } from '../../utils/emergencyHelpers'

const SOS_ANIMATIONS = {
  fire:     'bg-red-600     shadow-red-500/50     shadow-lg animate-[sos-pulse_1s_ease-in-out_infinite]',
  medical:  'bg-green-600   shadow-green-500/50   shadow-lg animate-[sos-pulse_1s_ease-in-out_infinite]',
  security: 'bg-amber-500   shadow-amber-400/50   shadow-lg animate-[sos-pulse_1s_ease-in-out_infinite]',
  common:   'bg-purple-600  shadow-purple-500/50  shadow-lg animate-[sos-pulse_1s_ease-in-out_infinite]',
}

export default function RoomBlock({ roomNumber, sosData, onClick }) {
  const [hovered, setHovered] = useState(false)

  const isActive = !!sosData
  const emergency = isActive ? getEmergency(sosData.emergencyType) : null

  return (
    <div
      onClick={() => isActive && onClick && onClick(sosData)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative w-12 h-12 rounded-lg flex flex-col items-center justify-center
        text-xs font-bold transition-all duration-300 select-none
        ${isActive
          ? `${SOS_ANIMATIONS[sosData.emergencyType] || SOS_ANIMATIONS.common} text-white cursor-pointer`
          : 'bg-slate-100 border border-slate-200 text-slate-500 cursor-default'
        }
        ${isActive && hovered ? 'scale-110' : ''}
      `}
      title={isActive ? `${emergency.label} — Room ${roomNumber}` : `Room ${roomNumber}`}
    >
      <span className="text-[10px] leading-none">{isActive ? emergency.icon : ''}</span>
      <span className="leading-none mt-0.5">{roomNumber}</span>

      {/* Tooltip on hover */}
      {isActive && hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-xl">
          <p className="font-bold">{emergency?.label}</p>
          <p className="text-slate-300">{sosData.guestName || 'Unknown Guest'}</p>
          <p className="text-slate-400">Status: {sosData.status || 'Active'}</p>
        </div>
      )}
    </div>
  )
}
