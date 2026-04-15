export const EMERGENCY_TYPES = {
  fire:     { label: 'Fire Emergency',     color: '#DC2626', bg: 'bg-red-600',    border: 'border-red-600',    text: 'text-red-600',    icon: '🔴' },
  medical:  { label: 'Medical Emergency',  color: '#16A34A', bg: 'bg-green-600',  border: 'border-green-600',  text: 'text-green-600',  icon: '🟢' },
  security: { label: 'Security Emergency', color: '#F59E0B', bg: 'bg-amber-500',  border: 'border-amber-500',  text: 'text-amber-500',  icon: '🟡' },
  common:   { label: 'Common Emergency',   color: '#7C3AED', bg: 'bg-purple-600', border: 'border-purple-600', text: 'text-purple-600', icon: '🆘' },
}

export const getEmergency = (type) => EMERGENCY_TYPES[type] || EMERGENCY_TYPES.common

export const STAFF_DESIGNATIONS = {
  fire_safety: { label: 'Fire Safety Officer',  icon: '🔥', sosTrigger: 'fire'     },
  medical:     { label: 'Medical Responder',     icon: '🏥', sosTrigger: 'medical'  },
  security:    { label: 'Security Personnel',    icon: '🛡️', sosTrigger: 'security' },
  general:     { label: 'General Staff',         icon: '👷', sosTrigger: 'common'   },
}
