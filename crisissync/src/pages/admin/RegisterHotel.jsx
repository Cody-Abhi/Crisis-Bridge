import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../firebase/config'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { customAlphabet } from 'nanoid'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const generateHotelCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)

export default function RegisterHotel() {
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    hotelName: '',
    street: '', city: '', state: '', pincode: '',
    phone: '', email: '', emergencyContact: '',
    floors: '1', roomsPerFloor: '10',
    fireNumber: '101', ambulanceNumber: '108', policeNumber: '100', securityNumber: '',
    hasFireSafety: true, hasMedical: true, hasSecurity: true, hasGeneral: true
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successCode, setSuccessCode] = useState(null)

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const generateRooms = (floors, roomsPerFloor) => {
    const rooms = []
    const floorLayout = {}
    for (let f = 1; f <= floors; f++) {
      floorLayout[f] = []
      for (let r = 1; r <= roomsPerFloor; r++) {
        const roomNum = `${f}${String(r).padStart(2, '0')}`
        rooms.push(roomNum)
        floorLayout[f].push(roomNum)
      }
    }
    return { rooms, floorLayout }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 1. Generate code and rooms
      const code = generateHotelCode()
      const { rooms, floorLayout } = generateRooms(parseInt(formData.floors), parseInt(formData.roomsPerFloor))

      // 2. Build Firestore hotel document (matching task_3_admin spec exactly)
      const hotelDoc = {
        hotelCode:  code,
        hotelName:  formData.hotelName,
        adminId:    currentUser.uid,
        adminName:  userProfile.name,
        adminEmail: currentUser.email,
        address: {
          street:  formData.street,
          city:    formData.city,
          state:   formData.state,
          pincode: formData.pincode,
        },
        contact: {
          phone:          formData.phone,
          email:          formData.email,
          emergencyPhone: formData.emergencyContact,
        },
        hotelConfig: {
          totalFloors:   parseInt(formData.floors),
          totalRooms:    rooms.length,
          roomNumbers:   rooms,
          roomsPerFloor: parseInt(formData.roomsPerFloor),
          floorLayout:   floorLayout,
        },
        emergencyNumbers: {
          fire:      formData.fireNumber      || '101',
          ambulance: formData.ambulanceNumber || '108',
          police:    formData.policeNumber    || '100',
          security:  formData.securityNumber  || '',
        },
        staffCategories: {
          fire_safety: formData.hasFireSafety,
          medical:     formData.hasMedical,
          security:    formData.hasSecurity,
          general:     formData.hasGeneral,
        },
        registeredAt: serverTimestamp(),
        isActive: true,
      }

      // 3. Write hotel doc to Firestore
      await setDoc(doc(db, 'hotels', code), hotelDoc)

      // 4. Update admin's user profile with hotelCode
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'adminProfile.hotelCode':         code,
        'adminProfile.hotelName':         formData.hotelName,
        'adminProfile.isHotelRegistered': true,
      })

      // 5. Refresh AuthContext so downstream pages pick up the new hotelCode
      await refreshProfile()

      setSuccessCode(code)
      toast.success('Hotel registered successfully!')
    } catch (err) {
      console.error('Hotel registration failed:', err)
      toast.error(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successCode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Hotel Registered!</h2>
          <p className="text-slate-500 mb-8">Your hotel has been configured and is ready.</p>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 relative group">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Your Unique Hotel Code</p>
            <div className="text-4xl font-mono font-black text-blue-600 tracking-[0.25em]">{successCode}</div>
          </div>
          
          <p className="text-sm text-slate-500 mb-8 px-4 leading-relaxed">
            Share this code with your staff when they sign up. Keep it safe — this cannot be changed.
          </p>

          <button
            onClick={() => navigate('/admin/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex justify-center items-center gap-2"
          >
            Go to Dashboard <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-600 rounded-xl shadow-lg shadow-red-500/20 mb-4">
            <span className="text-white font-black text-[12px] tracking-wider">SOS</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Register Your Hotel</h2>
          <p className="text-slate-500 mt-2">Initialize your CrisisSync environment in minutes.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
            
            {/* SECTION 1: Info */}
            <div className="p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">apartment</span>
                Hotel Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hotel Name *</label>
                  <input required name="hotelName" value={formData.hotelName} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Address *</label>
                  <input required name="street" value={formData.street} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">City</label>
                  <input name="city" value={formData.city} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
                    <input name="state" value={formData.state} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pincode</label>
                    <input name="pincode" value={formData.pincode} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Contact */}
            <div className="p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">contact_phone</span>
                Contact Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Emergency Contact</label>
                  <input name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* SECTION 3: Config */}
            <div className="p-8 bg-blue-50/50">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">grid_view</span>
                Hotel Configuration
              </h3>
              <div className="bg-white p-5 rounded-xl border border-blue-100 flex gap-6 mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Floors (1-50)</label>
                  <input type="number" min="1" max="50" required name="floors" value={formData.floors} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rooms Per Floor</label>
                  <input type="number" min="1" required name="roomsPerFloor" value={formData.roomsPerFloor} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">info</span> Room numbers will be auto-generated sequentially (e.g. 101-108, 201-208...).</p>
            </div>

            {/* SECTION 4: Emergencies & Staff */}
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500">local_fire_department</span>
                    Local Emergency Numbers
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Fire</label>
                      <input name="fireNumber" value={formData.fireNumber} onChange={handleInputChange} className="w-full border-b border-slate-300 py-1 focus:border-blue-500 focus:outline-none bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Ambulance</label>
                      <input name="ambulanceNumber" value={formData.ambulanceNumber} onChange={handleInputChange} className="w-full border-b border-slate-300 py-1 focus:border-blue-500 focus:outline-none bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Police</label>
                      <input name="policeNumber" value={formData.policeNumber} onChange={handleInputChange} className="w-full border-b border-slate-300 py-1 focus:border-blue-500 focus:outline-none bg-transparent" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Security</label>
                      <input name="securityNumber" value={formData.securityNumber} onChange={handleInputChange} placeholder="Internal Ext." className="w-full border-b border-slate-300 py-1 focus:border-blue-500 focus:outline-none bg-transparent" />
                    </div>
                  </div>
                </div>

                <div>
                   <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600">health_and_safety</span>
                    Staff Categories Enable
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="hasFireSafety" checked={formData.hasFireSafety} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">Fire Safety Team</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="hasMedical" checked={formData.hasMedical} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">Medical Team</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="hasSecurity" checked={formData.hasSecurity} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">Security</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="hasGeneral" checked={formData.hasGeneral} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">General Staff</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-8 bg-slate-50">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 hover:shadow-red-500/30"
              >
                {isSubmitting ? (
                  <><span className="material-symbols-outlined animate-spin">progress_activity</span> Generating...</>
                ) : (
                  <><span className="material-symbols-outlined">add_business</span> Generate Code & Register Hotel</>
                )}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  )
}
