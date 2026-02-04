import { createContext, useEffect, useState, useRef } from 'react'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import {
  createUserWithRole,
  signInUser,
  resetUserPassword,
  resendUserVerificationEmail,
  fetchUserDataFromFirestore
} from '../utils/authUtils'

const AuthContext = createContext()

export { AuthContext }
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [loading, setLoading] = useState(true)

  // Semaphore to prevent race conditions between signup and onAuthStateChanged
  const isSigningUp = useRef(false)

  async function signup(email, password, fullName, role, businessName) {
    isSigningUp.current = true
    try {
      const { user, role: newRole, businessId: newBusinessId } = await createUserWithRole(email, password, fullName, role, businessName)

      // Manually update state since we ignored the listener
      setCurrentUser(user)
      setUserRole(newRole)
      setBusinessId(newBusinessId)

      return user
    } finally {
      // Release the lock after a safe delay to allow Firestore propagation
      setTimeout(() => {
        isSigningUp.current = false
      }, 2000)
    }
  }

  async function login(email, password) {
    return await signInUser(email, password)
  }

  async function logout() {
    await signOut(auth)
  }

  async function resetPassword(email) {
    return await resetUserPassword(email)
  }

  async function resendVerificationEmail() {
    if (currentUser) {
      return await resendUserVerificationEmail(currentUser)
    }
  }

  async function fetchUserData(uid) {
    try {
      return await fetchUserDataFromFirestore(uid)
    } catch (error) {
      console.error('Error fetching user data:', error)
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If we are in the middle of a signup, ignore this listener update
      // intended to prevent the "Zombie User" protection from killing the session
      // before the profile is created.
      if (isSigningUp.current) return

      if (user) {
        // User is authenticated, try to fetch profile
        const userData = await fetchUserData(user.uid)

        if (userData) {
          // Healthy state: Auth + DB Profile exists
          setCurrentUser(user)
          setUserRole(userData.role)
          setBusinessId(userData.businessId)
        } else {
          // CRITICAL: Zombie State (Auth exists but no DB Profile)
          // This causes infinite loops if we let them proceed.
          console.warn('⚠️ Zombie User detected: Authenticated but no Firestore profile. Force signing out.')
          await signOut(auth)
          setCurrentUser(null)
          setUserRole(null)
          setBusinessId(null)
        }
      } else {
        // No user authenticated
        setCurrentUser(null)
        setUserRole(null)
        setBusinessId(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = {
    currentUser,
    userRole,
    businessId,
    signup,
    login,
    logout,
    resetPassword,
    resendVerificationEmail,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

