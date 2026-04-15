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
