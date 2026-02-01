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
    Plus,
    Search,
    Filter,
    FileText,
    Briefcase,
    Eye,
    Edit,
    Trash2,
    ArrowLeft,
    Save,
    X,
    AlertTriangle,
    CheckCircle,
    DollarSign,
    Timer
} from 'lucide-react'
import { onSnapshot, query, orderBy, deleteDoc, addDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { getBusinessCollection, getBusinessDoc } from '../../../utils/firestoreUtils'

export default function ServiceCatalog() {
    const { currentUser, businessId } = useAuth()
    const [services, setServices] = useState([])
    const [filteredServices, setFilteredServices] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')
    const [loading, setLoading] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedService, setSelectedService] = useState(null)

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        price: '',
        duration: '',
        isActive: true
    })

    // Fetch services
    useEffect(() => {
        if (!currentUser || !businessId) return

        setLoading(true)

        const servicesRef = getBusinessCollection(businessId, 'services')
        const q = query(servicesRef, orderBy('name', 'asc'))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const servicesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setServices(servicesData)
            setFilteredServices(servicesData)
            setLoading(false)

            if (servicesData.length > 0) {
                toast.success(`${servicesData.length} servicios cargados`)
            } else {
                toast.success('No hay servicios registrados')
            }
        }, (error) => {
            console.error('Error fetching services:', error)
            toast.error('Error al cargar servicios')
            setLoading(false)
        })

        return () => unsubscribe()
    }, [currentUser, businessId])

    useEffect(() => {
        let filtered = services

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(service =>
                service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        }

        // Filter by category
        if (filterCategory !== 'all') {
            filtered = filtered.filter(service => service.category === filterCategory)
        }

        setFilteredServices(filtered)
    }, [services, searchTerm, filterCategory])

    const handleCreateService = () => {
        setFormData({
            name: '',
            category: '',
            description: '',
            price: '',
            duration: '',
            isActive: true
        })
        setShowCreateModal(true)
    }

    const handleEditService = (service) => {
        setSelectedService(service)
        setFormData({
            name: service.name || '',
            category: service.category || '',
            description: service.description || '',
            price: service.price || '',
            duration: service.duration || '',
            isActive: service.isActive !== false
        })
        setShowEditModal(true)
    }

    const handleDeleteService = async (serviceId) => {
        if (window.confirm('¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.')) {
            try {
                await deleteDoc(getBusinessDoc(businessId, 'services', serviceId))
                toast.success('Servicio eliminado correctamente')
            } catch (error) {
                console.error('Error deleting service:', error)
                toast.error(`Error al eliminar servicio: ${error.message}`)
            }
        }
    }

    const validateForm = () => {
        if (!formData.name.trim()) {
            toast.error('Por favor ingresa el nombre del servicio')
            return false
        }
        if (!formData.category.trim()) {
            toast.error('Por favor selecciona una categoría')
            return false
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
            toast.error('Por favor ingresa un precio válido')
            return false
        }
        if (!formData.duration || parseInt(formData.duration) <= 0) {
            toast.error('Por favor ingresa una duración válida (minutos)')
            return false
        }
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setLoading(true)

        try {
            const serviceData = {
                name: formData.name.trim(),
                category: formData.category,
                description: formData.description.trim(),
                price: parseFloat(formData.price) || 0,
                duration: parseInt(formData.duration) || 0,
                isActive: formData.isActive,
                updatedAt: new Date().toISOString(),
            }

            if (showEditModal) {
                // Update existing service
                await updateDoc(getBusinessDoc(businessId, 'services', selectedService.id), serviceData)
                toast.success('Servicio actualizado correctamente')
                setShowEditModal(false)
            } else {
                // Create new service
                await addDoc(getBusinessCollection(businessId, 'services'), {
                    ...serviceData,
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser.uid
                })
                toast.success('Servicio creado correctamente')
                setShowCreateModal(false)
            }
        } catch (error) {
            console.error('Error saving service:', error)
            toast.error(`Error al guardar servicio: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const getCategoryColor = (category) => {
        switch (category) {
            case 'consultoria': return 'text-blue-400 bg-blue-400/10'
            case 'belleza': return 'text-pink-400 bg-pink-400/10'
            case 'salud': return 'text-green-400 bg-green-400/10'
            case 'bienestar': return 'text-purple-400 bg-purple-400/10'
            case 'educacion': return 'text-yellow-400 bg-yellow-400/10'
            case 'legal': return 'text-red-400 bg-red-400/10'
            case 'tecnologia': return 'text-cyan-400 bg-cyan-400/10'
            default: return 'text-gray-400 bg-gray-400/10'
        }
    }

    const getCategoryLabel = (category) => {
        const labels = {
            'consultoria': 'Consultoría',
            'belleza': 'Belleza',
            'salud': 'Salud',
            'bienestar': 'Bienestar',
            'educacion': 'Educación',
            'legal': 'Legal',
            'tecnologia': 'Tecnología',
            'otros': 'Otros'
        }
        return labels[category] || category
    }

    const formatDuration = (minutes) => {
        if (!minutes) return '—'
        if (minutes < 60) return `${minutes} min`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
    }

    const formatPrice = (price) => {
        if (!price) return '$0.00'
        return `$${parseFloat(price).toFixed(2)}`
    }

    const categories = [
        'consultoria', 'belleza', 'salud', 'bienestar',
        'educacion', 'legal', 'tecnologia', 'otros'
    ]

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
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Catálogo de Servicios</h1>
                            <p className="text-sm text-slate-400">Gestiona los servicios que ofrece tu negocio</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleCreateService}
                            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Agregar Servicio</span>
                        </button>
                        <LogoutButton />
                    </div>
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
                                placeholder="Buscar servicios..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
                            />
                        </div>

                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                        >
                            <option className="text-black" value="all">Todas las Categorías</option>
                            {categories.map(category => (
                                <option className="text-black" key={category} value={category}>
                                    {getCategoryLabel(category)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="text-sm text-slate-400">
                        {filteredServices.length} de {services.length} servicios
                    </div>
                </div>

                {/* Services Grid */}
                {loading ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto"></div>
                        <p className="text-slate-400 mt-4">Cargando servicios...</p>
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                        <Briefcase className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-400">No hay servicios registrados</p>
                        <button
                            onClick={handleCreateService}
                            className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                        >
                            Crear primer servicio
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredServices.map((service) => (
                            <div key={service.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/[0.07] transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold">{service.name}</h3>
                                        <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(service.category)}`}>
                                            {getCategoryLabel(service.category)}
                                        </span>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${service.isActive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                        {service.isActive ? 'Activo' : 'Inactivo'}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center space-x-2">
                                        <DollarSign className="w-4 h-4 text-emerald-400" />
                                        <span className="text-emerald-400 font-semibold text-lg">{formatPrice(service.price)}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Timer className="w-4 h-4 text-blue-400" />
                                        <span className="text-slate-300">{formatDuration(service.duration)}</span>
                                    </div>
                                </div>

                                {service.description && (
                                    <div className="mb-4">
                                        <p className="text-sm text-slate-400 line-clamp-2">{service.description}</p>
                                    </div>
                                )}

                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleEditService(service)}
                                        className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        <span>Editar</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteService(service.id)}
                                        className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-bold">
                                {showEditModal ? 'Editar Servicio' : 'Nuevo Servicio'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false)
                                    setShowEditModal(false)
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del Servicio *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
                                        placeholder="Ej: Corte de Cabello, Consultoría Legal..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Categoría *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-emerald-400 focus:outline-none"
                                    >
                                        <option className="text-black" value="">Seleccionar Categoría</option>
                                        {categories.map(category => (
                                            <option className="text-black" key={category} value={category}>
                                                {getCategoryLabel(category)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Precio ($) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.price}
                                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Duración (minutos) *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.duration}
                                        onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
                                        placeholder="30"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Tiempo estimado para brindar este servicio</p>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
                                    rows="3"
                                    placeholder="Describe brevemente el servicio..."
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                        className="rounded border-white/20 bg-white/5 text-emerald-400 focus:ring-emerald-400"
                                    />
                                    <span className="text-sm font-medium text-slate-300">Servicio Activo</span>
                                </label>
                                <p className="text-xs text-slate-500 mt-1">Los servicios inactivos no aparecerán en la agenda</p>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex justify-end space-x-4 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false)
                                        setShowEditModal(false)
                                    }}
                                    className="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    <span>{loading ? 'Guardando...' : (showEditModal ? 'Actualizar Servicio' : 'Crear Servicio')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
