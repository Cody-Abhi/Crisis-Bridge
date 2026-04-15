# TASK 2 — AUTHENTICATION PAGES
## Project: CrisisSync | Role: Auth Developer
## Read this entire file before writing a single line of code.

---

## YOUR RESPONSIBILITY
You build the complete authentication system for CrisisSync:
- Firebase configuration file
- AuthContext (shared state across the whole app)
- Login page
- Signup page (3 roles: Guest, Staff, Admin)
- Firebase Firestore user document creation on signup

Every other team member's pages DEPEND on what you build here. Build this first.

---

## TECH STACK YOU WILL USE
- Firebase Authentication (email/password)
- Firebase Firestore (user profile storage)
- React Context API (share auth state app-wide)
- React Router v6 (redirect after login)
- Tailwind CSS (styling)
- Lucide React (icons)

---

## ENVIRONMENT SETUP

### Create `.env` file at project root (NEVER commit this to git):
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_key
```

### Add to `.gitignore`:
```
.env
node_modules/
dist/
```

---

## FILES YOU MUST CREATE

```
src/
  firebase/
    config.js                 ← Firebase init
  contexts/
    AuthContext.jsx            ← Global auth state
  pages/
    auth/
      Login.jsx               ← Login page
      Signup.jsx              ← Signup page (3 roles)
```

---

## FILE 1 — src/firebase/config.js

```js
import { initializeApp }    from 'firebase/app'
import { getAuth }          from 'firebase/auth'
import { getFirestore }     from 'firebase/firestore'
import { getDatabase }      from 'firebase/database'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth      = getAuth(app)
export const db        = getFirestore(app)
export const rtdb      = getDatabase(app)
export default app
```

---

## FILE 2 — src/contexts/AuthContext.jsx

This is the most important file. It is used by EVERY page across the app.

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

// ── Hook used by all pages ───────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [currentUser,  setCurrentUser]  = useState(null)
  const [userProfile,  setUserProfile]  = useState(null)
  const [loading,      setLoading]      = useState(true)

  // ── Listen to Firebase Auth state ─────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        // Fetch the Firestore profile every time auth state changes
        const snap = await getDoc(doc(db, 'users', user.uid))
        setUserProfile(snap.exists() ? snap.data() : null)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // ── SIGNUP ─────────────────────────────────────────────────────────────────
  // roleData shape depends on role:
  //   Guest: {}
  //   Staff: { hotelCode, designation, employeeId }
  //   Admin: {}
  const signup = async (email, password, name, phone, role, roleData = {}) => {
    // 1. Create Firebase Auth user
    const { user } = await createUserWithEmailAndPassword(auth, email, password)

    // 2. Build Firestore document
    const baseProfile = {
      uid:       user.uid,
      name,
      email,
      phone,
      role,
      createdAt: serverTimestamp(),
    }

    if (role === 'guest') {
      baseProfile.guestProfile = {
        isCurrentlyStaying: false,
        currentHotelCode:   null,
        currentHotelName:   null,
        currentRoomNumber:  null,
        checkInDate:        null,
        checkOutDate:       null,
        numberOfGuests:     1,
        stayHistory:        [],
      }
    }

    if (role === 'staff') {
      // Validate that the hotel code exists before creating account
      const hotelSnap = await getDoc(doc(db, 'hotels', roleData.hotelCode))
      if (!hotelSnap.exists()) {
        throw new Error('Hotel code not found. Please check the code and try again.')
      }
      baseProfile.staffProfile = {
        hotelCode:        roleData.hotelCode,
        hotelName:        hotelSnap.data().hotelName,
        designation:      roleData.designation,     // fire_safety | medical | security | general
        employeeId:       roleData.employeeId || '',
        isApproved:       false,                    // Admin must approve
        isOnDuty:         false,
        approvedBy:       null,
        approvedAt:       null,
        activeIncidents:  [],
      }
      // Also create a staff_requests document for the admin to see
      await setDoc(doc(db, 'staff_requests', user.uid), {
        staffId:       user.uid,
        staffName:     name,
        staffEmail:    email,
        staffPhone:    phone,
        designation:   roleData.designation,
        hotelCode:     roleData.hotelCode,
        hotelName:     hotelSnap.data().hotelName,
        requestedAt:   serverTimestamp(),
        status:        'pending',
      })
    }

    if (role === 'admin') {
      baseProfile.adminProfile = {
        hotelCode:          null,
        hotelName:          null,
        isHotelRegistered:  false,
      }
    }

    // 3. Write to Firestore users collection
    await setDoc(doc(db, 'users', user.uid), baseProfile)
    setUserProfile(baseProfile)
    return user
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password)
    const snap     = await getDoc(doc(db, 'users', user.uid))
    const profile  = snap.data()
    setUserProfile(profile)
    return { user, profile }
  }

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth)
    setUserProfile(null)
  }

  // ── Refresh profile (call after updates) ──────────────────────────────────
  const refreshProfile = async () => {
    if (!currentUser) return
    const snap = await getDoc(doc(db, 'users', currentUser.uid))
    setUserProfile(snap.exists() ? snap.data() : null)
  }

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
```

