import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import LogoutButton from '../../../components/LogoutButton'
import {
  User,
  Calendar,
  Clock,
  Phone,
  Mail,
  Check,
  X,
  AlertTriangle,
  Search,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  ArrowLeft,
  Users,
  Ban,
  Trash2
} from 'lucide-react'
import { onSnapshot, query, orderBy, updateDoc, collection, where, doc, getDoc, addDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { getBusinessCollection, getBusinessDoc } from '../../../utils/firestoreUtils'

export default function DoctorAppointments() {
  const { currentUser, businessId } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [filteredAppointments, setFilteredAppointments] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState('today') // today, week, month
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showPatientDetails, setShowPatientDetails] = useState(false)

  // Blocking Schedule State
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockFormData, setBlockFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '13:00',
    endTime: '14:00',
    reason: 'Almuerzo'
  })

  const [doctorName, setDoctorName] = useState('')

  // Team filter state
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('mine') // 'mine', 'all', or staffId

  // Fetch doctor's name from staffData collection
  useEffect(() => {
    if (!currentUser) return

    const fetchDoctorName = async () => {
      try {
        const userDocRef = doc(db, 'staffData', currentUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          // Use fullName from staffData, fallback to displayName, then to 'Unknown Doctor'
          const name = userData.fullName || currentUser.displayName || 'Profesional'
          setDoctorName(name)
        } else {
          // Fallback to displayName if no staffData document exists
          setDoctorName(currentUser.displayName || 'Profesional')
        }
      } catch (error) {
        console.error('Error fetching doctor name:', error)
        setDoctorName(currentUser.displayName || 'Unknown Doctor')
      }
    }

    fetchDoctorName()
  }, [currentUser])

  // Fetch team members for filter
  useEffect(() => {
    if (!businessId) return

    const staffRef = collection(db, 'staffData')
    const q = query(staffRef, where('businessId', '==', businessId))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(m => m.role === 'doctor') // Only show professionals
      setTeamMembers(members)
    })

    return () => unsubscribe()
  }, [businessId])

  // Fetch appointments for the logged-in doctor
  useEffect(() => {
    if (!currentUser || !doctorName || !businessId) return

    toast.success('Cargando tus citas...')

    // Fetch all appointments and filter client-side to handle name variations
    const appointmentsRef = getBusinessCollection(businessId, 'appointments')
    const q = query(appointmentsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allAppointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Filter based on selected staff filter
      let doctorAppointments = allAppointments

      if (selectedStaffFilter === 'mine') {
        // Filter appointments for this doctor with multiple name variations
        doctorAppointments = allAppointments.filter(appointment => {
          const appointmentDoctorName = appointment.doctorName || ''
          const currentDoctorName = doctorName || ''

          // Try exact match first
          if (appointmentDoctorName === currentDoctorName) return true
          if (appointmentDoctorName.toLowerCase() === currentDoctorName.toLowerCase()) return true

          // Try matching without "Dr." prefix
          const cleanAppointmentName = appointmentDoctorName.replace(/^Dr\.\s*/i, '').trim()
          const cleanCurrentName = currentDoctorName.replace(/^Dr\.\s*/i, '').trim()
          if (cleanAppointmentName === cleanCurrentName) return true

          return false
        })
      } else if (selectedStaffFilter !== 'all') {
        // Filter by specific staff member name
        const selectedMember = teamMembers.find(m => m.id === selectedStaffFilter)
        if (selectedMember) {
          doctorAppointments = allAppointments.filter(appointment => {
            const appointmentDoctorName = appointment.doctorName || ''
            const memberName = selectedMember.fullName || ''
            return appointmentDoctorName.toLowerCase().includes(memberName.toLowerCase()) ||
              memberName.toLowerCase().includes(appointmentDoctorName.toLowerCase())
          })
        }
      }
      // For 'all', keep allAppointments

      setAppointments(doctorAppointments)

      if (doctorAppointments.length > 0) {
        toast.success(`Cargadas ${doctorAppointments.length} citas`)
      } else {
        toast.success('No se encontraron citas')
      }
    }, (error) => {
      console.error('Error fetching appointments:', error)
      toast.error('Error cargando citas')
    })

    return () => unsubscribe()
  }, [currentUser, doctorName, businessId, selectedStaffFilter, teamMembers])

  useEffect(() => {
    let filtered = appointments

    // Filter by date based on view mode
    if (viewMode === 'today') {
      filtered = filtered.filter(apt => apt.appointmentDate === selectedDate)
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(selectedDate)
      const endOfWeek = new Date(selectedDate)
      endOfWeek.setDate(endOfWeek.getDate() + 7)
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointmentDate)
        return aptDate >= startOfWeek && aptDate < endOfWeek
      })
    } else if (viewMode === 'month') {
      const startOfMonth = new Date(selectedDate)
      const endOfMonth = new Date(selectedDate)
      endOfMonth.setMonth(endOfMonth.getMonth() + 1)
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointmentDate)
        return aptDate >= startOfMonth && aptDate < endOfMonth
      })
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.appointmentType.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredAppointments(filtered)
  }, [appointments, selectedDate, viewMode, searchTerm])

  const handleViewPatientDetails = (appointment) => {
    setSelectedAppointment(appointment)
    setShowPatientDetails(true)
    toast.success('¡Detalles del cliente abiertos!')
  }

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    if (value.trim()) {
      toast.success(`Buscando: "${value}"`)
    }
  }

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    toast.success(`Viendo citas: ${mode === 'today' ? 'hoy' : mode === 'week' ? 'semana' : 'mes'}`)
  }

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      const appointmentRef = getBusinessDoc(businessId, 'appointments', appointmentId)
      await updateDoc(appointmentRef, {
        status: 'completed',
        updatedAt: new Date().toISOString()
      })
      toast.success('¡Cita marcada como completada!')
    } catch (error) {
      console.error('Error completing appointment:', error)
      toast.error(`Error al completar cita: ${error.message}`)
    }
  }

  const handleCancelAppointment = async (appointmentId) => {
    try {
      const appointmentRef = getBusinessDoc(businessId, 'appointments', appointmentId)
      await updateDoc(appointmentRef, {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      })
      toast.success('¡Cita cancelada exitosamente!')
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast.error(`Error al cancelar cita: ${error.message}`)
    }
  }

  const handleBlockSchedule = async (e) => {
    e.preventDefault()

    if (blockFormData.startTime >= blockFormData.endTime) {
      toast.error('La hora de inicio debe ser anterior a la hora de fin')
      return
    }

    try {
      const appointmentsRef = collection(db, 'appointments')
      await addDoc(appointmentsRef, {
        businessId,
        doctorId: currentUser.uid,
        doctorName: doctorName,
        appointmentDate: blockFormData.date,
        appointmentTime: blockFormData.startTime,
        endTime: blockFormData.endTime,
        type: 'blocked',
        status: 'blocked',
        patientName: 'Horario Bloqueado',
        appointmentType: 'blocked', // For compatibility
        patientPhone: '',
        patientEmail: '',
        patientAge: '',
        patientGender: '',
        reason: blockFormData.reason,
        createdAt: new Date().toISOString()
      })

      toast.success('Horario bloqueado exitosamente')
      setShowBlockModal(false)
      // Reset form
      setBlockFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '13:00',
        endTime: '14:00',
        reason: 'Almuerzo'
      })
    } catch (error) {
      console.error('Error blocking schedule:', error)
      toast.error(`Error al bloquear horario: ${error.message}`)
    }
  }

  const handleDeleteBlock = async (blockId) => {
    if (!confirm('¿Estás seguro de desbloquear este horario?')) return

    try {
      const appointmentRef = getBusinessDoc(businessId, 'appointments', blockId)
      await deleteDoc(appointmentRef)
      toast.success('Horario desbloqueado')
    } catch (error) {
      console.error('Error deleting block:', error)
      toast.error('Error al desbloquear horario')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'text-blue-400 bg-blue-400/10'
      case 'completed': return 'text-green-400 bg-green-400/10'
      case 'cancelled': return 'text-red-400 bg-red-400/10'
      case 'rescheduled': return 'text-yellow-400 bg-yellow-400/10'
      case 'blocked': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <Clock className="w-4 h-4" />
      case 'completed': return <Check className="w-4 h-4" />
      case 'cancelled': return <X className="w-4 h-4" />
      case 'rescheduled': return <Calendar className="w-4 h-4" />
      case 'blocked': return <Ban className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getAppointmentTypeColor = (type) => {
    switch (type) {
      case 'consultation': return 'text-purple-400 bg-purple-400/10'
      case 'checkup': return 'text-green-400 bg-green-400/10'
      case 'emergency': return 'text-red-400 bg-red-400/10'
      case 'followup': return 'text-blue-400 bg-blue-400/10'
      case 'blocked': return 'text-slate-400 bg-slate-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const todayAppointments = filteredAppointments.filter(apt => apt.appointmentDate === selectedDate)
  const upcomingAppointments = filteredAppointments.filter(apt =>
    apt.appointmentDate > selectedDate && apt.status === 'scheduled'
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link
              to="/doctor"
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Volver al Panel</span>
            </Link>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Citas de Clientes</h1>
              <p className="text-sm text-slate-400">Bienvenido, {doctorName || 'Profesional'}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleViewModeChange('today')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${viewMode === 'today'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Hoy</span>
              </button>
              <button
                onClick={() => handleViewModeChange('week')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${viewMode === 'week'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
              >
                <CalendarRange className="w-4 h-4" />
                <span>Semana</span>
              </button>
              <button
                onClick={() => handleViewModeChange('month')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${viewMode === 'month'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Mes</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setBlockFormData(prev => ({ ...prev, date: selectedDate }))
                setShowBlockModal(true)
              }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center space-x-2 border border-red-500/20"
            >
              <Ban className="w-4 h-4" />
              <span>Bloquear Horario</span>
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-400 focus:outline-none"
            />
          </div>

          {/* Staff filter */}
          {teamMembers.length > 1 && (
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-400 focus:outline-none appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="mine" className="text-slate-900">Mis citas</option>
                <option value="all" className="text-slate-900">Todo el equipo</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id} className="text-slate-900">
                    {member.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Today's Appointments */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span>Citas de Hoy ({todayAppointments.length})</span>
          </h2>

          {todayAppointments.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">No hay citas programadas para hoy</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {todayAppointments.map((appointment) => (
                appointment.status === 'blocked' ? (
                  // Blocked Slot Display
                  <div key={appointment.id} className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-2">
                          <Ban className="w-5 h-5 text-red-400" />
                          <h3 className="text-lg font-semibold text-red-400">Horario Bloqueado</h3>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          Bloqueado
                        </span>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">
                            {appointment.appointmentTime} - {appointment.endTime || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">{appointment.reason || 'Sin motivo especificado'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteBlock(appointment.id)}
                      className="w-full px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Desbloquear Horario</span>
                    </button>
                  </div>
                ) : (
                  // Standard Appointment Card
                  <div key={appointment.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{appointment.patientName}</h3>
                        <p className="text-slate-400">{appointment.patientAge || 'N/A'} años, {appointment.patientGender || 'N/A'}</p>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(appointment.status)}`}>
                          {getStatusIcon(appointment.status)}
                          <span className="capitalize">{appointment.status}</span>
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAppointmentTypeColor(appointment.appointmentType)}`}>
                          {appointment.appointmentType}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">{appointment.appointmentTime}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">{appointment.patientPhone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">{appointment.patientEmail}</span>
                      </div>
                    </div>

                    {appointment.symptoms && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Síntomas:</h4>
                        <p className="text-sm text-slate-400">{appointment.symptoms}</p>
                      </div>
                    )}

                    {appointment.notes && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Notas:</h4>
                        <p className="text-sm text-slate-400">{appointment.notes}</p>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewPatientDetails(appointment)}
                        className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                      >
                        View Details
                      </button>
                      {appointment.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handleCompleteAppointment(appointment.id)}
                            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(appointment.id)}
                            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-400" />
              <span>Próximas Citas ({upcomingAppointments.length})</span>
            </h2>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <div className="space-y-4">
                {upcomingAppointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                    <div>
                      <h3 className="font-semibold">{appointment.patientName}</h3>
                      <p className="text-sm text-slate-400">
                        {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.appointmentTime}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAppointmentTypeColor(appointment.appointmentType)}`}>
                        {appointment.appointmentType}
                      </span>
                      <button
                        onClick={() => handleViewPatientDetails(appointment)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                      >
                        Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Patient Details Modal */}
      {showPatientDetails && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">Detalles del Cliente</h2>
              <button
                onClick={() => setShowPatientDetails(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Patient Information */}
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Información del Cliente</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nombre:</span>
                      <span className="font-medium">{selectedAppointment.patientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Edad:</span>
                      <span>{selectedAppointment.patientAge || 'N/A'} años</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Género:</span>
                      <span>{selectedAppointment.patientGender || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Teléfono:</span>
                      <span>{selectedAppointment.patientPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Correo:</span>
                      <span>{selectedAppointment.patientEmail}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Signos Vitales</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 text-sm">Presión Arterial</span>
                      <p className="font-medium">{selectedAppointment.vitalSigns?.bloodPressure || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Frecuencia Cardíaca</span>
                      <p className="font-medium">{selectedAppointment.vitalSigns?.heartRate || 'N/A'} bpm</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Temperatura</span>
                      <p className="font-medium">{selectedAppointment.vitalSigns?.temperature || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Peso</span>
                      <p className="font-medium">{selectedAppointment.vitalSigns?.weight || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Historial Médico</h3>
                  <p className="text-slate-300">{selectedAppointment.medicalHistory || 'Sin historial médico disponible'}</p>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Medicamentos Actuales</h3>
                  <p className="text-slate-300">{selectedAppointment.medications || 'Sin medicamentos listados'}</p>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Síntomas Actuales</h3>
                  <p className="text-slate-300">{selectedAppointment.symptoms || 'Sin síntomas reportados'}</p>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Notas de la Cita</h3>
                  <p className="text-slate-300">{selectedAppointment.notes || 'Sin notas disponibles'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowPatientDetails(false)}
                className="px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                Cerrar
              </button>
              {selectedAppointment.status === 'scheduled' && (
                <>
                  <button
                    onClick={() => {
                      handleCompleteAppointment(selectedAppointment.id)
                      setShowPatientDetails(false)
                    }}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    Marcar Completa
                  </button>
                  <button
                    onClick={() => {
                      handleCancelAppointment(selectedAppointment.id)
                      setShowPatientDetails(false)
                    }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    Cancelar Cita
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Block Schedule Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2 text-white">
              <Ban className="w-5 h-5 text-red-400" />
              <span>Bloquear Horario</span>
            </h2>

            <form onSubmit={handleBlockSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={blockFormData.date}
                  onChange={e => setBlockFormData({ ...blockFormData, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={blockFormData.startTime}
                    onChange={e => setBlockFormData({ ...blockFormData, startTime: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Hora Fin</label>
                  <input
                    type="time"
                    required
                    value={blockFormData.endTime}
                    onChange={e => setBlockFormData({ ...blockFormData, endTime: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Motivo</label>
                <input
                  type="text"
                  placeholder="Ej: Almuerzo, Reunión..."
                  value={blockFormData.reason}
                  onChange={e => setBlockFormData({ ...blockFormData, reason: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                >
                  Bloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
