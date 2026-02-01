import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { Link } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import LogoutButton from '../../../components/LogoutButton'
import {
    ArrowLeft, Save, Settings, Building, Phone, MapPin, Image,
    Clock, Loader2, CheckCircle, AlertTriangle, Bell, Link as LinkIcon, MessageSquare, ToggleLeft, ToggleRight
} from 'lucide-react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../../firebase/config'

// Days of the week configuration
const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
]

// Default business hours template
const DEFAULT_BUSINESS_HOURS = {
    monday: { enabled: true, open: '09:00', close: '18:00' },
    tuesday: { enabled: true, open: '09:00', close: '18:00' },
    wednesday: { enabled: true, open: '09:00', close: '18:00' },
    thursday: { enabled: true, open: '09:00', close: '18:00' },
    friday: { enabled: true, open: '09:00', close: '18:00' },
    saturday: { enabled: false, open: '', close: '' },
    sunday: { enabled: false, open: '', close: '' }
}

export default function BusinessSettings() {
    const { currentUser, businessId } = useAuth()

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        contactPhone: '',
        address: '',
        addressLink: '',
        logoUrl: '',
        businessHours: { ...DEFAULT_BUSINESS_HOURS },
        // Notification settings
        webhookUrl: '',
        welcomeMessage: 'Hola {cliente}, tu cita ha sido agendada para el {fecha} a las {hora}. ¡Te esperamos!',
        autoRemindersEnabled: false
    })

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Fetch existing business data
    useEffect(() => {
        if (!businessId) return

        const fetchBusinessData = async () => {
            setIsLoading(true)
            try {
                const businessRef = doc(db, 'businesses', businessId)
                const businessDoc = await getDoc(businessRef)

                if (businessDoc.exists()) {
                    const data = businessDoc.data()
                    setFormData({
                        name: data.name || '',
                        contactPhone: data.contactPhone || '',
                        address: data.address || '',
                        addressLink: data.addressLink || '',
                        logoUrl: data.logoUrl || '',
                        businessHours: data.businessHours || { ...DEFAULT_BUSINESS_HOURS },
                        // Notification settings
                        webhookUrl: data.webhookUrl || '',
                        welcomeMessage: data.welcomeMessage || 'Hola {cliente}, tu cita ha sido agendada para el {fecha} a las {hora}. ¡Te esperamos!',
                        autoRemindersEnabled: data.autoRemindersEnabled || false
                    })
                }
            } catch (error) {
                console.error('Error fetching business data:', error)
                toast.error('Error al cargar la configuración')
            } finally {
                setIsLoading(false)
            }
        }

        fetchBusinessData()
    }, [businessId])

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setHasChanges(true)
    }

    // Handle business hours changes
    const handleHoursChange = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            businessHours: {
                ...prev.businessHours,
                [day]: {
                    ...prev.businessHours[day],
                    [field]: field === 'enabled' ? value : value
                }
            }
        }))
        setHasChanges(true)
    }

    // Toggle day enabled/disabled
    const toggleDayEnabled = (day) => {
        const currentDay = formData.businessHours[day]
        const newEnabled = !currentDay.enabled

        setFormData(prev => ({
            ...prev,
            businessHours: {
                ...prev.businessHours,
                [day]: {
                    enabled: newEnabled,
                    open: newEnabled ? (currentDay.open || '09:00') : '',
                    close: newEnabled ? (currentDay.close || '18:00') : ''
                }
            }
        }))
        setHasChanges(true)
    }

    // Save business settings
    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!businessId) {
            toast.error('No se encontró el ID del negocio')
            return
        }

        // Validate required fields
        if (!formData.name.trim()) {
            toast.error('El nombre comercial es obligatorio')
            return
        }

        setIsSaving(true)

        try {
            const businessRef = doc(db, 'businesses', businessId)

            await setDoc(businessRef, {
                ...formData,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.uid
            }, { merge: true })

            toast.success('¡Configuración guardada exitosamente!')
            setHasChanges(false)
        } catch (error) {
            console.error('Error saving business settings:', error)
            toast.error(`Error al guardar: ${error.message}`)
        } finally {
            setIsSaving(false)
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
                    <p className="text-slate-300">Cargando configuración...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
            <Toaster position="top-right" />

            {/* Header */}
            <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <Link
                            to="/doctor"
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <Settings className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Configuración del Negocio</h1>
                                <p className="text-sm text-slate-400">Personaliza la información visible para tus clientes</p>
                            </div>
                        </div>
                    </div>
                    <LogoutButton />
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information Card */}
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                            <Building className="w-5 h-5 text-blue-400" />
                            <span>Información Básica</span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Business Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Nombre Comercial *
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                        <Building className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="Ej: Barbería Pepe"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Contact Phone */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Teléfono de Contacto
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="tel"
                                        name="contactPhone"
                                        placeholder="+52 123 456 7890"
                                        value={formData.contactPhone}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Dirección Física
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text"
                                        name="address"
                                        placeholder="Calle Principal 123, Ciudad"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300"
                                    />
                                </div>
                            </div>

                            {/* Google Maps Link */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Link de Google Maps (opcional)
                                </label>
                                <input
                                    type="url"
                                    name="addressLink"
                                    placeholder="https://maps.google.com/..."
                                    value={formData.addressLink}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300"
                                />
                            </div>

                            {/* Logo URL */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    URL del Logo
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                        <Image className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="url"
                                        name="logoUrl"
                                        placeholder="https://example.com/logo.png"
                                        value={formData.logoUrl}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-slate-400 outline-none focus:border-blue-400 focus:bg-white/10 transition-all duration-300"
                                    />
                                </div>
                                {formData.logoUrl && (
                                    <div className="mt-2 flex items-center space-x-3">
                                        <img
                                            src={formData.logoUrl}
                                            alt="Logo preview"
                                            className="w-16 h-16 object-contain bg-white/10 rounded-xl"
                                            onError={(e) => {
                                                e.target.style.display = 'none'
                                            }}
                                        />
                                        <span className="text-sm text-slate-400">Vista previa del logo</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Business Hours Card */}
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                            <Clock className="w-5 h-5 text-emerald-400" />
                            <span>Horarios de Atención</span>
                        </h2>
                        <p className="text-sm text-slate-400 mb-4">
                            Define los horarios en que tus clientes pueden agendar citas. Los días deshabilitados no permitirán reservas.
                        </p>

                        <div className="space-y-3">
                            {DAYS_OF_WEEK.map(({ key, label }) => {
                                const dayData = formData.businessHours[key] || { enabled: false, open: '', close: '' }

                                return (
                                    <div
                                        key={key}
                                        className={`flex items-center space-x-4 p-3 rounded-xl transition-all duration-300 ${dayData.enabled
                                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                                            : 'bg-white/5 border border-white/10'
                                            }`}
                                    >
                                        {/* Day Toggle */}
                                        <button
                                            type="button"
                                            onClick={() => toggleDayEnabled(key)}
                                            className={`w-24 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300 ${dayData.enabled
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-white/10 text-slate-400 hover:bg-white/20'
                                                }`}
                                        >
                                            {label}
                                        </button>

                                        {dayData.enabled ? (
                                            <>
                                                {/* Open Time */}
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm text-slate-400">Abre:</span>
                                                    <input
                                                        type="time"
                                                        value={dayData.open}
                                                        onChange={(e) => handleHoursChange(key, 'open', e.target.value)}
                                                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm outline-none focus:border-emerald-400 transition-colors"
                                                    />
                                                </div>

                                                {/* Close Time */}
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm text-slate-400">Cierra:</span>
                                                    <input
                                                        type="time"
                                                        value={dayData.close}
                                                        onChange={(e) => handleHoursChange(key, 'close', e.target.value)}
                                                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm outline-none focus:border-emerald-400 transition-colors"
                                                    />
                                                </div>

                                                <CheckCircle className="w-5 h-5 text-emerald-400 ml-auto" />
                                            </>
                                        ) : (
                                            <div className="flex items-center space-x-2 text-slate-500">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span className="text-sm">Cerrado - No se permiten reservas</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Notifications Card */}
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                            <Bell className="w-5 h-5 text-purple-400" />
                            <span>Notificaciones</span>
                        </h2>
                        <p className="text-sm text-slate-400 mb-4">
                            Configura las notificaciones automáticas para tus clientes cuando agendan citas.
                        </p>

                        <div className="space-y-4">
                            {/* Auto Reminders Toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="flex items-center space-x-3">
                                    {formData.autoRemindersEnabled ? (
                                        <ToggleRight className="w-6 h-6 text-purple-400" />
                                    ) : (
                                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                                    )}
                                    <div>
                                        <span className="font-medium text-white">Activar Recordatorios Automáticos</span>
                                        <p className="text-xs text-slate-400">Envía notificaciones cuando se crea una cita</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, autoRemindersEnabled: !prev.autoRemindersEnabled }))
                                        setHasChanges(true)
                                    }}
                                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${formData.autoRemindersEnabled
                                            ? 'bg-purple-500'
                                            : 'bg-slate-600'
                                        }`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${formData.autoRemindersEnabled
                                            ? 'translate-x-8'
                                            : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>

                            {/* Webhook URL */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Webhook URL para WhatsApp
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-400 transition-colors">
                                        <LinkIcon className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="password"
                                        name="webhookUrl"
                                        placeholder="https://tu-webhook.com/endpoint"
                                        value={formData.webhookUrl}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-slate-400 outline-none focus:border-purple-400 focus:bg-white/10 transition-all duration-300"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    URL de n8n, Twilio, Waha u otro servicio de webhooks
                                </p>
                            </div>

                            {/* Welcome Message */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Mensaje de Bienvenida
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-4 text-slate-400 group-focus-within:text-purple-400 transition-colors">
                                        <MessageSquare className="w-4 h-4" />
                                    </div>
                                    <textarea
                                        name="welcomeMessage"
                                        placeholder="Hola {cliente}, tu cita ha sido agendada..."
                                        value={formData.welcomeMessage}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full pl-12 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-slate-400 outline-none focus:border-purple-400 focus:bg-white/10 transition-all duration-300 resize-none"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-xs text-slate-500">Variables disponibles:</span>
                                    {['{cliente}', '{hora}', '{fecha}', '{servicio}', '{profesional}', '{negocio}'].map(variable => (
                                        <code
                                            key={variable}
                                            className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded cursor-pointer hover:bg-purple-500/30 transition-colors"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    welcomeMessage: prev.welcomeMessage + ' ' + variable
                                                }))
                                                setHasChanges(true)
                                            }}
                                        >
                                            {variable}
                                        </code>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end space-x-4">
                        <Link
                            to="/doctor"
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={isSaving || !hasChanges}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 flex items-center space-x-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    <span>Guardar Configuración</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Preview Card */}
                {formData.name && (
                    <div className="mt-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">
                            Vista Previa - Así verán tus clientes
                        </h2>
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6">
                            <div className="flex items-center space-x-4 mb-4">
                                {formData.logoUrl ? (
                                    <img
                                        src={formData.logoUrl}
                                        alt={formData.name}
                                        className="w-16 h-16 object-contain bg-white/10 rounded-xl"
                                        onError={(e) => {
                                            e.target.src = ''
                                            e.target.className = 'hidden'
                                        }}
                                    />
                                ) : (
                                    <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                        <Building className="w-8 h-8 text-blue-400" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-xl font-bold text-white">{formData.name}</h3>
                                    {formData.contactPhone && (
                                        <p className="text-slate-400 flex items-center space-x-1">
                                            <Phone className="w-4 h-4" />
                                            <span>{formData.contactPhone}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            {formData.address && (
                                <p className="text-slate-400 flex items-center space-x-2">
                                    <MapPin className="w-4 h-4 flex-shrink-0" />
                                    <span>
                                        {formData.addressLink ? (
                                            <a
                                                href={formData.addressLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-blue-400 underline"
                                            >
                                                {formData.address}
                                            </a>
                                        ) : (
                                            formData.address
                                        )}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
