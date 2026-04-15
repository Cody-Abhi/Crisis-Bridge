

## G
## 3
Admin AI Assistant
"Your hotel command centre — now with a brain."
Gemini-Powered Chatbot for CrisisSync Admin Dashboard
Feature:Admin AI Assistant Chatbot
Powered By:Google Gemini 1.5 Flash API
UI Style:WhatsApp Meta-style floating bubble
Placement:Bottom-right corner of Admin Dashboard
Cost:Zero — Free Gemini tier (15 req/min)
CrisisSync — Google Big Solution Challenge 2026

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 2
## SECTION 1 — FEATURE OVERVIEW
Admin AI Assistant Chatbot
The Admin AI Assistant is a Gemini-powered floating chatbot bubble positioned at the bottom-right corner
of the CrisisSync Admin Dashboard — exactly like the Meta AI bubble in WhatsApp. It gives the hotel admin
an always-available intelligent assistant that understands the live context of their hotel.
Unlike the Guest chatbot (which only gives safety instructions), the Admin chatbot has full awareness of the
hotel's situation — active SOS incidents, staff on duty, room grid, incident history — and answers questions,
suggests actions, and helps the admin make fast decisions during a crisis.
What the Admin AI Assistant Does
## Situation
## What Admin
## Asks
## What Gemini
## Replies
Fire SOS
active
"What should I do right
now?"
Step-by-step fire protocol: notify local fire brigade
101, ensure evacuation floor 3, check which staff
are on duty...
No staff
accepted
## SOS
"Why hasn't anyone
accepted yet?"
Only 1 fire safety officer is on duty. Raj Kumar is
currently Off Duty. Recommend switching him to On
Duty from Staff Management.
Multiple SOS
at once
"How do I prioritize?"Prioritize Room 201 Fire first (life threat), then Room
305 Medical. Assign general staff to security.
## Slow
response
times
"What's our average
response time today?"
Today's average is 4m 12s. 3 incidents resolved.
Fastest: 1m 30s (Raj Kumar, Fire). Suggest adding
1 more fire staff.
New staff
request
"Should I approve this
staff member?"
Raj Kumar applied as Fire Safety Officer 2 hours
ago. Your hotel currently has 0 fire safety staff on
duty. Recommend approving.
Quiet period"How is the hotel doing
today?"
No active incidents. 8 staff online, 5 on duty. Last
incident resolved 3h ago. Hotel is operating
normally.
## SECTION 2 — CONTEXT AWARENESS (THE KEY FEATURE)

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 3
How the Chatbot Knows the Hotel's Live Situation
Before every Gemini API call, the app builds a live context string from real Firebase data and injects it into
the system prompt. This means Gemini is not answering generic hotel questions — it is answering
specifically about THIS admin's hotel, THIS moment.
The context injected into every Gemini call includes:
- Hotel name, unique code, total floors and rooms
- All currently active SOS signals — room number, emergency type, time since trigger, assigned staff
- List of all staff — name, designation, on-duty status, and whether they have an active incident
- Pending staff approval requests count
- Today's resolved incidents count and average response time
- Current time (so Gemini can say things like 'It's 2 AM, most staff may be off duty')
The System Prompt Structure (sent with every message):
You are an AI assistant for the CrisisSync hotel emergency management system.
You help hotel admins manage emergencies, staff, and operations.
Be concise, actionable, and calm. Always refer to specific rooms and staff by name.
Never say 'I don't know' — use the context provided to give your best specific answer.
## === LIVE HOTEL CONTEXT ===
Hotel: The Grand Palace (Code: HTLX42)
Time: 2:14 AM | Floors: 8 | Rooms: 120
## ACTIVE EMERGENCIES (2):
- Room 305: FIRE | Triggered 3 min ago | Assigned: Raj Kumar (Fire Safety)
- Room 208: MEDICAL | Triggered 1 min ago | UNASSIGNED
STAFF ON DUTY (3 of 8 total):
- Raj Kumar | Fire Safety | ON DUTY | Active: Room 305
- Priya Singh | Medical | ON DUTY | Free
- Amit Verma | General | ON DUTY | Free
PENDING APPROVALS: 1 new staff request
TODAY: 4 incidents resolved | Avg response: 3m 45s
## =========================
Note: The context is rebuilt fresh before every single API call — so if a new SOS triggers mid-conversation, the next
message Gemini sends will already know about it.

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 4
SECTION 3 — UI DESIGN (WhatsApp Meta-Style Bubble)
Visual Behaviour — Exactly Like WhatsApp Meta AI
## Bubble States:
## State
## What It Looks
## Like
## When It
## Shows
## Idle (no
emergency)
Small navy blue circle with 'G' icon,
bottom-right. Subtle slow pulse.
Always visible on admin
dashboard. Quiet hotel.
## Active
emergency
Circle turns RED with pulse animation.
Red dot badge shows active SOS count
## (e.g. '2').
When sos/{hotelCode} in Realtime
DB is non-empty.
## Auto-suggesti
on
Small white message bubble pops above
the circle: 'Room 208 has no staff
assigned. Tap to help.'
30 seconds after an unassigned
SOS is detected.
Chat panel
open
Expands upward into a 360x520px chat
panel. Bubble becomes an X button.
When admin taps the bubble.
## Gemini
thinking
Three animated dots inside the chat
panel. Typing indicator.
While awaiting Gemini API
response.
New AI
message
Bubble bounces once when Gemini
sends a proactive alert.
When Gemini detects an
unattended emergency.
Chat Panel Layout (360px wide, 520px tall):
nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
n  G  Admin AI Assistant        [×]   n  ← Navy header
n     Powered by Gemini              n
n  l Online                          n
nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
n                                      n
n  [AI]: 2 active emergencies right   n  ← AI bubble (left, blue-tinted)
n  now. Room 305 Fire is handled      n
n  by Raj. Room 208 Medical has no   n
n  staff assigned yet.                n
n                                      n
n            [Admin]: Who is free?  ] n  ← Admin message (right, navy)
n                                      n
n  [AI]: Priya Singh (Medical) and   n
n  Amit Verma (General) are both     n
n  on duty and free right now.       n

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 5
n                                      n
nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
n  [  Ask anything about your hotel  ]n  ← Input bar
n                                 [↑] n
nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
Quick Action Chips (shown below input bar):
Pre-written prompt chips that the admin can tap for instant answers — no typing needed:
- "What is happening right now?" — gives full live status summary
- "Who is free to respond?" — lists on-duty staff with no active incident
- "Any unassigned emergencies?" — highlights SOS with no staff assigned
- "Show today's incident summary" — count, types, avg response time
- "Should I approve pending staff?" — recommendation based on current staffing

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 6
SECTION 4 — PROACTIVE AI ALERTS (Admin Does Not Need to Ask)
## Gemini Speaks First — Without Admin Asking
This is the most powerful feature. The chatbot does not only answer questions — it proactively alerts the
admin when it detects a situation that needs attention. It monitors the Firebase Realtime DB and fires a
Gemini call automatically based on specific triggers.
## Trigger Condition
## Time Delay
## Proactive Message
## Shown
New SOS with no staff
assignment
## 30
seconds
'Room 208 Medical SOS has been unassigned for 30
seconds. Priya Singh (Medical) is free. Suggest
opening Staff Management to prompt her.'
SOS active for over 5
minutes
5 minutes'Room 305 Fire has been active for 5 minutes. Raj
Kumar accepted but has not marked Arrived yet.
Consider calling him directly.'
All staff of a category are
off duty
On SOS
trigger
'Fire SOS triggered but all Fire Safety staff are Off Duty.
Recommend switching Raj Kumar to On Duty manually
from Staff Management.'
New staff approval
pending >1 hour
## 60
minutes
'A new staff request from Meena Patel (Medical) has
been pending for 1 hour. You currently have 1 medical
staff on duty.'
Multiple SOS
simultaneously
## Immediat
e
'2 emergencies active simultaneously. Prioritize Room
201 Fire (life threat) over Room 305 Security. Amit
Verma (General) can handle security.'
Tip: Proactive alerts use a simple useEffect listener on the Firebase Realtime DB. When conditions are met, a Gemini
call is made silently in the background and the result is pushed as a new message into the chat — even if the panel is
closed.

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 7
## SECTION 5 — GEMINI API IMPLEMENTATION
5.1 API Details
- Model: gemini-1.5-flash (fastest, lowest cost)
- Free tier: 15 requests/minute, 1 million tokens/day — more than enough for a single admin
- API key: already in .env as VITE_GEMINI_API_KEY (same key used by Guest chatbot)
- No new API key setup required — reuses existing key
## 5.2 The Context Builder Function
// src/components/admin/ai/buildAdminContext.js
export const buildAdminContext = (hotel, activeSOS, staffList, todayStats) => {
const now = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
const sosLines = Object.values(activeSOS).map(s =>
`  - Room ${s.roomNumber}: ${s.emergencyType.toUpperCase()} | ` +
`${Math.floor((Date.now()-s.triggeredAt)/60000)}m ago | ` +
`${s.assignedStaffName ? 'Assigned: '+s.assignedStaffName : 'UNASSIGNED'}`
## ).join('\n') || '  None'
const staffLines = staffList.map(s =>
`  - ${s.name} | ${s.staffProfile.designation} | ` +
`${s.staffProfile.isOnDuty ? 'ON DUTY' : 'Off Duty'} | ` +
`${s.staffProfile.activeIncidents?.length ? 'Active: Room '+s.staffProfile.activeIncidents[0]
: 'Free'}`
## ).join('\n') || '  None'
return `
Hotel: ${hotel.hotelName} (Code: ${hotel.hotelCode})
Time: ${now} | Floors: ${hotel.hotelConfig.totalFloors} | Rooms: ${hotel.hotelConfig.totalRooms}
ACTIVE EMERGENCIES (${Object.keys(activeSOS).length}):
${sosLines}
STAFF STATUS (${staffList.length} total):
${staffLines}
PENDING APPROVALS: ${todayStats.pendingApprovals}
TODAY: ${todayStats.resolvedCount} resolved | Avg response: ${todayStats.avgResponseTime}
## `
## }
## 5.3 The Gemini Call Function
// src/components/admin/ai/callGeminiAdmin.js
export const callGeminiAdmin = async (userMessage, context, conversationHistory) => {
const systemPrompt = `You are an AI assistant for the CrisisSync hotel emergency
management system. You help hotel admins manage emergencies, staff, and operations.
Be concise, direct, and calm. Always refer to specific rooms and staff by name.
Use the live hotel context below to answer specifically — not generically.

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 8
If there are active emergencies, always mention them proactively in your first reply.
Format: plain text only. No markdown. Max 120 words per reply.
## === LIVE HOTEL CONTEXT ===
## ${context}
## ========================= `
const messages = [
// Seed the conversation with system context as first user turn
{ role: 'user', parts: [{ text: systemPrompt }] },
{ role: 'model', parts: [{ text: 'Understood. I am monitoring your hotel.' }] },
// Include conversation history for multi-turn memory
...conversationHistory.map(m => ({
role: m.sender === 'admin' ? 'user' : 'model',
parts: [{ text: m.text }]
## })),
// Current message
{ role: 'user', parts: [{ text: userMessage }] }
## ]
const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent` +
`?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
## {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
contents: messages,
generationConfig: {
temperature:     0.4,   // Low = factual, not creative
maxOutputTokens: 200,   // ~120 words max
topP:            0.8,
## }
## })
## }
## )
const data = await response.json()
return data.candidates?.[0]?.content?.parts?.[0]?.text
|| 'I could not generate a response. Please try again.'
## }

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 9
## SECTION 6 — COMPONENT SPECIFICATION
File to Create:
src/components/admin/ai/AdminAIChatbot.jsx   ← single file, all logic inside
Props it receives from AdminDashboard.jsx:
## Prop
## Type
## Source
## Purpose
hotelobjectFirestore hotel docHotel name, code, config for context
activeSOSobjectFirebase Realtime DBAll active SOS — room, type, assigned
staff
staffListarrayFirestore users queryAll staff — name, designation, duty status
todayStatsobjectComputed in
AdminDashboard
Incident count, avg response, pending
approvals
currentUserobjectuseAuth()Admin's uid and name
State Variables inside AdminAIChatbot.jsx:
## Variable
## Type
## Purpose
isOpenbooleanWhether the chat panel is expanded or collapsed
messagesarrayFull conversation history [{sender, text, timestamp}]
inputTextstringCurrent value of the text input field
isLoadingbooleanTrue while waiting for Gemini API response
hasUnreadbooleanRed badge shown when new AI message arrives with panel
closed
unreadCountnumberNumber shown in the red notification badge
proactiveChecke
d
SetTrack which SOS IDs have already triggered a proactive alert

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 10
SECTION 7 — PROACTIVE ALERT LOGIC (useEffect)
// Inside AdminAIChatbot.jsx
// Watch activeSOS for unassigned emergencies older than 30 seconds
useEffect(() => {
if (!activeSOS || Object.keys(activeSOS).length === 0) return
const checkProactive = async () => {
for (const [room, sos] of Object.entries(activeSOS)) {
const alertKey = `${sos.incidentId}_unassigned`
const ageSeconds = (Date.now() - sos.triggeredAt) / 1000
// Trigger: SOS is unassigned AND older than 30 seconds AND not yet alerted
if (!sos.assignedStaffId && ageSeconds > 30 && !proactiveChecked.has(alertKey)) {
setProactiveChecked(prev => new Set([...prev, alertKey]))
const ctx = buildAdminContext(hotel, activeSOS, staffList, todayStats)
const prompt = `Room ${room} ${sos.emergencyType} SOS has been unassigned for over ` +
`${Math.floor(ageSeconds)} seconds. Give me a specific recommendation.`
const aiReply = await callGeminiAdmin(prompt, ctx, [])
// Push proactive message into chat
const proactiveMsg = {
sender:    'ai',
text:      aiReply,
timestamp: Date.now(),
isProactive: true,  // shows a different bubble style
## }
setMessages(prev => [...prev, proactiveMsg])
// If panel is closed, show unread badge
if (!isOpen) {
setHasUnread(true)
setUnreadCount(prev => prev + 1)
## }
## }
## }
## }
checkProactive()
}, [activeSOS])  // Re-runs every time Realtime DB updates

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 11
## SECTION 8 — QUICK ACTION CHIPS
Pre-Built Chips — No Typing Needed
Below the input bar, render 5 chip buttons. Clicking a chip sends that message instantly as if the admin typed
it. This removes friction and makes the chatbot useful even under stress.
// Quick action chips data
const QUICK_CHIPS = [
{ label: 'Status now',        prompt: 'Give me a full status update of the hotel right now.' },
{ label: 'Free staff',        prompt: 'Which staff members are on duty and currently free?' },
{ label: 'Unassigned SOS',    prompt: 'Are there any active emergencies with no staff
assigned?' },
{ label: 'Today summary',     prompt: 'Give me a summary of all incidents resolved today.' },
{ label: 'Approve staff?',    prompt: 'Should I approve any pending staff requests right now?'
## },
## ]
// In JSX:
<div className='flex gap-2 flex-wrap px-3 pb-2'>
{QUICK_CHIPS.map(chip => (
## <button
key={chip.label}
onClick={() => handleSend(chip.prompt)}
disabled={isLoading}
className='text-xs border border-cs-navy text-cs-navy px-3 py-1 rounded-full
hover:bg-cs-navy hover:text-white transition disabled:opacity-40'
## >
## {chip.label}
## </button>
## ))}
## </div>

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 12
## SECTION 9 — CONVERSATION MEMORY & SESSION
Multi-Turn Memory Within a Session
The chatbot maintains conversation history in React state for the duration of the admin's session. This means
Gemini remembers what was discussed earlier in the same conversation.
- Conversation history stored in messages state array — [{sender, text, timestamp}]
- Last 10 messages included in every Gemini API call to maintain context
- History is NOT persisted to Firebase — it resets when admin refreshes or logs out
- A 'Clear Chat' button at the top right of the panel resets messages to empty
- On fresh panel open, Gemini auto-greets with a live hotel status summary
Auto-Greeting on First Open:
// When admin opens the panel for the first time in a session:
useEffect(() => {
if (isOpen && messages.length === 0) {
const greetPrompt = 'Give me a brief status of the hotel right now in 3 sentences or less.'
handleSend(greetPrompt, true)  // true = sent silently (no user bubble shown)
## }
}, [isOpen])
## SECTION 10 — EDGE CASES & ERROR HANDLING
## Situation
## Problem
How to Handle
Gemini API rate limit
hit
15 req/min free limit
exceeded if admin
spams
Show: 'Too many requests. Please wait 10
seconds.' Disable input for 10s with countdown.
API call fails
(network error)
Gemini unreachable or
timeout
Show: 'Could not connect to AI. Your hotel data
is still live.' Offer retry button.
No active SOS,
empty hotel
Gemini has nothing
interesting to say
Greeting message: 'Hotel is calm. 8 staff active.
No incidents today. Ask me anything.'
Admin types
sensitive data
Admin types passwords
or personal info
Add disclaimer below input: 'Do not share
passwords. Conversation is not stored.'
Very long Gemini
response
Gemini ignores
maxOutputTokens
occasionally
Truncate displayed text at 300 chars with 'Read
more...' expand button.

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 13
Context string too
long
If hotel has 500 rooms
and many staff, context
may be huge
Cap staffList to 20 most relevant staff. Cap
activeSOS to 10. Add note if truncated.

CrisisSync — Admin AI Assistant PRDGoogle Big Solution Challenge 2026
Your hotel command centre — now with a brain.Page 14
## SECTION 11 — IMPLEMENTATION CHECKLIST
## Complete Dev Checklist — Admin Developer
- Create src/components/admin/ai/AdminAIChatbot.jsx
- Create src/components/admin/ai/buildAdminContext.js
- Create src/components/admin/ai/callGeminiAdmin.js
- No new npm install needed — Gemini API is called via fetch()
- Import AdminAIChatbot in AdminDashboard.jsx
- Pass hotel, activeSOS, staffList, todayStats, currentUser as props
- Compute todayStats object in AdminDashboard: resolvedCount, avgResponseTime, pendingApprovals
- Floating bubble renders at fixed bottom-right corner (fixed, z-50, bottom-6, right-6)
- Bubble is navy blue circle with 'G' icon when no emergency
- Bubble turns red with pulsing animation when activeSOS is non-empty
- Red badge shows unreadCount when panel is closed and new AI message arrives
- Chat panel opens upward from bubble with smooth CSS transition (transform scale or translate)
- Panel header: 'Admin AI Assistant', 'Powered by Gemini', green 'Online' dot, [×] close button, [n Clear]
button
- Message bubbles: AI messages left-aligned (blue-tinted bg), Admin messages right-aligned (navy bg)
- Proactive messages show with a different style — amber left border + 'AI Alert' label
- Typing indicator (three dots animation) shown while isLoading is true
- Quick action chips render below input bar — 5 chips, wrap on small screens
- Input bar: text input + send button. Enter key also sends.
- Auto-greet on first open — silent Gemini call, only AI bubble shown
- Proactive useEffect monitors activeSOS, triggers alerts for unassigned SOS after 30s
- proactiveChecked Set prevents duplicate alerts for the same SOS
- Rate limit error caught and shown as friendly message with 10s disable countdown
- Network error caught with retry button
- Conversation history limited to last 10 messages in Gemini call
- Clear Chat button resets messages to empty
- Tested: send message → Gemini replies with hotel-specific information
- Tested: quick chip tap → sends correct prompt → Gemini replies
- Tested: when SOS is unassigned 30s → proactive message appears automatically
- Tested: bubble turns red when activeSOS is non-empty
- Tested: unread badge increments when panel closed + new AI message
CrisisSync — Admin AI Assistant Chatbot PRD
## Google Big Solution Challenge Hackathon 2026
"Your hotel command centre — now with a brain."