import { useAuth } from '../../hooks/useAuth'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import LogoutButton from '../../components/LogoutButton'
import EmailVerificationStatus from '../../components/EmailVerificationStatus'
import { Bell, UserPlus, CalendarCheck, Users, Calendar, FileText, FileDown, Hash, DollarSign } from 'lucide-react'
import { onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { getBusinessCollection } from '../../utils/firestoreUtils'

export default function Receptionist() {
  const { currentUser, userRole, businessId } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [todayAppointments, setTodayAppointments] = useState(0)
  const [todayPrescriptions, setTodayPrescriptions] = useState(0)
  const [totalAppointments, setTotalAppointments] = useState(0)

  // Fetch real appointment data
  useEffect(() => {
    if (!businessId) return

    const appointmentsRef = getBusinessCollection(businessId, 'appointments')
    const q = query(appointmentsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appointmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setAppointments(appointmentsData)

      // Calculate today's appointments
      const today = new Date().toISOString().split('T')[0]
      const todayCount = appointmentsData.filter(apt => apt.appointmentDate === today).length
      setTodayAppointments(todayCount)
      setTotalAppointments(appointmentsData.length)
    }, (error) => {
      console.error('Error fetching appointments:', error)
    })

    return () => unsubscribe()
  }, [businessId])

  // Fetch prescription data
  useEffect(() => {
    if (!businessId) return

    const prescriptionsRef = getBusinessCollection(businessId, 'prescriptions')
    const q = query(prescriptionsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prescriptionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Calculate today's prescriptions
      const today = new Date().toISOString().split('T')[0]
      const todayCount = prescriptionsData.filter(pres => pres.prescriptionDate === today).length
      setTodayPrescriptions(todayCount)
    }, (error) => {
      console.error('Error fetching prescriptions:', error)
    })

    return () => unsubscribe()
  }, [businessId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Panel del Recepcionista</h1>
              <p className="text-sm text-slate-400">Bienvenido, {currentUser?.displayName || 'Recepcionista'}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Quick Stats */}
          <Link to="/receptionist/billing" className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3 mb-4">
              <DollarSign className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-semibold">Facturación y Pagos</h3>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{totalAppointments}</p>
            <p className="text-sm text-slate-400 mt-2">Facturas totales</p>
            <p className="text-xs text-cyan-400 mt-2">Clic para gestionar facturación →</p>
          </Link>

          <Link to="/receptionist/appointments" className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <CalendarCheck className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold">Citas de Hoy</h3>
              </div>
              <Calendar className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-400">{todayAppointments}</p>
            <p className="text-sm text-slate-400 mt-2">Programadas hoy</p>
            <p className="text-xs text-green-400 mt-2">Clic para gestionar citas →</p>
          </Link>

          <Link to="/receptionist/prescriptions" className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold">Historiales de Hoy</h3>
              </div>
              <FileDown className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-purple-400">{todayPrescriptions}</p>
            <p className="text-sm text-slate-400 mt-2">Emitidos hoy</p>
            <p className="text-xs text-purple-400 mt-2">Clic para gestionar historiales →</p>
          </Link>

          <Link to="/receptionist/tokens" className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Hash className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold">Gestión de Turnos</h3>
              </div>
              <Hash className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-blue-400">{appointments.filter(apt => apt.tokenNumber).length}</p>
            <p className="text-sm text-slate-400 mt-2">Turnos generados hoy</p>
            <p className="text-xs text-blue-400 mt-2">Clic para gestionar turnos →</p>
          </Link>
        </div>

        {/* CRM de Clientes */}
        <div className="mt-6">
          <Link to="/receptionist/clients" className="block bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/30 rounded-2xl p-6 backdrop-blur-xl hover:from-purple-500/20 hover:to-pink-500/20 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">CRM de Clientes</h3>
                  <p className="text-sm text-slate-400">Ver historial, pagos y preferencias de clientes</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-400">{new Set(appointments.map(a => a.patientName)).size}</p>
                <p className="text-xs text-slate-400">Clientes únicos</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/receptionist/appointments" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-green-400" />
                <div>
                  <h3 className="font-semibold">Gestionar Citas</h3>
                  <p className="text-sm text-slate-400">Ver y administrar citas</p>
                </div>
              </div>
            </Link>

            <Link to="/receptionist/prescriptions" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-semibold">Ver Historiales</h3>
                  <p className="text-sm text-slate-400">Gestionar historiales de clientes</p>
                </div>
              </div>
            </Link>

            <Link to="/receptionist/appointments" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-semibold">Crear Cita</h3>
                  <p className="text-sm text-slate-400">Programar nueva cita</p>
                </div>
              </div>
            </Link>

            <Link to="/receptionist/tokens" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <Hash className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-semibold">Gestión de Turnos</h3>
                  <p className="text-sm text-slate-400">Administrar turnos de clientes</p>
                </div>
              </div>
            </Link>

            <Link to="/receptionist/billing" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-green-400" />
                <div>
                  <h3 className="font-semibold">Facturación y Pagos</h3>
                  <p className="text-sm text-slate-400">Gestionar facturas y pagos</p>
                </div>
              </div>
            </Link>

            <Link to="/receptionist/billing/reports" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <FileDown className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="font-semibold">Descargar Reportes</h3>
                  <p className="text-sm text-slate-400">Generar y descargar reportes</p>
                </div>
              </div>
            </Link>

            <Link to="/receptionist/billing/create" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-green-400" />
                <div>
                  <h3 className="font-semibold">Crear Factura</h3>
                  <p className="text-sm text-slate-400">Generar nueva factura</p>
                </div>
              </div>
            </Link>

            <Link to="/receptionist/billing/payments" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-semibold">Procesar Pagos</h3>
                  <p className="text-sm text-slate-400">Gestionar pagos de clientes</p>
                </div>
              </div>
            </Link>
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
              <p className="text-cyan-400 font-medium capitalize">{userRole === 'receptionist' ? 'Recepcionista' : userRole}</p>
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


