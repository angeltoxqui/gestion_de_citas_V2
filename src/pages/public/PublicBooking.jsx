import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { addDoc, collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { getBusinessCollection } from '../../utils/firestoreUtils'
// import { sendNotification } from '../../utils/notifications'
import toast, { Toaster } from 'react-hot-toast'
import {
    Calendar, Clock, User, Phone, FileText, CheckCircle, Loader2,
    AlertTriangle, Briefcase, DollarSign, Timer, Users, Building, MapPin, XCircle
} from 'lucide-react'

export default function PublicBooking() {
    const { businessId } = useParams()

    // Business data
    const [businessData, setBusinessData] = useState(null)
    const [services, setServices] = useState([])
    const [staff, setStaff] = useState([])
    const [loadingData, setLoadingData] = useState(true)
    const [dataError, setDataError] = useState(null)

    // Form state
    const [formData, setFormData] = useState({
        patientName: '',
        patientPhone: '',
        appointmentDate: '',
        appointmentTime: '',
        serviceId: '',
        staffId: '',
        notes: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    // Selected items for cost summary
    const [selectedService, setSelectedService] = useState(null)

    // Business hours validation
    const [selectedDayInfo, setSelectedDayInfo] = useState(null)
    const [availableTimeSlots, setAvailableTimeSlots] = useState([])
    const [selectedStaff, setSelectedStaff] = useState(null)

    // Fetch business data, services, and staff on mount
    useEffect(() => {
        if (!businessId) {
            setDataError('No se especificó el ID del negocio')
            setLoadingData(false)
            return
        }

        const fetchData = async () => {
            setLoadingData(true)
            setDataError(null)

            try {
                // Fetch business info
                const businessDoc = await getDoc(doc(db, 'businesses', businessId))
                if (!businessDoc.exists()) {
                    setDataError('Negocio no encontrado. Verifica el enlace de reserva.')
                    setLoadingData(false)
                    return
                }
                setBusinessData({ id: businessDoc.id, ...businessDoc.data() })

                // Fetch services for this business
                const servicesRef = getBusinessCollection(businessId, 'services')
                const servicesQuery = query(servicesRef, orderBy('name', 'asc'))
                const servicesSnapshot = await getDocs(servicesQuery)
                const activeServices = servicesSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(service => service.isActive !== false)
                setServices(activeServices)

                // Fetch staff for this business from global staffData collection
                const staffRef = collection(db, 'staffData')
                const staffQuery = query(
                    staffRef,
                    where('businessId', '==', businessId),
                    where('role', '==', 'doctor')
                )
                const staffSnapshot = await getDocs(staffQuery)
                const staffList = staffSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                setStaff(staffList)

                if (activeServices.length === 0) {
                    console.warn('No active services found for this business')
                }
                if (staffList.length === 0) {
                    console.warn('No staff found for this business')
                }

            } catch (error) {
                console.error('Error fetching data:', error)
                setDataError(`Error al cargar datos: ${error.message}`)
            } finally {
                setLoadingData(false)
            }
        }

        fetchData()
    }, [businessId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))

        // Update selected service for cost summary
        if (name === 'serviceId') {
            const service = services.find(s => s.id === value)
            setSelectedService(service || null)
        }

        // Update selected staff
        if (name === 'staffId') {
            const member = staff.find(s => s.id === value)
            setSelectedStaff(member || null)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate fields
        if (!formData.patientName.trim() || !formData.patientPhone.trim() ||
            !formData.appointmentDate || !formData.appointmentTime || !formData.serviceId) {
            toast.error('Por favor completa todos los campos requeridos')
            return
        }

        setIsSubmitting(true)

        try {
            const appointmentsRef = getBusinessCollection(businessId, 'appointments')

            // Get selected service details
            const service = services.find(s => s.id === formData.serviceId)
            const staffMember = staff.find(s => s.id === formData.staffId)

            // Create appointment document
            await addDoc(appointmentsRef, {
                // Client-provided data
                patientName: formData.patientName.trim(),
                patientPhone: formData.patientPhone.trim(),
                appointmentDate: formData.appointmentDate,
                appointmentTime: formData.appointmentTime,
                notes: formData.notes.trim(),

                // Service data
                serviceId: formData.serviceId,
                serviceName: service?.name || 'Servicio no especificado',
                servicePrice: service?.price || 0,
                serviceDuration: service?.duration || 0,
                appointmentType: 'consultation',

                // Staff data
                doctorId: formData.staffId || null,
                doctorName: staffMember?.fullName || 'Por asignar',

                // Public booking metadata - as requested
                status: 'pending',
                source: 'online',
                createdBy: 'public_web',

                // Metadata
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                reason: `Servicio: ${service?.name || 'N/A'}${formData.notes ? ` - Notas: ${formData.notes.trim()}` : ''}`
            })

            // Trigger notification if enabled - REMOVED: Now handled by Cloud Functions
            /* if (businessData?.autoRemindersEnabled && businessData?.webhookUrl) {
                sendNotification({
                    patientName: formData.patientName.trim(),
                    patientPhone: formData.patientPhone.trim(),
                    appointmentDate: formData.appointmentDate,
                    appointmentTime: formData.appointmentTime,
                    serviceName: service?.name || 'Servicio',
                    doctorName: staffMember?.fullName || 'Por asignar',
                    businessName: businessData?.name || 'Negocio'
                }, businessData)
            } */

            toast.success('¡Cita agendada exitosamente!')
            setIsSuccess(true)

            // Reset form
            setFormData({
                patientName: '',
                patientPhone: '',
                appointmentDate: '',
                appointmentTime: '',
                serviceId: '',
                staffId: '',
                notes: ''
            })
            setSelectedService(null)
            setSelectedStaff(null)
        } catch (error) {
            console.error('Error creating appointment:', error)
            toast.error(`Error al agendar: ${error.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Get minimum date (today)
    const today = new Date().toISOString().split('T')[0]

    // Day name mapping for businessHours
    const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    // Get business hours for a specific date
    const getBusinessHoursForDate = (dateString) => {
        if (!dateString || !businessData?.businessHours) return null
        const date = new Date(dateString + 'T12:00:00') // Use noon to avoid timezone issues
        const dayOfWeek = date.getDay()
        const dayKey = DAY_KEYS[dayOfWeek]
        const dayLabel = DAY_LABELS[dayOfWeek]
        const hours = businessData.businessHours[dayKey]

        return {
            dayKey,
            dayLabel,
            enabled: hours?.enabled || false,
            open: hours?.open || '',
            close: hours?.close || ''
        }
    }

    // Generate available time slots based on business hours
    const generateTimeSlots = (open, close) => {
        if (!open || !close) return []

        const slots = []
        const [openHour, openMin] = open.split(':').map(Number)
        const [closeHour, closeMin] = close.split(':').map(Number)

        let currentHour = openHour
        let currentMin = openMin

        while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
            const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`
            slots.push(timeStr)

            // Increment by 30 minutes
            currentMin += 30
            if (currentMin >= 60) {
                currentMin = 0
                currentHour++
            }
        }

        return slots
    }

    // Handle date change with business hours validation
    const handleDateChange = (e) => {
        const dateValue = e.target.value
        setFormData(prev => ({ ...prev, appointmentDate: dateValue, appointmentTime: '' }))

        const dayInfo = getBusinessHoursForDate(dateValue)
        setSelectedDayInfo(dayInfo)

        if (dayInfo?.enabled) {
            const slots = generateTimeSlots(dayInfo.open, dayInfo.close)
            setAvailableTimeSlots(slots)
        } else {
            setAvailableTimeSlots([])
        }
    }

    // Format price helper
    const formatPrice = (price) => {
        if (!price) return '$0.00'
        return `$${parseFloat(price).toFixed(2)}`
    }

    // Format duration helper
    const formatDuration = (minutes) => {
        if (!minutes) return '—'
        if (minutes < 60) return `${minutes} min`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
    }

    // Format time for display
    const formatTimeDisplay = (time) => {
        if (!time) return ''
        const [hour, min] = time.split(':')
        const hourNum = parseInt(hour)
        const ampm = hourNum >= 12 ? 'PM' : 'AM'
        const hour12 = hourNum % 12 || 12
        return `${hour12}:${min} ${ampm}`
    }

    // Loading state
    if (loadingData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    </div>
                    <p className="text-slate-300">Cargando información del negocio...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (dataError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center p-4">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md text-center">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
                    <p className="text-slate-300 mb-6">{dataError}</p>
                    <p className="text-sm text-slate-500">
                        Asegúrate de acceder con un enlace válido del tipo:<br />
                        <code className="text-blue-400">/book/{'{businessId}'}</code>
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white antialiased">
            <Toaster position="top-right" />

            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl mb-6 shadow-2xl shadow-blue-500/25">
                            <Calendar className="w-10 h-10 text-slate-900" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent mb-3">
                            Agenda tu Cita
                        </h1>
                        {businessData && (
                            <div className="flex items-center justify-center space-x-2 text-lg text-slate-300 mb-2">
                                <Building className="w-5 h-5" />
                                <span className="font-semibold">{businessData.name}</span>
                            </div>
                        )}
                        <p className="text-slate-400 leading-relaxed">
                            Reserva rápida y fácil, sin necesidad de registrarte
                        </p>
                    </div>

                    {/* Success State */}
                    {isSuccess ? (
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-green-400 mb-4">¡Cita Agendada!</h2>
                            <p className="text-slate-300 mb-6">
                                Tu cita ha sido registrada exitosamente. Nos pondremos en contacto contigo para confirmar.
                            </p>
                            <button
                                onClick={() => setIsSuccess(false)}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-slate-900 font-bold rounded-2xl transition-all duration-300"
                            >
                                Agendar Otra Cita
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Form Card */}
                            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/20">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Client Name */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-200">
                                            Nombre del Cliente *
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="text"
                                                name="patientName"
                                                placeholder="Tu nombre completo"
                                                value={formData.patientName}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-200">
                                            Teléfono *
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="tel"
                                                name="patientPhone"
                                                placeholder="Tu número de teléfono"
                                                value={formData.patientPhone}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Service Selection */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-200">
                                            Servicio *
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                                <Briefcase className="w-4 h-4" />
                                            </div>
                                            <select
                                                name="serviceId"
                                                value={formData.serviceId}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300 appearance-none cursor-pointer"
                                                required
                                            >
                                                <option value="" className="text-slate-900">Selecciona un servicio</option>
                                                {services.map(service => (
                                                    <option key={service.id} value={service.id} className="text-slate-900">
                                                        {service.name} - {formatPrice(service.price)} ({formatDuration(service.duration)})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {services.length === 0 && (
                                            <p className="text-sm text-amber-400 flex items-center space-x-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span>No hay servicios disponibles en este momento</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Staff Selection */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-200">
                                            Profesional (opcional)
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <select
                                                name="staffId"
                                                value={formData.staffId}
                                                onChange={handleInputChange}
                                                className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300 appearance-none cursor-pointer"
                                            >
                                                <option value="" className="text-slate-900">Sin preferencia</option>
                                                {staff.map(member => (
                                                    <option key={member.id} value={member.id} className="text-slate-900">
                                                        {member.fullName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {staff.length === 0 && (
                                            <p className="text-sm text-slate-400">
                                                Será asignado un profesional disponible
                                            </p>
                                        )}
                                    </div>

                                    {/* Date and Time Row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Date */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-slate-200">
                                                Fecha *
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <input
                                                    type="date"
                                                    name="appointmentDate"
                                                    min={today}
                                                    value={formData.appointmentDate}
                                                    onChange={handleDateChange}
                                                    className={`w-full pl-12 pr-4 py-4 bg-white/5 border-2 rounded-2xl text-white outline-none focus:bg-white/10 transition-all duration-300 ${selectedDayInfo && !selectedDayInfo.enabled
                                                        ? 'border-red-500/50 focus:border-red-400'
                                                        : 'border-white/10 focus:border-blue-400'
                                                        }`}
                                                    required
                                                />
                                            </div>
                                            {/* Business hours info for selected date */}
                                            {selectedDayInfo && (
                                                selectedDayInfo.enabled ? (
                                                    <p className="text-sm text-emerald-400 flex items-center space-x-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        <span>
                                                            {selectedDayInfo.dayLabel}: {formatTimeDisplay(selectedDayInfo.open)} - {formatTimeDisplay(selectedDayInfo.close)}
                                                        </span>
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-red-400 flex items-center space-x-1">
                                                        <XCircle className="w-3 h-3" />
                                                        <span>
                                                            {selectedDayInfo.dayLabel}: Cerrado - No se permiten reservas
                                                        </span>
                                                    </p>
                                                )
                                            )}
                                        </div>

                                        {/* Time - Changes to dropdown when business hours exist */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-slate-200">
                                                Hora *
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                {businessData?.businessHours && availableTimeSlots.length > 0 ? (
                                                    // Dropdown for available time slots
                                                    <select
                                                        name="appointmentTime"
                                                        value={formData.appointmentTime}
                                                        onChange={handleInputChange}
                                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300 appearance-none cursor-pointer"
                                                        required
                                                        disabled={!selectedDayInfo?.enabled}
                                                    >
                                                        <option value="" className="text-slate-900">Selecciona hora</option>
                                                        {availableTimeSlots.map(slot => (
                                                            <option key={slot} value={slot} className="text-slate-900">
                                                                {formatTimeDisplay(slot)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    // Regular time input if no business hours configured
                                                    <input
                                                        type="time"
                                                        name="appointmentTime"
                                                        value={formData.appointmentTime}
                                                        onChange={handleInputChange}
                                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300"
                                                        required
                                                        disabled={selectedDayInfo && !selectedDayInfo.enabled}
                                                    />
                                                )}
                                            </div>
                                            {selectedDayInfo && !selectedDayInfo.enabled && (
                                                <p className="text-sm text-slate-500">
                                                    Selecciona otro día para ver horarios disponibles
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-200">
                                            Notas adicionales (opcional)
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <textarea
                                                name="notes"
                                                placeholder="Información adicional o solicitudes especiales..."
                                                value={formData.notes}
                                                onChange={handleInputChange}
                                                rows={3}
                                                className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300 resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || services.length === 0}
                                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105 disabled:transform-none"
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center justify-center space-x-2">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Agendando...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center space-x-2">
                                                <Calendar className="w-5 h-5" />
                                                <span>Agendar Cita</span>
                                            </div>
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Cost Summary Card */}
                            {selectedService && (
                                <div className="backdrop-blur-xl bg-white/5 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
                                    <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center space-x-2">
                                        <DollarSign className="w-5 h-5" />
                                        <span>Resumen del Costo Estimado</span>
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300">Servicio:</span>
                                            <span className="font-medium">{selectedService.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300 flex items-center space-x-1">
                                                <Timer className="w-4 h-4" />
                                                <span>Duración estimada:</span>
                                            </span>
                                            <span className="font-medium">{formatDuration(selectedService.duration)}</span>
                                        </div>
                                        {selectedStaff && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-300 flex items-center space-x-1">
                                                    <Users className="w-4 h-4" />
                                                    <span>Profesional:</span>
                                                </span>
                                                <span className="font-medium">{selectedStaff.fullName}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-white/10 pt-3 mt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-semibold text-white">Total Estimado:</span>
                                                <span className="text-2xl font-bold text-emerald-400">
                                                    {formatPrice(selectedService.price)}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            * El precio final puede variar según los servicios adicionales requeridos
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Note */}
                    <div className="text-center mt-6">
                        <p className="text-sm text-slate-400">
                            {businessId
                                ? `📍 Reservando en: ${businessData?.name || businessId}`
                                : '⚠️ Por favor accede mediante /book/{businessId}'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
