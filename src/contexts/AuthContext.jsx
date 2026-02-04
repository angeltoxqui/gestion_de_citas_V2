import { createContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth'
import { auth } from '../firebase/config'
import { fetchUserRoleFromFirestore, createUserWithRole } from '../utils/authUtils'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 1. REGISTRO
  const signup = async (email, password, fullName, role, businessName) => {
    try {
      const newUserProfile = await createUserWithRole(email, password, fullName, role, businessName);
      // Actualizamos estado manualmente para feedback instantáneo
      setUser(newUserProfile);
      return newUserProfile;
    } catch (error) {
      throw error;
    }
  }

  // 2. LOGIN
  const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password)
  }

  // 3. LOGOUT
  const logout = async () => {
    setUser(null);
    await signOut(auth);
  }

  // 4. RESET PASSWORD
  const resetPassword = async (email) => {
    return await sendPasswordResetEmail(auth, email);
  }

  // 5. EL VIGILANTE (Con paciencia)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Intentamos obtener el perfil con la lógica de reintentos
        const userProfile = await fetchUserRoleFromFirestore(firebaseUser.uid);

        if (userProfile) {
          // ✅ ÉXITO: Auth + Firestore sincronizados
          setUser({ ...firebaseUser, ...userProfile });
        } else {
          // ❌ FALLO REAL: Después de 3 segundos no apareció el perfil.
          // Solo AHORA asumimos que es un error y cerramos sesión.
          console.warn("⚠️ Usuario detectado sin perfil (Zombie). Cerrando sesión.");
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    currentUser: user,           // Alias para compatibilidad con componentes
    userRole: user?.role,        // Rol del usuario
    businessId: user?.businessId, // ID del negocio
    loading,
    signup,
    login,
    logout,
    resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}