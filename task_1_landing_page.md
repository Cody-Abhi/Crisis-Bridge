# TASK 1 — LANDING PAGE
## Project: CrisisSync | Role: Landing Page Developer
## Read this entire file before writing a single line of code.

---

## WHAT IS CRISISSYNC?
CrisisSync is a real-time hotel emergency response system.
- Guests trigger SOS signals (fire, medical, security, common) from their phone
- Staff and Admin dashboards receive the alert instantly
- Everyone communicates via live chat and call
- Gemini AI guides the guest during the emergency

**Your job:** Build the public-facing landing page at route `/` and the shared app shell (Header, Footer, global styles, routing setup).

---

## TECH STACK YOU WILL USE
- React.js with Vite
- Tailwind CSS for all styling
- React Router v6 for routing
- Lucide React for icons
- No Firebase needed on this page (it's fully static)

---

## PROJECT SETUP (Do this first — only once for the whole project)

```bash
npm create vite@latest crisissync -- --template react
cd crisissync
npm install
npm install react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install lucide-react
npm install react-hot-toast
npm install firebase
npm install nanoid
npm install simple-peer
```

### tailwind.config.js — Replace the entire file with this:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'cs-navy':    '#1E3A5F',
        'cs-red':     '#DC2626',
        'cs-green':   '#16A34A',
        'cs-amber':   '#F59E0B',
        'cs-purple':  '#7C3AED',
        'cs-teal':    '#0F6E56',
      },
      animation: {
        'sos-pulse': 'sos-pulse 1.5s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
      },
      keyframes: {
        'sos-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220,38,38,0.5)' },
          '50%':       { boxShadow: '0 0 0 20px rgba(220,38,38,0)' },
        },
        'fade-in-up': {
          '0%':   { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
```

### src/index.css — Replace the entire file with this:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { margin: 0; font-family: 'Inter', sans-serif; }

@layer components {
  .sos-fire     { @apply bg-cs-red     animate-sos-pulse; }
  .sos-medical  { @apply bg-cs-green; }
  .sos-security { @apply bg-cs-amber; }
  .sos-common   { @apply bg-cs-purple; }
}
```

### src/App.jsx — The main router (shared across whole project):
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage         from './pages/Landing'
import LoginPage           from './pages/auth/Login'
import SignupPage          from './pages/auth/Signup'
import AdminDashboard      from './pages/admin/AdminDashboard'
import RegisterHotel       from './pages/admin/RegisterHotel'
import StaffDashboard      from './pages/staff/StaffDashboard'
import StaffPending        from './pages/staff/StaffPending'
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

          {/* Staff (protected) */}
          <Route path="/staff/dashboard" element={<ProtectedRoute role="staff"><StaffDashboard /></ProtectedRoute>} />
          <Route path="/staff/pending"   element={<ProtectedRoute role="staff"><StaffPending /></ProtectedRoute>} />

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
```

### src/main.jsx:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## YOUR FILES TO CREATE

You will create these files:
```
src/
  pages/
    Landing.jsx               ← MAIN FILE YOU BUILD
  components/
    layout/
      ProtectedRoute.jsx      ← BUILD THIS TOO
```

---

## FILE 1 — src/pages/Landing.jsx

### Full page layout (section by section):

```
[HEADER]          Logo left | Nav links center | Login/Signup buttons right
[HERO]            Dark navy bg | Big headline | Sub-headline | Two CTA buttons | Pulsing shield
[HOW IT WORKS]    3-step cards with icons and descriptions
[FEATURES]        6 feature cards in a grid
[COLOR GUIDE]     4 emergency type badges with labels
[STATS]           3 numbers (e.g., <2s response, 3 roles, 100% free)
[FOOTER]          Logo | Links | Tagline
```

### HEADER component (inside Landing.jsx or separate):
```jsx
// Sticky top nav, dark navy background
// Left: CrisisSync logo (shield icon + text)
// Center: Features | How it Works | About
// Right: [Login] button (outline) and [Get Started] button (red filled)
// On mobile: hamburger menu

const Header = () => (
  <header className="fixed top-0 w-full bg-cs-navy z-50 shadow-lg">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-cs-red rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-sm">SOS</span>
        </div>
        <span className="text-white font-bold text-xl">CrisisSync</span>
      </div>

      {/* Nav */}
      <nav className="hidden md:flex gap-8">
        <a href="#features"  className="text-slate-300 hover:text-white text-sm">Features</a>
        <a href="#how"       className="text-slate-300 hover:text-white text-sm">How It Works</a>
        <a href="#emergency" className="text-slate-300 hover:text-white text-sm">Emergency Types</a>
      </nav>

      {/* Buttons */}
      <div className="flex gap-3">
        <a href="/login"  className="border border-slate-400 text-slate-200 px-4 py-2 rounded-lg text-sm hover:border-white hover:text-white transition">Login</a>
        <a href="/signup" className="bg-cs-red text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition">Get Started</a>
      </div>
    </div>
  </header>
)
```

### HERO SECTION:
```jsx
// Full viewport height, dark navy/slate gradient background
// Center content, everything centered

// Headline: "Emergency Response at the Speed of a Tap"
// Subheadline: "CrisisSync connects hotel guests, staff, and admin in one unified
//               emergency platform — alerting every responder in under 2 seconds."
// Tagline badge: amber pill text: "One Tap. Every Responder. Zero Delay."

// TWO CTA BUTTONS:
// [🧳 I'm a Guest]  → /signup  (red filled)
// [🏨 Admin / Staff Login] → /login  (navy outline with white border)

// PULSING SHIELD visual: 
// Large centered div, shield shape or rounded square
// White/semi-transparent background, "🆘" emoji large
// CSS pulse animation: animate-sos-pulse on the outer ring

// Background: bg-gradient-to-br from-slate-900 via-cs-navy to-slate-800
```

### HOW IT WORKS SECTION (id="how"):
```jsx
// White background section
// Section title: "How CrisisSync Works"
// Section subtitle: "From emergency to response in under 2 seconds"

// 3 cards in a row (flex or grid-cols-3):

// Card 1 — GUEST TAPS SOS
// Icon: big red circle with "🆘"  
// Title: "Guest Taps SOS"
// Body: "Hotel guests tap their emergency type — Fire, Medical, Security, or Common — from their phone dashboard. Press and hold 2 seconds to confirm."

// Card 2 — DASHBOARD GLOWS (arrow → between cards)
// Icon: big amber square with "📊"
// Title: "Dashboard Glows"
// Body: "The room block on Admin and Staff dashboards instantly lights up in the emergency color. Room number, guest name, and emergency type are shown immediately."

// Card 3 — STAFF RESPONDS
// Icon: big green circle with "🏃"
// Title: "Staff Responds"
// Body: "The right staff category receives a popup with Accept/Decline. On accept, they're dispatched and a private chat opens between guest, staff, and admin."

// Each card: white bg, subtle border, rounded-2xl, shadow-sm, p-8
// Number badge on top: 01 / 02 / 03 in navy
```

### FEATURES SECTION (id="features"):
```jsx
// Light gray background (bg-slate-50)
// Section title: "Everything You Need in a Crisis"
// 6 cards in a 2x3 or 3x2 grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

// Feature cards list:
const features = [
  {
    icon: "⚡",
    title: "Instant SOS Alerts",
    desc: "Firebase Realtime Database delivers alerts to every dashboard in under 500ms — faster than a phone call.",
    color: "red"
  },
  {
    icon: "🎨",
    title: "Color-Coded Emergencies",
    desc: "Fire = Red. Medical = Green. Security = Amber. Common = Purple. Staff know the situation before they move.",
    color: "amber"
  },
  {
    icon: "💬",
    title: "Live Incident Chat",
    desc: "Guest, assigned staff, and admin are auto-connected to a private real-time chat the moment SOS is triggered.",
    color: "blue"
  },
  {
    icon: "📞",
    title: "Emergency Voice Calls",
    desc: "One-tap peer-to-peer voice call between guest and responding staff via WebRTC — no server required.",
    color: "green"
  },
  {
    icon: "🤖",
    title: "AI Safety Chatbot",
    desc: "Gemini AI gives guests real-time, calm safety instructions tailored to their emergency type while help arrives.",
    color: "purple"
  },
  {
    icon: "📋",
    title: "Full Incident Audit Trail",
    desc: "Every SOS is logged with a complete timeline, chat transcript, staff assignment, and resolution notes.",
    color: "teal"
  },
]
```

### EMERGENCY COLOR GUIDE SECTION (id="emergency"):
```jsx
// Dark navy background
// Section title: "Four Emergency Types. Zero Confusion."
// 4 large horizontal cards or 2x2 grid

const emergencies = [
  { type: "FIRE",     color: "#DC2626", icon: "🔴", bg: "bg-red-600",    desc: "Immediate evacuation required. Fire Safety staff dispatched." },
  { type: "MEDICAL",  color: "#16A34A", icon: "🟢", bg: "bg-green-600",  desc: "First aid emergency. Medical responders notified instantly." },
  { type: "SECURITY", color: "#F59E0B", icon: "🟡", bg: "bg-amber-500",  desc: "Threat, assault, or intruder. Security team deployed." },
  { type: "COMMON",   color: "#7C3AED", icon: "🟣", bg: "bg-purple-600", desc: "Unknown emergency. ALL staff alerted simultaneously." },
]

// Each card: colored left border (4px) + colored icon badge
// Large SOS type label + description
```

### STATS SECTION:
```jsx
// Centered, 3 big numbers side by side
// Navy text on white background

const stats = [
  { number: "<2s",   label: "Alert delivery time" },
  { number: "3",     label: "Roles unified in one platform" },
  { number: "₹0",    label: "Cost to build and run" },
]
// Each stat: big bold number (text-5xl font-black text-cs-red) + label below
```

### FOOTER:
```jsx
// Dark navy background
// Left: Logo + tagline "One Tap. Every Responder. Zero Delay."
// Center: Quick links (Features, How It Works, Sign Up, Login)
// Right: Emergency disclaimer: "For hotel emergency use only. Always call 100/101/108 for life-threatening emergencies."
// Bottom border: amber line
// Bottom text: © 2026 CrisisSync. Google Big Solution Challenge.
```

---

## FILE 2 — src/components/layout/ProtectedRoute.jsx

This component protects pages that require login. It reads from AuthContext.

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// role: "admin" | "staff" | "guest"
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
```

---

## PLACEHOLDER FILES TO CREATE (so the app doesn't crash)

The other team members will fill these in. Create them as empty placeholder components:

```jsx
// Template for all placeholder files:
export default function PlaceholderPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <p className="text-slate-500 text-lg">This page is being built by another team member.</p>
    </div>
  )
}
```

Create this placeholder at:
- src/pages/auth/Login.jsx
- src/pages/auth/Signup.jsx
- src/pages/admin/AdminDashboard.jsx
- src/pages/admin/RegisterHotel.jsx
- src/pages/staff/StaffDashboard.jsx
- src/pages/staff/StaffPending.jsx
- src/pages/guest/ModeSelect.jsx
- src/pages/guest/GuestDashboard.jsx
- src/pages/guest/GuestHistory.jsx
- src/pages/guest/HotelRegistration.jsx
- src/contexts/AuthContext.jsx  (see AUTH TASK file for full implementation)

---

## SHARED UTILITIES TO CREATE

### src/utils/emergencyHelpers.js
```js
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
```

### src/utils/timeHelpers.js
```js
export const timeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60)  return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}

export const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
}
```

---

## WHAT "DONE" LOOKS LIKE FOR YOUR TASK

- [ ] `npm run dev` starts without errors
- [ ] Landing page renders at `http://localhost:5173/`
- [ ] All 6 sections visible and styled
- [ ] Header navigation links scroll to sections
- [ ] "Get Started" button links to /signup
- [ ] "Login" button links to /login
- [ ] Page is mobile responsive (test at 375px width)
- [ ] ProtectedRoute.jsx created and exported
- [ ] All placeholder pages created so routes don't crash
- [ ] emergencyHelpers.js and timeHelpers.js created in utils/
- [ ] App.jsx routing structure is in place

---

## DO NOT TOUCH
- Do not create or modify any Firebase files
- Do not modify pages that belong to Admin, Staff, or Guest tasks
- Do not install any additional npm packages without team discussion
