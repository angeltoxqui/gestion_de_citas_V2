import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { onSnapshot, query, orderBy, doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { getBusinessCollection, getBusinessDoc } from '../../../utils/firestoreUtils'
import {
    ArrowLeft,
    Users,
    Search,
    Star,
    Sparkles,
    Phone,
    Calendar,
    DollarSign,
    ChevronRight,
    User,
    Loader2,
    Crown,
    UserPlus
} from 'lucide-react'

// VIP threshold in currency (1,000,000)
const VIP_THRESHOLD = 1000000

export default function ClientList() {
    const { businessId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [appointments, setAppointments] = useState([])
    const [invoices, setInvoices] = useState([])
    const [clientNotes, setClientNotes] = useState({})
    const [selectedClient, setSelectedClient] = useState(null)

    // Fetch appointments
    useEffect(() => {
        if (!businessId) return

        const appointmentsRef = getBusinessCollection(businessId, 'appointments')
        const q = query(appointmentsRef, orderBy('createdAt', 'desc'))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setAppointments(data)
        })

        return () => unsubscribe()
    }, [businessId])

    // Fetch invoices
    useEffect(() => {
        if (!businessId) return

        const invoicesRef = getBusinessCollection(businessId, 'invoices')
        const q = query(invoicesRef, orderBy('createdAt', 'desc'))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setInvoices(data)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [businessId])

    // Fetch client notes
    useEffect(() => {
        if (!businessId) return

        const clientNotesRef = getBusinessCollection(businessId, 'clientNotes')

        const unsubscribe = onSnapshot(clientNotesRef, (snapshot) => {
            const notes = {}
            snapshot.docs.forEach(doc => {
                notes[doc.id] = doc.data()
            })
            setClientNotes(notes)
        })

        return () => unsubscribe()
    }, [businessId])

    // Build clients from appointments and invoices
    const clients = useMemo(() => {
        const clientMap = new Map()

        // Process appointments
        appointments.forEach(apt => {
            const key = `${apt.patientName || ''}-${apt.patientPhone || ''}`
            if (!apt.patientName) return

            if (!clientMap.has(key)) {
                clientMap.set(key, {
                    id: key,
                    name: apt.patientName,
                    phone: apt.patientPhone || '',
                    email: apt.patientEmail || '',
                    appointments: [],
                    invoices: [],
                    totalSpent: 0,
                    lastVisit: null,
                    notes: clientNotes[key]?.notes || ''
                })
            }

            const client = clientMap.get(key)
            client.appointments.push(apt)

            // Track last visit
            if (apt.appointmentDate) {
                const aptDate = new Date(apt.appointmentDate)
                if (!client.lastVisit || aptDate > client.lastVisit) {
                    client.lastVisit = aptDate
                }
            }
        })

        // Process invoices - match by patient name/phone
        invoices.forEach(inv => {
            const key = `${inv.patientName || ''}-${inv.patientPhone || ''}`
            if (!inv.patientName) return

            if (clientMap.has(key)) {
                const client = clientMap.get(key)
                client.invoices.push(inv)
                if (inv.status === 'paid') {
                    client.totalSpent += inv.totalAmount || 0
                }
            } else {
                // Create client from invoice if not exists
                clientMap.set(key, {
                    id: key,
                    name: inv.patientName,
                    phone: inv.patientPhone || '',
                    email: inv.patientEmail || '',
                    appointments: [],
                    invoices: [inv],
                    totalSpent: inv.status === 'paid' ? (inv.totalAmount || 0) : 0,
                    lastVisit: null,
                    notes: clientNotes[key]?.notes || ''
                })
            }
        })

        // Calculate badge for each client
        const clientsArray = Array.from(clientMap.values()).map(client => ({
            ...client,
            badge: client.totalSpent >= VIP_THRESHOLD ? 'vip' :
                client.totalSpent === 0 && client.appointments.length <= 1 ? 'new' : null,
            appointmentsCount: client.appointments.length,
            invoicesCount: client.invoices.length
        }))

        // Sort by total spent descending
        return clientsArray.sort((a, b) => b.totalSpent - a.totalSpent)
    }, [appointments, invoices, clientNotes])

    // Filter clients by search term
    const filteredClients = useMemo(() => {
        if (!searchTerm) return clients

        const term = searchTerm.toLowerCase()
        return clients.filter(client =>
            client.name.toLowerCase().includes(term) ||
            client.phone.includes(term) ||
            (client.email && client.email.toLowerCase().includes(term))
        )
    }, [clients, searchTerm])

    // Stats
    const stats = useMemo(() => ({
        total: clients.length,
        vip: clients.filter(c => c.badge === 'vip').length,
        new: clients.filter(c => c.badge === 'new').length,
        totalRevenue: clients.reduce((sum, c) => sum + c.totalSpent, 0)
    }), [clients])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Cargando clientes...</p>
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
                            to="/receptionist"
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">CRM de Clientes</h1>
                            <p className="text-sm text-slate-400">Gestión de clientes y valor de vida</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
                        <div className="flex items-center space-x-3">
                            <Users className="w-8 h-8 text-blue-400" />
                            <div>
                                <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
                                <p className="text-sm text-slate-400">Total Clientes</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4 backdrop-blur-xl">
                        <div className="flex items-center space-x-3">
                            <Crown className="w-8 h-8 text-yellow-400" />
                            <div>
                                <p className="text-2xl font-bold text-yellow-400">{stats.vip}</p>
                                <p className="text-sm text-slate-300">Clientes VIP</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
                        <div className="flex items-center space-x-3">
                            <UserPlus className="w-8 h-8 text-cyan-400" />
                            <div>
                                <p className="text-2xl font-bold text-cyan-400">{stats.new}</p>
                                <p className="text-sm text-slate-400">Nuevos</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
                        <div className="flex items-center space-x-3">
                            <DollarSign className="w-8 h-8 text-green-400" />
                            <div>
                                <p className="text-2xl font-bold text-green-400">${stats.totalRevenue.toLocaleString()}</p>
                                <p className="text-sm text-slate-400">Ingresos Totales</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente por nombre, teléfono o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Client List */}
                <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-lg font-semibold">
                            {filteredClients.length} Cliente{filteredClients.length !== 1 ? 's' : ''}
                        </h2>
                    </div>

                    {filteredClients.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>No se encontraron clientes</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredClients.map(client => (
                                <Link
                                    key={client.id}
                                    to={`/receptionist/clients/${encodeURIComponent(client.id)}`}
                                    className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center space-x-4">
                                        {/* Avatar with badge */}
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${client.badge === 'vip'
                                                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                                                    : 'bg-purple-500/20'
                                                }`}>
                                                {client.badge === 'vip' ? (
                                                    <Crown className="w-6 h-6 text-white" />
                                                ) : (
                                                    <User className="w-6 h-6 text-purple-400" />
                                                )}
                                            </div>
                                            {client.badge === 'new' && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                                                    <Sparkles className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Client Info */}
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h3 className="font-semibold text-white">{client.name}</h3>
                                                {client.badge === 'vip' && (
                                                    <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold rounded-full">
                                                        VIP
                                                    </span>
                                                )}
                                                {client.badge === 'new' && (
                                                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded-full border border-cyan-400/30">
                                                        Nuevo
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-4 text-sm text-slate-400 mt-1">
                                                <span className="flex items-center space-x-1">
                                                    <Phone className="w-3 h-3" />
                                                    <span>{client.phone || 'Sin teléfono'}</span>
                                                </span>
                                                <span className="flex items-center space-x-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{client.appointmentsCount} citas</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side */}
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <p className={`font-bold ${client.totalSpent > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                                                ${client.totalSpent.toLocaleString()}
                                            </p>
                                            <p className="text-xs text-slate-400">Total gastado</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
