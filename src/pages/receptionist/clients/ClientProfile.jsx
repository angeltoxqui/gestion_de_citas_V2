import { useState, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { onSnapshot, query, orderBy, doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { getBusinessCollection, getBusinessDoc } from '../../../utils/firestoreUtils'
import toast from 'react-hot-toast'
import {
    ArrowLeft,
    User,
    Phone,
    Mail,
    Calendar,
    DollarSign,
    FileText,
    Save,
    Crown,
    Sparkles,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    Brain,
    Zap
} from 'lucide-react'
import { useClientIntelligence } from '../../../hooks/useClientIntelligence'

// VIP threshold
const VIP_THRESHOLD = 1000000

export default function ClientProfile() {
    const { clientId } = useParams()
    const { businessId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('appointments')
    const [appointments, setAppointments] = useState([])
    const [invoices, setInvoices] = useState([])
    const [notes, setNotes] = useState('')
    const [originalNotes, setOriginalNotes] = useState('')

    // Decode client ID
    const decodedClientId = decodeURIComponent(clientId || '')
    const [clientName, clientPhone] = decodedClientId.split('-')

    // Fetch appointments
    useEffect(() => {
        if (!businessId) return

        const appointmentsRef = getBusinessCollection(businessId, 'appointments')
        const q = query(appointmentsRef, orderBy('appointmentDate', 'desc'))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(apt =>
                    apt.patientName === clientName &&
                    (apt.patientPhone === clientPhone || !clientPhone)
                )
            setAppointments(data)
        })

        return () => unsubscribe()
    }, [businessId, clientName, clientPhone])

    // Fetch invoices
    useEffect(() => {
        if (!businessId) return

        const invoicesRef = getBusinessCollection(businessId, 'invoices')
        const q = query(invoicesRef, orderBy('createdAt', 'desc'))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(inv =>
                    inv.patientName === clientName &&
                    (inv.patientPhone === clientPhone || !clientPhone)
                )
            setInvoices(data)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [businessId, clientName, clientPhone])

    // Fetch client notes
    useEffect(() => {
        if (!businessId || !decodedClientId) return

        const fetchNotes = async () => {
            try {
                const noteDoc = await getDoc(getBusinessDoc(businessId, 'clientNotes', decodedClientId))
                if (noteDoc.exists()) {
                    const noteData = noteDoc.data()
                    setNotes(noteData.notes || '')
                    setOriginalNotes(noteData.notes || '')
                }
            } catch (error) {
                console.error('Error fetching notes:', error)
            }
        }

        fetchNotes()
    }, [businessId, decodedClientId])

    // Client Intelligence
    const intelligence = useClientIntelligence(appointments, invoices)

    // Calculate stats
    const stats = useMemo(() => {
        const totalSpent = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)

        const pendingPayments = invoices
            .filter(inv => inv.status === 'pending')
            .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)

        const today = new Date().toISOString().split('T')[0]
        const futureAppointments = appointments.filter(apt => apt.appointmentDate >= today)
        const pastAppointments = appointments.filter(apt => apt.appointmentDate < today)

        return {
            totalSpent,
            pendingPayments,
            totalAppointments: appointments.length,
            futureAppointments: futureAppointments.length,
            pastAppointments: pastAppointments.length,
            badge: totalSpent >= VIP_THRESHOLD ? 'vip' :
                totalSpent === 0 && appointments.length <= 1 ? 'new' : null
        }
    }, [appointments, invoices])

    // Save notes
    const handleSaveNotes = async () => {
        if (!businessId || notes === originalNotes) return

        setSaving(true)
        try {
            await setDoc(getBusinessDoc(businessId, 'clientNotes', decodedClientId), {
                notes,
                clientName,
                clientPhone,
                updatedAt: new Date().toISOString()
            }, { merge: true })

            setOriginalNotes(notes)
            toast.success('Notas guardadas correctamente')
        } catch (error) {
            console.error('Error saving notes:', error)
            toast.error('Error al guardar las notas')
        } finally {
            setSaving(false)
        }
    }

    // Get status badge for appointments
    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pendiente' },
            confirmed: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: CheckCircle, label: 'Confirmada' },
            completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Completada' },
            cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Cancelada' }
        }
        return badges[status] || badges.pending
    }

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A'
        const date = new Date(dateStr)
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Cargando perfil...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
            {/* Header */}
            <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Link
                            to="/receptionist/clients"
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>

                        {/* Client Avatar */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.badge === 'vip'
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                            : 'bg-purple-500/20'
                            }`}>
                            {stats.badge === 'vip' ? (
                                <Crown className="w-6 h-6 text-white" />
                            ) : (
                                <User className="w-6 h-6 text-purple-400" />
                            )}
                        </div>

                        <div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-xl font-bold">{clientName}</h1>
                                {stats.badge === 'vip' && (
                                    <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold rounded-full">
                                        VIP
                                    </span>
                                )}
                                {stats.badge === 'new' && (
                                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded-full border border-cyan-400/30">
                                        Nuevo
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center space-x-3 text-sm text-slate-400">
                                {clientPhone && (
                                    <span className="flex items-center space-x-1">
                                        <Phone className="w-3 h-3" />
                                        <span>{clientPhone}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className={`rounded-xl p-4 backdrop-blur-xl ${stats.badge === 'vip'
                        ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30'
                        : 'bg-white/5 border border-white/10'
                        }`}>
                        <div className="flex items-center space-x-3">
                            <DollarSign className={`w-8 h-8 ${stats.badge === 'vip' ? 'text-yellow-400' : 'text-green-400'}`} />
                            <div>
                                <p className={`text-2xl font-bold ${stats.badge === 'vip' ? 'text-yellow-400' : 'text-green-400'}`}>
                                    ${stats.totalSpent.toLocaleString()}
                                </p>
                                <p className="text-sm text-slate-400">Total Gastado</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
                        <div className="flex items-center space-x-3">
                            <Calendar className="w-8 h-8 text-blue-400" />
                            <div>
                                <p className="text-2xl font-bold text-blue-400">{stats.totalAppointments}</p>
                                <p className="text-sm text-slate-400">Total Citas</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
                        <div className="flex items-center space-x-3">
                            <Clock className="w-8 h-8 text-cyan-400" />
                            <div>
                                <p className="text-2xl font-bold text-cyan-400">{stats.futureAppointments}</p>
                                <p className="text-sm text-slate-400">Citas Futuras</p>
                            </div>
                        </div>
                    </div>

                    {stats.pendingPayments > 0 && (
                        <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 backdrop-blur-xl">
                            <div className="flex items-center space-x-3">
                                <AlertCircle className="w-8 h-8 text-red-400" />
                                <div>
                                    <p className="text-2xl font-bold text-red-400">${stats.pendingPayments.toLocaleString()}</p>
                                    <p className="text-sm text-red-300">Pagos Pendientes</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
                    {/* Tab Headers */}
                    <div className="flex border-b border-white/10">
                        <button
                            onClick={() => setActiveTab('appointments')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'appointments'
                                ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-400'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Historial de Citas
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'payments'
                                ? 'bg-green-500/20 text-green-400 border-b-2 border-green-400'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <DollarSign className="w-4 h-4 inline mr-2" />
                            Historial de Pagos
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'notes'
                                ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <FileText className="w-4 h-4 inline mr-2" />
                            Notas Internas
                        </button>
                        <button
                            onClick={() => setActiveTab('intelligence')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'intelligence'
                                ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-400'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Brain className="w-4 h-4 inline mr-2" />
                            Inteligencia
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {/* Appointments Tab */}
                        {activeTab === 'appointments' && (
                            <div>
                                {appointments.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                        <p>No hay citas registradas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {appointments.map(apt => {
                                            const status = getStatusBadge(apt.status)
                                            const StatusIcon = status.icon
                                            const today = new Date().toISOString().split('T')[0]
                                            const isFuture = apt.appointmentDate >= today

                                            return (
                                                <div
                                                    key={apt.id}
                                                    className={`p-4 rounded-xl border ${isFuture
                                                        ? 'bg-blue-500/10 border-blue-400/30'
                                                        : 'bg-white/5 border-white/10'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="font-medium">{apt.serviceName || 'Servicio'}</span>
                                                                {isFuture && (
                                                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                                                        Próxima
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-slate-400 mt-1">
                                                                {formatDate(apt.appointmentDate)} - {apt.appointmentTime || 'Sin hora'}
                                                            </p>
                                                            {apt.doctorName && (
                                                                <p className="text-sm text-slate-400">
                                                                    Con: {apt.doctorName}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
                                                                <StatusIcon className="w-3 h-3" />
                                                                <span className="text-xs">{status.label}</span>
                                                            </span>
                                                            {apt.servicePrice > 0 && (
                                                                <p className="text-green-400 font-medium mt-1">
                                                                    ${apt.servicePrice.toLocaleString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Payments Tab */}
                        {activeTab === 'payments' && (
                            <div>
                                {/* Total Summary */}
                                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-6 mb-6">
                                    <div className="text-center">
                                        <p className="text-sm text-slate-300 mb-1">Total Acumulado</p>
                                        <p className="text-4xl font-bold text-green-400">
                                            ${stats.totalSpent.toLocaleString()}
                                        </p>
                                        <p className="text-sm text-slate-400 mt-2">
                                            {invoices.filter(i => i.status === 'paid').length} facturas pagadas
                                        </p>
                                    </div>
                                </div>

                                {invoices.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                        <p>No hay facturas registradas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {invoices.map(inv => (
                                            <div
                                                key={inv.id}
                                                className="p-4 bg-white/5 border border-white/10 rounded-xl"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{inv.invoiceNumber || 'Factura'}</p>
                                                        <p className="text-sm text-slate-400 mt-1">
                                                            {formatDate(inv.invoiceDate || inv.createdAt)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-bold ${inv.status === 'paid' ? 'text-green-400' : 'text-yellow-400'
                                                            }`}>
                                                            ${(inv.totalAmount || 0).toLocaleString()}
                                                        </p>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'paid'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'bg-yellow-500/20 text-yellow-400'
                                                            }`}>
                                                            {inv.status === 'paid' ? 'Pagada' : 'Pendiente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes Tab */}
                        {activeTab === 'notes' && (
                            <div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Notas y Preferencias del Cliente
                                    </label>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Añade notas internas sobre preferencias, alergias, o cualquier información importante.
                                    </p>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Ej: Le gusta el café sin azúcar, prefiere citas en la mañana, alérgica al látex..."
                                        rows={6}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSaveNotes}
                                    disabled={saving || notes === originalNotes}
                                    className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors ${notes !== originalNotes
                                        ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                        : 'bg-white/10 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    <span>{saving ? 'Guardando...' : 'Guardar Notas'}</span>
                                </button>

                                {notes !== originalNotes && (
                                    <p className="text-sm text-yellow-400 mt-2">
                                        Tienes cambios sin guardar
                                    </p>
                                )}
                            </div>
                        )}
                        {/* Intelligence Tab */}
                        {activeTab === 'intelligence' && (
                            <div className='mt-6'>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    {/* Tags Section */}
                                    <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                                            <Sparkles className="w-5 h-5 mr-2 text-cyan-400" />
                                            Etiquetas Automáticas
                                        </h3>

                                        {intelligence.tags.length === 0 ? (
                                            <p className="text-slate-400">Sin etiquetas asignadas todavía.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-3">
                                                {intelligence.tags.map(tag => (
                                                    <div
                                                        key={tag.id}
                                                        className={`flex flex-col px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 bg-gradient-to-br from-${tag.color}-500/20 to-slate-800/50`}
                                                        style={{
                                                            // Fallback colors for dynamic classes in Tailwind
                                                            backgroundColor: tag.id === 'lost' ? 'rgba(239, 68, 68, 0.2)' :
                                                                tag.id === 'loyal' ? 'rgba(59, 130, 246, 0.2)' :
                                                                    tag.id === 'whale' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(6, 182, 212, 0.2)'
                                                        }}
                                                    >
                                                        <span className={`font-bold text-${tag.color}-400`}>{tag.label}</span>
                                                        <span className="text-xs text-slate-400 mt-1">{tag.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* RFM Metrics */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                                        <h4 className="text-slate-400 text-sm font-medium mb-4 flex items-center">
                                            <Clock className="w-4 h-4 mr-2" />
                                            Recencia (Días sin visita)
                                        </h4>
                                        <p className="text-3xl font-bold text-white">
                                            {intelligence.recency.days !== null ? `${intelligence.recency.days}` : 'N/A'}
                                        </p>
                                        <p className="text-sm text-slate-500 mt-2">
                                            Última: {intelligence.recency.lastDate ? formatDate(intelligence.recency.lastDate) : 'Nunca'}
                                        </p>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                                        <h4 className="text-slate-400 text-sm font-medium mb-4 flex items-center">
                                            <Calendar className="w-4 h-4 mr-2" />
                                            Frecuencia (Visitas)
                                        </h4>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-3xl font-bold text-white">{intelligence.frequency.thisYear}</p>
                                                <p className="text-sm text-slate-500 mt-1">Este año</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-medium text-slate-300">{intelligence.frequency.total}</p>
                                                <p className="text-xs text-slate-500">Histórico</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                                        <h4 className="text-slate-400 text-sm font-medium mb-4 flex items-center">
                                            <DollarSign className="w-4 h-4 mr-2" />
                                            Valor Monetario (Ticket)
                                        </h4>
                                        <p className="text-3xl font-bold text-white">
                                            ${intelligence.monetary.avgTicket.toLocaleString()}
                                        </p>
                                        <p className="text-sm text-slate-500 mt-2">
                                            Ticket Promedio
                                        </p>
                                    </div>
                                </div>

                                {/* Suggestions */}
                                {intelligence.suggestions.length > 0 && (
                                    <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/30 rounded-2xl p-6 backdrop-blur-xl">
                                        <h3 className="text-lg font-semibold mb-6 flex items-center text-indigo-300">
                                            <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                                            Acciones Sugeridas
                                        </h3>
                                        <div className="space-y-4">
                                            {intelligence.suggestions.map((suggestion, index) => (
                                                <div key={index} className="flex items-start bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                                                    <div className={`mt-1 w-2 h-2 rounded-full mr-4 ${suggestion.priority === 'high' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                                                        }`} />
                                                    <div>
                                                        <h5 className="font-bold text-indigo-200">{suggestion.title}</h5>
                                                        <p className="text-indigo-100/70 mt-1">{suggestion.action}</p>
                                                    </div>
                                                    {suggestion.priority === 'high' && (
                                                        <span className="ml-auto text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30">
                                                            Prioridad Alta
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
