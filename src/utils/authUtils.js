import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, collection } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

/**
 * Sanitizes a business name to create a URL-safe ID
 * @param {string} name - The business name
 * @returns {string} - Sanitized ID
 */
function sanitizeBusinessId(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50) // Limit length
}

/**
 * Generates a unique business ID from the business name
 * @param {string} businessName - The business name
 * @returns {string} - Unique business ID
 */
function generateBusinessId(businessName) {
  const sanitized = sanitizeBusinessId(businessName)
  const timestamp = Date.now().toString(36) // Base36 timestamp for uniqueness
  return `${sanitized}-${timestamp}`
}

export async function createUserWithRole(email, password, fullName, role, businessName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  await updateProfile(user, {
    displayName: fullName
  })

  const actionCodeSettings = {
    url: `${window.location.origin}/login`,
    handleCodeInApp: true,
    iOS: {
      bundleId: 'com.clinicmanagement.app'
    },
    android: {
      packageName: 'com.clinicmanagement.app',
      installApp: true,
      minimumVersion: '12'
    },
    dynamicLinkDomain: import.meta.env.VITE_FIREBASE_DYNAMIC_LINK_DOMAIN || undefined
  }

  await sendEmailVerification(user, actionCodeSettings)

  // Generate unique business ID and create business document
  const businessId = generateBusinessId(businessName)

  // Create document in 'businesses' collection
  await setDoc(doc(db, 'businesses', businessId), {
    id: businessId,
    name: businessName,
    ownerId: user.uid,
    ownerEmail: user.email,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    plan: 'free' // Default plan
  })

  // Create user document in root 'users' collection
  // Note: hardcoded 'owner' here as this function is primarily used for new business registration
  // But we respect the passed 'role' argument if provided, though typically it's 'owner' for this flow.
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    fullName: fullName,
    role: role || 'owner',
    businessId: businessId, // Link to business
    emailVerified: false,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    verificationEmailSent: new Date().toISOString()
  })

  return { user, role: role || 'owner', businessId }
}

export async function signInUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  if (user.uid) {
    // Check if the user document exists in Firestore 'users' collection
    const userDocRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userDocRef)

    if (userDoc.exists()) {
      // Update existing document
      await updateDoc(userDocRef, {
        lastLogin: new Date().toISOString()
      })
    } else {
      // Create new document if it doesn't exist (fallback)
      // CAUTION: This fallback might need review if strict role assignment is required
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        fullName: user.displayName || 'Unknown',
        role: 'doctor', // Default fallback role, should ideally be avoided in strict mode
        emailVerified: user.emailVerified,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        verificationEmailSent: null
      })
    }
  }

  return user
}

export async function resetUserPassword(email) {
  return await sendPasswordResetEmail(auth, email)
}

export async function resendUserVerificationEmail(user) {
  const actionCodeSettings = {
    url: `${window.location.origin}/login`,
    handleCodeInApp: true,
    iOS: {
      bundleId: 'com.clinicmanagement.app'
    },
    android: {
      packageName: 'com.clinicmanagement.app',
      installApp: true,
      minimumVersion: '12'
    },
    dynamicLinkDomain: import.meta.env.VITE_FIREBASE_DYNAMIC_LINK_DOMAIN || undefined
  }

  return await sendEmailVerification(user, actionCodeSettings)
}

export async function fetchUserDataFromFirestore(uid) {
  // Guard Clause: Validate UID before querying
  if (!uid || typeof uid !== 'string') {
    console.warn('fetchUserDataFromFirestore called with invalid UID:', uid)
    return null
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      return {
        role: data.role,
        businessId: data.businessId,
        ...data // Return full object just in case
      }
    }
    // Document doesn't exist - return null (don't throw)
    return null
  } catch (error) {
    console.error('Error fetching user data:', error)
    return null
  }
}

// Updated function to return full user data
// Alias to fetchUserDataFromFirestore or similar, keeping for compatibility
export async function fetchUserRoleFromFirestore(uid) {
  // Reuse the defensive logic from fetchUserDataFromFirestore
  return await fetchUserDataFromFirestore(uid)
}

// Ensure fetchUserProfile is available as requested, wrapping existing logic
export const fetchUserProfile = fetchUserDataFromFirestore


