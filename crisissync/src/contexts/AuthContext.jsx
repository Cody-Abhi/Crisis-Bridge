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