---

## FILE 3 — src/pages/auth/Login.jsx

### Visual Layout:
```
[LEFT HALF — Dark Navy Background]
  CrisisSync logo + shield
  Tagline: "One Tap. Every Responder. Zero Delay."
  3 small cards showing: Guest | Staff | Admin icons

[RIGHT HALF — White Background]
  Heading: "Welcome Back"
  Sub: "Sign in to your CrisisSync account"

  Form:
    Email input
    Password input
    Role selector (dropdown: Guest / Staff / Admin)
    [Sign In] button — red, full width
    
  Error message area (red text, shown if login fails)
  Link: "Don't have an account? Sign Up →" → /signup
  Link: "Forgot Password?" (optional — skip for hackathon)
```

### Complete Login.jsx implementation:

```jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState('guest')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { profile } = await login(email, password)

      // Role mismatch check
      if (profile.role !== role) {
        setError(`This account is registered as a "${profile.role}", not "${role}". Please select the correct role.`)
        setLoading(false)
        return
      }

      // Route based on role
      if (profile.role === 'admin') {
        // If hotel not registered → register hotel page
        navigate(profile.adminProfile?.isHotelRegistered
          ? '/admin/dashboard'
          : '/admin/register-hotel')
      } else if (profile.role === 'staff') {
        navigate(profile.staffProfile?.isApproved
          ? '/staff/dashboard'
          : '/staff/pending')
      } else {
        // guest
        navigate('/guest/mode-select')
      }
    } catch (err) {
      // Firebase error codes → friendly messages
      const msg = {
        'auth/user-not-found':  'No account found with this email.',
        'auth/wrong-password':  'Incorrect password. Please try again.',
        'auth/invalid-email':   'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      }
      setError(msg[err.code] || 'Login failed. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-cs-navy flex-col items-center justify-center p-12">
        <div className="w-20 h-20 bg-cs-red rounded-2xl flex items-center justify-center mb-6">
          <span className="text-white font-black text-2xl">SOS</span>
        </div>
        <h1 className="text-white text-4xl font-black mb-3">CrisisSync</h1>
        <p className="text-slate-300 text-center text-lg mb-10 italic">
          "One Tap. Every Responder. Zero Delay."
        </p>
        {/* Role preview cards */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {[
            { icon: '🧳', label: 'Guests',  desc: 'Trigger SOS from your room' },
            { icon: '👷', label: 'Staff',   desc: 'Accept and respond to emergencies' },
            { icon: '🏨', label: 'Admin',   desc: 'Monitor and coordinate your hotel' },
          ].map(r => (
            <div key={r.label} className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
              <span className="text-2xl">{r.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{r.label}</p>
                <p className="text-slate-300 text-xs">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-black text-slate-800 mb-2">Welcome Back</h2>
          <p className="text-slate-500 mb-8">Sign in to your CrisisSync account</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'guest', label: '🧳 Guest' },
                  { value: 'staff', label: '👷 Staff' },
                  { value: 'admin', label: '🏨 Admin' },
                ].map(r => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={`py-2 rounded-lg text-sm font-semibold border-2 transition ${
                      role === r.value
                        ? 'border-cs-red bg-red-50 text-cs-red'
                        : 'border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cs-red hover:bg-red-700 disabled:bg-red-300 text-white py-3 rounded-lg font-bold text-sm transition mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-cs-red font-semibold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

## FILE 4 — src/pages/auth/Signup.jsx

### Visual Layout:
```
Multi-step form wizard:

STEP 1: Role selection
  3 large clickable cards:
  [🧳 Guest]   [👷 Staff]   [🏨 Admin]
  Each card shows role name + short description

STEP 2: Personal details (same for all roles)
  Full Name
  Email
  Phone Number
  Password
  Confirm Password

STEP 3A (Guest): No extra fields → straight to create account
STEP 3B (Staff): Extra fields:
  Hotel Unique Code (6-char, validated against Firestore)
  Designation dropdown (Fire Safety / Medical / Security / General)
  Employee ID (optional)
STEP 3C (Admin): No extra fields → straight to create account
  (Hotel registration happens after login)

Progress indicator: Step 1 → Step 2 → Step 3 (pills at top)
```

### Complete Signup.jsx implementation:

```jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ROLES = [
  {
    value: 'guest',
    icon:  '🧳',
    label: 'Guest',
    desc:  'I am staying at a hotel and need emergency access',
  },
  {
    value: 'staff',
    icon:  '👷',
    label: 'Staff',
    desc:  'I work at a hotel and want to respond to emergencies',
  },
  {
    value: 'admin',
    icon:  '🏨',
    label: 'Admin',
    desc:  'I manage a hotel and want to monitor emergencies',
  },
]

const DESIGNATIONS = [
  { value: 'fire_safety', label: '🔥 Fire Safety Officer' },
  { value: 'medical',     label: '🏥 Medical Responder'   },
  { value: 'security',    label: '🛡️ Security Personnel'  },
  { value: 'general',     label: '👷 General Staff'       },
]

export default function Signup() {
  const { signup }   = useAuth()
  const navigate     = useNavigate()

  const [step,        setStep]        = useState(1)
  const [role,        setRole]        = useState('')
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [phone,       setPhone]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [hotelCode,   setHotelCode]   = useState('')
  const [designation, setDesignation] = useState('')
  const [employeeId,  setEmployeeId]  = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  // ── Step 1: Role selection ─────────────────────────────────────────────────
  const handleRoleSelect = (r) => {
    setRole(r)
    setStep(2)
  }

  // ── Step 2: Validate personal details ─────────────────────────────────────
  const handleStep2Next = () => {
    setError('')
    if (!name.trim())                   return setError('Full name is required.')
    if (!email.trim())                  return setError('Email is required.')
    if (!/^\d{10}$/.test(phone))        return setError('Enter a valid 10-digit phone number.')
    if (password.length < 8)            return setError('Password must be at least 8 characters.')
    if (password !== confirmPwd)        return setError('Passwords do not match.')
    if (role === 'staff') {
      setStep(3) // Staff needs extra fields
    } else {
      handleSubmit() // Guest and Admin go straight to account creation
    }
  }

  // ── Final submit ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    // Staff extra validation
    if (role === 'staff') {
      if (hotelCode.trim().length !== 6) return (setError('Hotel code must be exactly 6 characters.'), setLoading(false))
      if (!designation)                  return (setError('Please select your designation.'), setLoading(false))
    }

    try {
      await signup(email, password, name, phone, role, {
        hotelCode:   hotelCode.trim().toUpperCase(),
        designation,
        employeeId,
      })

      // Redirect based on role
      if (role === 'admin')  navigate('/admin/register-hotel')
      if (role === 'staff')  navigate('/staff/pending')
      if (role === 'guest')  navigate('/guest/mode-select')
    } catch (err) {
      const msg = {
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email':        'Please enter a valid email address.',
        'auth/weak-password':        'Password is too weak.',
      }
      setError(msg[err.code] || err.message || 'Signup failed. Please try again.')
    }
    setLoading(false)
  }

  const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent"

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-cs-red rounded-xl flex items-center justify-center">
          <span className="text-white font-black text-sm">SOS</span>
        </div>
        <span className="text-cs-navy font-black text-2xl">CrisisSync</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-lg p-8">

        {/* Progress indicator */}
        {role && (
          <div className="flex items-center gap-2 mb-8">
            {['Role', 'Details', role === 'staff' ? 'Work Info' : 'Review'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step > i + 1 ? 'bg-green-500 text-white' :
                  step === i + 1 ? 'bg-cs-red text-white' :
                  'bg-slate-200 text-slate-400'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-xs ${step === i + 1 ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                  {label}
                </span>
                {i < 2 && <div className="w-8 h-px bg-slate-200" />}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-5 text-sm">
            {error}
          </div>
        )}

        {/* ── STEP 1: Role ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-black text-slate-800 mb-1">Create Account</h2>
            <p className="text-slate-500 text-sm mb-6">Choose how you want to use CrisisSync</p>
            <div className="flex flex-col gap-3">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleRoleSelect(r.value)}
                  className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-cs-red hover:bg-red-50 transition text-left group"
                >
                  <span className="text-3xl">{r.icon}</span>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-cs-red">{r.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-center text-slate-500 text-sm mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-cs-red font-semibold hover:underline">Sign In</Link>
            </p>
          </>
        )}

        {/* ── STEP 2: Personal Details ─────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-700 text-sm">← Back</button>
              <h2 className="text-xl font-black text-slate-800">Personal Details</h2>
              <span className="ml-auto bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-semibold">
                {ROLES.find(r => r.value === role)?.icon} {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)}
                  placeholder="Rohit Sharma" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="rohit@example.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}
                  placeholder="9876543210" maxLength={10} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="Min. 8 characters" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password</label>
                <input type="password" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)}
                  placeholder="Re-enter password" className={inputClass} />
              </div>

              <button onClick={handleStep2Next}
                className="w-full bg-cs-red hover:bg-red-700 text-white py-3 rounded-lg font-bold text-sm mt-2 transition">
                {role === 'staff' ? 'Next: Work Details →' : 'Create Account →'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Staff Extra Fields ────────────────────────────── */}
        {step === 3 && role === 'staff' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-700 text-sm">← Back</button>
              <h2 className="text-xl font-black text-slate-800">Work Information</h2>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Hotel Unique Code
                  <span className="text-slate-400 font-normal ml-2">(Get this from your Hotel Admin)</span>
                </label>
                <input
                  type="text"
                  value={hotelCode}
                  onChange={e => setHotelCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HTLX42"
                  maxLength={6}
                  className={`${inputClass} font-mono tracking-widest text-lg`}
                />
                <p className="text-xs text-slate-400 mt-1">6-character code provided by your hotel admin</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Your Designation</label>
                <select
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select your role...</option>
                  {DESIGNATIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Employee ID
                  <span className="text-slate-400 font-normal ml-2">(Optional)</span>
                </label>
                <input type="text" value={employeeId} onChange={e=>setEmployeeId(e.target.value)}
                  placeholder="EMP-1234" className={inputClass} />
              </div>

              {/* Info box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>Note:</strong> Your account will be pending approval by the hotel admin. You will receive access once approved.
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-cs-red hover:bg-red-700 disabled:bg-red-300 text-white py-3 rounded-lg font-bold text-sm mt-2 transition"
              >
                {loading ? 'Creating Account...' : 'Create Account →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

---

## FIRESTORE DATABASE RULES (Apply in Firebase Console)

Go to Firestore → Rules tab → Paste this and Publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own profile
    match /users/{userId} {
      allow read:  if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Hotels readable by all authenticated users (staff need to validate code on signup)
    match /hotels/{hotelCode} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Incidents: any authenticated user can read/create/update
    match /incidents/{incidentId} {
      allow read, write: if request.auth != null;
    }

    // Staff requests: any authenticated user can read/create; only admin can update
    match /staff_requests/{requestId} {
      allow read, create: if request.auth != null;
      allow update: if request.auth != null &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## FIREBASE REALTIME DATABASE RULES (Apply in Firebase Console)

Go to Realtime Database → Rules tab → Paste this and Publish:

```json
{
  "rules": {
    ".read":  "auth != null",
    ".write": "auth != null"
  }
}
```

---

## WHAT "DONE" LOOKS LIKE FOR YOUR TASK

- [ ] `src/firebase/config.js` created and reads from `.env`
- [ ] `src/contexts/AuthContext.jsx` created with signup, login, logout, refreshProfile
- [ ] `src/pages/auth/Login.jsx` renders, handles all 3 roles, routes correctly after login
- [ ] `src/pages/auth/Signup.jsx` 3-step wizard works for all 3 roles
- [ ] Staff signup validates hotel code against Firestore
- [ ] Staff signup creates a `staff_requests` document
- [ ] Error messages are clear and user-friendly
- [ ] Both pages are mobile responsive
- [ ] Firestore and Realtime DB rules applied in Firebase Console
- [ ] `.env` file has all keys filled in
- [ ] `.gitignore` includes `.env`

---

## DO NOT TOUCH
- Do not modify `App.jsx` routing (Landing Page task owns that)
- Do not build any dashboard pages
- Do not add extra npm packages without team discussion
