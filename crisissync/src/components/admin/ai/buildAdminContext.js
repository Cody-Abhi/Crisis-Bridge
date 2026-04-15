// buildAdminContext.js — Builds a live context string injected into every Gemini call
//
// This is what makes the AI context-aware — it sees THIS hotel's real-time
// state, not generic knowledge. The context is rebuilt fresh before every
// single API call so even mid-conversation changes are reflected.

/**
 * Normalizes activeSOS into an array regardless of whether it arrives
 * as an Object (from raw RTDB) or Array (from AdminDashboard state).
 */
const normalizeSOSEntries = (activeSOS) => {
  if (!activeSOS) return []
  if (Array.isArray(activeSOS)) return activeSOS
  return Object.values(activeSOS)
}

/**
 * Formats an age duration from a triggeredAt timestamp into human-readable text.
 */
const formatAge = (triggeredAt) => {
  if (!triggeredAt) return 'unknown time ago'
  const totalSec = Math.max(0, Math.floor((Date.now() - triggeredAt) / 1000))
  if (totalSec < 60) return `${totalSec}s ago`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}m ${sec}s ago`
}

/**
 * Builds a structured plain-text context string from live Firebase data.
 *
 * @param {Object}       hotel      Firestore hotel document
 * @param {Object|Array} activeSOS  Active SOS signals (object or array)
 * @param {Array}        staffList  Array of staff user documents
 * @param {Object}       todayStats { resolvedCount, avgResponseTime, pendingApprovals }
 * @returns {string}     Formatted context string for Gemini system prompt
 */
export const buildAdminContext = (hotel, activeSOS, staffList, todayStats) => {
  if (!hotel) return 'Hotel data not available yet. The admin just opened the dashboard.'

  const now = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  // ── Active SOS lines ────────────────────────────────────────────────────
  const sosEntries = normalizeSOSEntries(activeSOS).slice(0, 10) // Cap at 10
  const sosLines = sosEntries.length > 0
    ? sosEntries.map(s => {
        const age = formatAge(s.triggeredAt)
        const type = (s.emergencyType || 'unknown').toUpperCase()
        const room = s.roomNumber || '?'
        const assigned = s.assignedStaffName
          ? `Assigned: ${s.assignedStaffName} (${s.assignedDesignation || 'staff'})`
          : 'UNASSIGNED — needs immediate attention'
        return `  - Room ${room}: ${type} | Triggered ${age} | ${assigned}`
      }).join('\n')
    : '  None — hotel is calm, no active emergencies'

  const truncatedNote = normalizeSOSEntries(activeSOS).length > 10
    ? `\n  (${normalizeSOSEntries(activeSOS).length - 10} more emergencies not shown)`
    : ''

  // ── Staff lines ─────────────────────────────────────────────────────────
  const staffEntries = staffList ? staffList.slice(0, 20) : []
  const onDutyCount = staffEntries.filter(s => s.staffProfile?.isOnDuty).length
  const freeCount = staffEntries.filter(
    s => s.staffProfile?.isOnDuty && (!s.staffProfile?.activeIncidents?.length)
  ).length

  const staffLines = staffEntries.length > 0
    ? staffEntries.map(s => {
        const p = s.staffProfile || {}
        const duty = p.isOnDuty ? 'ON DUTY' : 'Off Duty'
        const active = p.activeIncidents?.length > 0
          ? `Handling: Room ${p.activeIncidents[0]}`
          : 'Free'
        return `  - ${s.name || 'Unknown'} | ${p.designation || 'General'} | ${duty} | ${active}`
      }).join('\n')
    : '  No staff data available'

  const staffTruncatedNote = staffList && staffList.length > 20
    ? `\n  (${staffList.length - 20} more staff not shown)`
    : ''

  // ── Assemble full context ───────────────────────────────────────────────
  return `
Hotel: ${hotel.hotelName || 'Unknown Hotel'} (Code: ${hotel.hotelCode || '?'})
Time: ${now} | Floors: ${hotel.hotelConfig?.totalFloors || '?'} | Rooms: ${hotel.hotelConfig?.totalRooms || '?'}

ACTIVE EMERGENCIES (${sosEntries.length}):
${sosLines}${truncatedNote}

STAFF (${staffEntries.length} total, ${onDutyCount} on duty, ${freeCount} free):
${staffLines}${staffTruncatedNote}

OPERATIONS TODAY:
  - Incidents resolved: ${todayStats?.resolvedCount ?? 0}
  - Average response time: ${todayStats?.avgResponseTime ?? 'N/A'}
  - Pending staff approvals: ${todayStats?.pendingApprovals ?? 0}
`.trim()
}
