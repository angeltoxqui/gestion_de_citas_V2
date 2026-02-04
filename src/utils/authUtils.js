import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword, updateProfile, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';

/**
 * Obtiene el perfil del usuario con ESTRATEGIA DE REINTENTOS (Retry Pattern).
 * Esto soluciona el "Race Condition" donde el Auth es más rápido que Firestore.
 */
export const fetchUserRoleFromFirestore = async (uid) => {
  if (!uid) return null;

  // Intentaremos 3 veces (esperando 1s entre intentos)
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`🔎 Buscando perfil en Firestore (Intento ${attempt}/${MAX_ATTEMPTS})...`);
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        console.log("✅ Perfil encontrado:", userSnap.data().role);
        return userSnap.data();
      } else {
        console.warn(`⏳ Perfil no encontrado aún. Esperando...`);
      }
    } catch (error) {
      console.error(`❌ Error leyendo Firestore (Intento ${attempt}):`, error);
    }

    // Si no es el último intento, esperamos 1 segundo antes de volver a probar
    if (attempt < MAX_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error("🔥 FALLO FINAL: El perfil no apareció después de 3 intentos.");
  return null;
};

/**
 * Crea usuario en Auth y Firestore de forma atómica.
 * Si falla Firestore, borra el usuario de Auth para no dejar "zombies".
 */
export const createUserWithRole = async (email, password, fullName, role, businessName) => {
  let user = null;
  try {
    // 1. Crear en Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    user = userCredential.user;
    await updateProfile(user, { displayName: fullName });

    let businessId = '';

    // 2. Crear Negocio (si aplica)
    if (role === 'owner') {
      const businessRef = await addDoc(collection(db, 'businesses'), {
        name: businessName,
        ownerId: user.uid,
        createdAt: new Date(),
        plan: 'free'
      });
      businessId = businessRef.id;
    }

    // 3. Crear Perfil en 'users'
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: fullName,
      role: role,           // Se guarda el rol directo (doctor, receptionist, etc.)
      isOwner: role === 'owner' || businessId !== '', // Flag para identificar al dueño
      businessId: businessId,
      createdAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), userData);

    // Retornamos todo junto para que la UI se actualice rápido
    return { ...user, ...userData };

  } catch (error) {
    console.error("❌ Error CRÍTICO en registro:", error);
    // ROLLBACK: Si falló la BD, borramos el usuario de Auth para evitar cuentas corruptas
    if (user) {
      console.warn("🧹 Limpiando usuario corrupto de Auth...");
      await deleteUser(user).catch(e => console.error("Error limpiando auth:", e));
    }
    throw error;
  }
};

