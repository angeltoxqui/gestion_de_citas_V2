import { createContext, useEffect, useState } from 'react'
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

  async function signup(email, password, fullName, role, businessName) {
    return await createUserWithRole(email, password, fullName, role, businessName)
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
      if (user) {
        setCurrentUser(user)
        const userData = await fetchUserData(user.uid)
        setUserRole(userData?.role || null)
        setBusinessId(userData?.businessId || null)
      } else {
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

