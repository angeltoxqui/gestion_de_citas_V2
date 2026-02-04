import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { usePlanLimits } from '../../../hooks/usePlanLimits'
import { Link } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import LogoutButton from '../../../components/LogoutButton'
import {
    ArrowLeft, Users, UserPlus, Mail, Briefcase, Shield, Clock,
    CheckCircle, AlertCircle, Trash2, Edit2, Copy, X, Loader2, User, Crown, Zap
} from 'lucide-react'
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { formatPlanPrice } from '../../../utils/plans'

// Generate a short unique invitation code
const generateInvitationCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes confusing chars like 0,O,I,1
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

export default function TeamManagement() {
    const { currentUser, businessId } = useAuth()

    // Plan limits
    const {
        canAddStaff,
        getRemainingStaffSlots,
        getStaffLimitMessage,
        currentPlan,
        updateStaffCount
    } = usePlanLimits()

    // Team members state
    const [teamMembers, setTeamMembers] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const [invitationData, setInvitationData] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: 'doctor',
        specialty: ''
    })

    // Fetch team members
    useEffect(() => {
        if (!businessId) return

        setIsLoading(true)

        const staffRef = collection(db, 'staffData')
        const q = query(staffRef, where('businessId', '==', businessId))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const members = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            // Sort by createdAt, owner first
            members.sort((a, b) => {
                if (a.uid === currentUser?.uid) return -1
                if (b.uid === currentUser?.uid) return 1
                return new Date(b.createdAt) - new Date(a.createdAt)
            })
            setTeamMembers(members)
            updateStaffCount(members.length) // Update plan limits hook
            setIsLoading(false)
        }, (error) => {
            console.error('Error fetching team members:', error)
            toast.error('Error al cargar el equipo')
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [businessId, currentUser])

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Handle add member button click
    const handleAddMemberClick = () => {
        if (!canAddStaff(teamMembers.length)) {
            setShowUpgradeModal(true)
            return
        }
        setShowAddModal(true)
    }

    // Handle add member
    const handleAddMember = async (e) => {
        e.preventDefault()

        // Double check plan limits
        if (!canAddStaff(teamMembers.length)) {
            toast.error('Has alcanzado el límite de profesionales de tu plan')
            setShowAddModal(false)
            setShowUpgradeModal(true)
            return
        }

        if (!formData.fullName.trim() || !formData.email.trim()) {
            toast.error('Nombre y email son obligatorios')
            return
        }

        // Check if email already exists
        const existingMember = teamMembers.find(
            m => m.email?.toLowerCase() === formData.email.toLowerCase()
        )
        if (existingMember) {
            toast.error('Ya existe un miembro con ese email')
            return
        }

        setIsSubmitting(true)

        try {
            const invitationCode = generateInvitationCode()

            // Create staff document with pending status
            const staffRef = collection(db, 'staffData')
            const newMemberDoc = await addDoc(staffRef, {
                fullName: formData.fullName.trim(),
                email: formData.email.trim().toLowerCase(),
                role: formData.role,
                specialty: formData.specialty.trim() || null,
                businessId: businessId,
                status: 'pending', // Pending until they complete registration
                invitationCode: invitationCode,
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.uid,
                uid: null // Will be set when user completes registration
            })

            // Show invitation modal
            setInvitationData({
                id: newMemberDoc.id,
                name: formData.fullName,
                email: formData.email,
                code: invitationCode,
                link: `${window.location.origin}/join?code=${invitationCode}`
            })

            // Reset form and close add modal
            setFormData({ fullName: '', email: '', role: 'doctor', specialty: '' })
            setShowAddModal(false)
            setShowInviteModal(true)

            toast.success(`${formData.fullName} agregado al equipo`)
        } catch (error) {
            console.error('Error adding team member:', error)
            toast.error(`Error al agregar miembro: ${error.message}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle delete member
    const handleDeleteMember = async (member) => {
        if (member.uid === currentUser?.uid) {
            toast.error('No puedes eliminarte a ti mismo')
            return
        }

        if (!confirm(`¿Estás seguro de eliminar a ${member.fullName}?`)) {
            return
        }

        try {
            await deleteDoc(doc(db, 'staffData', member.id))
            toast.success(`${member.fullName} eliminado del equipo`)
        } catch (error) {
            console.error('Error deleting member:', error)
            toast.error(`Error al eliminar: ${error.message}`)
        }
    }

    // Copy invitation link to clipboard
    const copyInvitationLink = () => {
        if (invitationData?.link) {
            navigator.clipboard.writeText(invitationData.link)
            toast.success('Enlace copiado al portapapeles')
        }
    }

    // Get role label
    const getRoleLabel = (role) => {
        switch (role) {
            case 'doctor': return 'Profesional'
            case 'receptionist': return 'Recepcionista'
            case 'admin': return 'Administrador'
            default: return role
        }
    }

    // Get role color
    const getRoleColor = (role) => {
        switch (role) {
            case 'doctor': return 'text-blue-400 bg-blue-400/10'
            case 'receptionist': return 'text-purple-400 bg-purple-400/10'
            case 'admin': return 'text-amber-400 bg-amber-400/10'
            default: return 'text-slate-400 bg-slate-400/10'
        }
    }

    // Get status info
    const getStatusInfo = (member) => {
        if (member.uid || member.status === 'active') {
            return {
                label: 'Activo',
                color: 'text-emerald-400',
                bgColor: 'bg-emerald-400/10',
                icon: <CheckCircle className="w-4 h-4" />
            }
        }
        return {
            label: 'Pendiente',
            color: 'text-amber-400',
            bgColor: 'bg-amber-400/10',
            icon: <Clock className="w-4 h-4" />
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    </div>
                    <p className="text-slate-300">Cargando equipo...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
            <Toaster position="top-right" />

            {/* Header */}
            <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <Link
                            to="/doctor"
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Gestión de Equipo</h1>
                                <p className="text-sm text-slate-400">{teamMembers.length} miembro{teamMembers.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Staff count and limit indicator */}
                        {currentPlan && (
                            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-white/5 rounded-lg">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-300">
                                    {teamMembers.length} / {currentPlan.limits.maxStaff === Infinity ? '∞' : currentPlan.limits.maxStaff}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={handleAddMemberClick}
                            disabled={!canAddStaff(teamMembers.length)}
                            className={`px-4 py-2 font-medium rounded-xl transition-all duration-300 flex items-center space-x-2 ${canAddStaff(teamMembers.length)
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            <UserPlus className="w-5 h-5" />
                            <span>Nuevo Profesional</span>
                        </button>
                        <LogoutButton />
                    </div>
                </div>
            </header>

            {/* Upgrade Banner - Show when at limit */}
            {!canAddStaff(teamMembers.length) && (
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/30">
                    <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Crown className="w-5 h-5 text-amber-400" />
                            <p className="text-amber-200">
                                <strong>Límite alcanzado:</strong> Actualiza tu plan para agregar más profesionales
                            </p>
                        </div>
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg transition-colors flex items-center space-x-2"
                        >
                            <Zap className="w-4 h-4" />
                            <span>Actualizar Plan</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-6xl mx-auto p-6">
                {/* Team Members Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamMembers.map((member) => {
                        const statusInfo = getStatusInfo(member)
                        const isOwner = member.uid === currentUser?.uid

                        return (
                            <div
                                key={member.id}
                                className={`backdrop-blur-xl bg-white/5 border rounded-2xl p-5 transition-all duration-300 hover:bg-white/10 ${isOwner ? 'border-indigo-500/50' : 'border-white/10'
                                    }`}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${member.uid ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/20 text-slate-400'
                                            }`}>
                                            {member.fullName?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white flex items-center space-x-2">
                                                <span>{member.fullName}</span>
                                                {isOwner && (
                                                    <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full">
                                                        Tú
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-sm text-slate-400">{member.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Rol:</span>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(member.role)}`}>
                                            {getRoleLabel(member.role)}
                                        </span>
                                    </div>
                                    {member.specialty && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-400">Especialidad:</span>
                                            <span className="text-sm text-white">{member.specialty}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Estado:</span>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1 ${statusInfo.color} ${statusInfo.bgColor}`}>
                                            {statusInfo.icon}
                                            <span>{statusInfo.label}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                {!isOwner && (
                                    <div className="flex space-x-2 pt-3 border-t border-white/10">
                                        {member.status === 'pending' && member.invitationCode && (
                                            <button
                                                onClick={() => {
                                                    setInvitationData({
                                                        id: member.id,
                                                        name: member.fullName,
                                                        email: member.email,
                                                        code: member.invitationCode,
                                                        link: `${window.location.origin}/join?code=${member.invitationCode}`
                                                    })
                                                    setShowInviteModal(true)
                                                }}
                                                className="flex-1 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"
                                            >
                                                <Copy className="w-4 h-4" />
                                                <span>Ver Invitación</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteMember(member)}
                                            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Empty state */}
                    {teamMembers.length === 0 && (
                        <div className="col-span-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                            <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Sin miembros del equipo</h3>
                            <p className="text-slate-400 mb-6">
                                Agrega profesionales para que aparezcan en tu calendario y reservas públicas.
                            </p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-xl transition-all duration-300 inline-flex items-center space-x-2"
                            >
                                <UserPlus className="w-5 h-5" />
                                <span>Agregar Primer Profesional</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="mt-8 backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
                    <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-blue-400 mb-1">¿Cómo funciona?</h3>
                            <p className="text-sm text-slate-300">
                                Al agregar un profesional, se crea una "silla vacía" que aparece inmediatamente en el calendario y reservas públicas.
                                El empleado puede completar su registro después usando el código de invitación para acceder a su cuenta.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Member Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md">
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center space-x-2">
                                    <UserPlus className="w-6 h-6 text-indigo-400" />
                                    <span>Nuevo Profesional</span>
                                </h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleAddMember} className="p-6 space-y-4">
                            {/* Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Nombre Completo *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        name="fullName"
                                        placeholder="Carlos Rodríguez"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-indigo-400 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Email *
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="carlos@email.com"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-indigo-400 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Role */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Rol
                                </label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="doctor" className="text-slate-900">Profesional</option>
                                        <option value="receptionist" className="text-slate-900">Recepcionista</option>
                                        <option value="admin" className="text-slate-900">Administrador</option>
                                    </select>
                                </div>
                            </div>

                            {/* Specialty */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Especialidad (opcional)
                                </label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        name="specialty"
                                        placeholder="Ej: Cortes Clásicos, Colorimetría..."
                                        value={formData.specialty}
                                        onChange={handleInputChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-indigo-400 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Agregando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5" />
                                            <span>Agregar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invitation Modal */}
            {showInviteModal && invitationData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md">
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center space-x-2">
                                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                                    <span>¡Profesional Agregado!</span>
                                </h2>
                                <button
                                    onClick={() => setShowInviteModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UserPlus className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">{invitationData.name}</h3>
                                <p className="text-slate-400">{invitationData.email}</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-sm text-slate-400 mb-3">
                                    Comparte este enlace para que complete su registro:
                                </p>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={invitationData.link}
                                        readOnly
                                        className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm"
                                    />
                                    <button
                                        onClick={copyInvitationLink}
                                        className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                                    >
                                        <Copy className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    Código: <span className="font-mono text-indigo-400">{invitationData.code}</span>
                                </p>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                                <p className="text-sm text-blue-300">
                                    <strong>Nota:</strong> El profesional ya aparece disponible para reservas públicas.
                                    El enlace de invitación le permitirá crear su cuenta y acceder al sistema.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upgrade Plan Modal */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md">
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center space-x-2">
                                    <Crown className="w-6 h-6 text-amber-400" />
                                    <span>Actualiza tu Plan</span>
                                </h2>
                                <button
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-amber-400" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">
                                    {getStaffLimitMessage()?.title || 'Límite de profesionales alcanzado'}
                                </h3>
                                <p className="text-slate-400">
                                    {getStaffLimitMessage()?.message || 'Actualiza tu plan para agregar más profesionales.'}
                                </p>
                            </div>

                            {/* Current Plan */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-400">Plan actual:</span>
                                    <span className="text-sm font-medium text-white">{currentPlan?.name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Profesionales:</span>
                                    <span className="text-sm font-medium text-white">
                                        {teamMembers.length} / {currentPlan?.limits.maxStaff === Infinity ? '∞' : currentPlan?.limits.maxStaff}
                                    </span>
                                </div>
                            </div>

                            {/* Suggested Plan */}
                            {getStaffLimitMessage()?.suggestedPlan && (
                                <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-indigo-300">
                                            Plan {getStaffLimitMessage().suggestedPlan.name}
                                        </span>
                                        <span className="text-lg font-bold text-white">
                                            {formatPlanPrice(getStaffLimitMessage().suggestedPlan.price)}
                                        </span>
                                    </div>
                                    <ul className="space-y-1">
                                        {getStaffLimitMessage().suggestedPlan.features.slice(0, 4).map((feature, i) => (
                                            <li key={i} className="flex items-center space-x-2 text-sm text-slate-300">
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                                >
                                    Después
                                </button>
                                <button
                                    onClick={() => {
                                        // TODO: Navigate to pricing/upgrade page
                                        toast.success('Función de upgrade próximamente')
                                        setShowUpgradeModal(false)
                                    }}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                                >
                                    <Zap className="w-5 h-5" />
                                    <span>Actualizar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
