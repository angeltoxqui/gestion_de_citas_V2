import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Link } from 'react-router-dom'
import LogoutButton from '../../components/LogoutButton'
import EmailVerificationStatus from '../../components/EmailVerificationStatus'
import { FaUserDoctor, FaCalendar, FaUserInjured, FaPills, FaCalendarDay, FaFileLines, FaPlus, FaHashtag, FaGear, FaUsers, FaChartLine } from 'react-icons/fa6'
import { query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { getBusinessCollection } from '../../utils/firestoreUtils'

export default function Doctor() {
  const { currentUser, userRole, businessId } = useAuth()
  const isOwner = userRole === 'owner' // Check if user is the business owner
  const [stats, setStats] = useState({
    todayAppointments: 0,
    waitingPatients: 0,
    weeklyPrescriptions: 0,
    loading: true
  })
  const [doctorName, setDoctorName] = useState('')

  // Fetch doctor's name from users collection (multi-tenant)
  useEffect(() => {
    if (!currentUser) return

    const fetchDoctorName = async () => {
      try {
        // Read from unified 'users' collection (not legacy 'staffData')
        const userDocRef = doc(db, 'users', currentUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          const name = userData.displayName || currentUser.displayName || 'Profesional'
          setDoctorName(name)
        } else {
          setDoctorName(currentUser.displayName || 'Profesional')
        }
      } catch (error) {
        console.error('Error fetching doctor name:', error)
        setDoctorName(currentUser.displayName || 'Unknown Doctor')
      }
    }

    fetchDoctorName()
  }, [currentUser])

  // Fetch real-time stats
  useEffect(() => {
    if (!doctorName || !businessId) return

    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)

    // Query for today's appointments (multi-tenant)
    const todayAppointmentsRef = getBusinessCollection(businessId, 'appointments')
    const todayQuery = query(
      todayAppointmentsRef,
      where('appointmentDate', '==', today),
      where('doctorName', '==', doctorName)
    )

    // Query for waiting patients (tokens generated but not completed)
    const waitingPatientsRef = getBusinessCollection(businessId, 'appointments')
    const waitingQuery = query(
      waitingPatientsRef,
      where('appointmentDate', '==', today),
      where('doctorName', '==', doctorName)
    )

    // Query for weekly prescriptions (multi-tenant)
    const weeklyPrescriptionsRef = getBusinessCollection(businessId, 'prescriptions')
    const weeklyQuery = query(
      weeklyPrescriptionsRef,
      where('doctorId', '==', currentUser.uid)
    )

    // Set up real-time listeners
    const unsubscribeToday = onSnapshot(todayQuery, (snapshot) => {
      const todayCount = snapshot.docs.length
      setStats(prev => ({ ...prev, todayAppointments: todayCount }))
    })

    const unsubscribeWaiting = onSnapshot(waitingQuery, (snapshot) => {
      const waitingCount = snapshot.docs.filter(doc => {
        const data = doc.data()
        return data.status === 'token_generated' || data.status === 'in_progress'
      }).length
      setStats(prev => ({ ...prev, waitingPatients: waitingCount }))
    })

    const unsubscribeWeekly = onSnapshot(weeklyQuery, (snapshot) => {
      const weeklyCount = snapshot.docs.filter(doc => {
        const data = doc.data()
        const createdAt = new Date(data.createdAt)
        return createdAt >= weekStart
      }).length
      setStats(prev => ({ ...prev, weeklyPrescriptions: weeklyCount, loading: false }))
    })

    return () => {
      unsubscribeToday()
      unsubscribeWaiting()
      unsubscribeWeekly()
    }
  }, [doctorName, currentUser, businessId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <FaUserDoctor className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                Panel del Profesional
                {isOwner && (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-medium">
                    Administrador
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-400">Bienvenido, {currentUser?.displayName || 'Profesional'}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <Link to="/doctor/appointments" className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FaCalendar className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold">Citas de Hoy</h3>
              </div>
              <FaCalendarDay className="w-4 h-4 text-blue-400" />
            </div>
            {stats.loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <p className="text-lg text-slate-400">Cargando...</p>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-blue-400">{stats.todayAppointments}</p>
                <p className="text-sm text-slate-400 mt-2">
                  {stats.todayAppointments === 0 ? 'Sin citas hoy' :
                    stats.todayAppointments === 1 ? 'cita programada' :
                      'citas programadas'}
                </p>
              </>
            )}
            <p className="text-xs text-blue-400 mt-2">Clic para ver todas las citas →</p>
          </Link>

          <Link to="/doctor/tokens" className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FaHashtag className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold">Cola de Clientes</h3>
              </div>
              <FaHashtag className="w-4 h-4 text-yellow-400" />
            </div>
            {stats.loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
                <p className="text-lg text-slate-400">Cargando...</p>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-yellow-400">{stats.waitingPatients}</p>
                <p className="text-sm text-slate-400 mt-2">
                  {stats.waitingPatients === 0 ? 'Sin clientes en espera' :
                    stats.waitingPatients === 1 ? 'cliente en espera' :
                      'clientes en espera'}
                </p>
              </>
            )}
            <p className="text-xs text-yellow-400 mt-2">Clic para ver la cola →</p>
          </Link>

          <Link to="/doctor/prescriptions" className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FaPills className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold">Historiales</h3>
              </div>
              <FaFileLines className="w-4 h-4 text-purple-400" />
            </div>
            {stats.loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
                <p className="text-lg text-slate-400">Cargando...</p>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-purple-400">{stats.weeklyPrescriptions}</p>
                <p className="text-sm text-slate-400 mt-2">
                  {stats.weeklyPrescriptions === 0 ? 'Sin historiales esta semana' :
                    'historiales esta semana'}
                </p>
              </>
            )}
            <p className="text-xs text-purple-400 mt-2">Clic para gestionar historiales →</p>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/doctor/appointments" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <FaCalendar className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-semibold">Ver Citas</h3>
                  <p className="text-sm text-slate-400">Gestionar citas de clientes</p>
                </div>
              </div>
            </Link>

            <Link to="/doctor/prescriptions/create" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <FaPlus className="w-5 h-5 text-green-400" />
                <div>
                  <h3 className="font-semibold">Nuevo Historial</h3>
                  <p className="text-sm text-slate-400">Crear historial para cliente</p>
                </div>
              </div>
            </Link>

            <Link to="/doctor/prescriptions" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <FaFileLines className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-semibold">Ver Historiales</h3>
                  <p className="text-sm text-slate-400">Gestionar todos los historiales</p>
                </div>
              </div>
            </Link>

            <Link to="/doctor/services" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <FaPills className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-semibold">Catálogo de Servicios</h3>
                  <p className="text-sm text-slate-400">Gestionar servicios y precios</p>
                </div>
              </div>
            </Link>

            <Link to="/doctor/tokens" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <FaHashtag className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-semibold">Cola de Clientes</h3>
                  <p className="text-sm text-slate-400">Ver y gestionar turnos de clientes</p>
                </div>
              </div>
            </Link>

            {/* Owner-only links */}
            {isOwner && (
              <>
                <Link to="/doctor/settings" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FaGear className="w-5 h-5 text-slate-400" />
                    <div>
                      <h3 className="font-semibold">Configuración del Negocio</h3>
                      <p className="text-sm text-slate-400">Horarios, contacto y datos públicos</p>
                    </div>
                  </div>
                </Link>

                <Link to="/doctor/team" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FaUsers className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="font-semibold">Gestión de Equipo</h3>
                      <p className="text-sm text-slate-400">Agregar y gestionar profesionales</p>
                    </div>
                  </div>
                </Link>

                <Link to="/doctor/stats" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FaChartLine className="w-5 h-5 text-green-400" />
                    <div>
                      <h3 className="font-semibold">Resumen Financiero</h3>
                      <p className="text-sm text-slate-400">Ver ingresos y métricas clave</p>
                    </div>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* User Info Card */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <h2 className="text-xl font-bold mb-4">Información de Cuenta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-slate-400 text-sm">Correo</p>
              <p className="text-white font-medium">{currentUser?.email}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Rol</p>
              <p className="text-blue-400 font-medium capitalize">{userRole === 'doctor' ? 'Profesional' : userRole}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Nombre Completo</p>
              <p className="text-white font-medium">{currentUser?.displayName}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Correo Verificado</p>
              <EmailVerificationStatus />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


