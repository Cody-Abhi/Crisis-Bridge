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
