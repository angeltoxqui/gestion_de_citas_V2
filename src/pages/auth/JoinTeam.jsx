import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FaUserPlus, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowRight, FaBuilding, FaIdCard, FaKey } from 'react-icons/fa6'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from '../../firebase/config'
import { doc, getDoc, updateDoc, query, where, getDocs, collection } from 'firebase/firestore'

export default function JoinTeam() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const invitationCode = searchParams.get('code')

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [invitationData, setInvitationData] = useState(null)
    const [isLoadingInvitation, setIsLoadingInvitation] = useState(true)
    const [invitationError, setInvitationError] = useState(null)

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState({})

    // Fetch invitation data on component mount
    useEffect(() => {
        const fetchInvitation = async () => {
            if (!invitationCode) {
                setInvitationError('No se proporcionó un código de invitación.')
                setIsLoadingInvitation(false)
                return
            }

            try {
                // Search for the invitation in users collection
                const usersRef = collection(db, 'users')
                const q = query(usersRef, where('invitationCode', '==', invitationCode))
                const snapshot = await getDocs(q)

                if (snapshot.empty) {
                    setInvitationError('El código de invitación no es válido o ha expirado.')
                    setIsLoadingInvitation(false)
                    return
                }

                const invitationDoc = snapshot.docs[0]
                const data = invitationDoc.data()

                // Check if already registered
                if (data.uid) {
                    setInvitationError('Esta invitación ya fue utilizada.')
                    setIsLoadingInvitation(false)
                    return
                }

                // Fetch business name
                let businessName = 'Negocio'
                if (data.businessId) {
                    const businessDoc = await getDoc(doc(db, 'businesses', data.businessId))
                    if (businessDoc.exists()) {
                        businessName = businessDoc.data().name
                    }
                }

                setInvitationData({
                    id: invitationDoc.id,
                    ...data,
                    businessName
                })
                setFormData(prev => ({ ...prev, email: data.email || '' }))
                setIsLoadingInvitation(false)
            } catch (error) {
                console.error('Error fetching invitation:', error)
                setInvitationError('Error al verificar la invitación.')
                setIsLoadingInvitation(false)
            }
        }

        fetchInvitation()
    }, [invitationCode])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validateForm = () => {
        const newErrors = {}

        if (!formData.email.trim()) {
            newErrors.email = 'El correo electrónico es requerido'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Por favor ingresa un correo electrónico válido'
        }

        if (!formData.password) {
            newErrors.password = 'La contraseña es requerida'
        } else if (formData.password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Por favor confirma tu contraseña'
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm() || !invitationData) {
            return
        }

        setIsLoading(true)

        try {
            // 1. Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
            const user = userCredential.user
            await updateProfile(user, { displayName: invitationData.displayName })

            // 2. Update the existing user document with the new uid
            const userDocRef = doc(db, 'users', invitationData.id)
            await updateDoc(userDocRef, {
                uid: user.uid,
                email: formData.email.toLowerCase(),
                status: 'active',
                registeredAt: new Date().toISOString()
            })

            // 3. Redirect based on role
            if (invitationData.role === 'receptionist') {
                navigate('/receptionist')
            } else {
                navigate('/doctor')
            }
        } catch (error) {
            console.error('Registration error:', error)
            let errorMessage = 'Error al completar el registro. Por favor intenta de nuevo.'

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Ya existe una cuenta con este correo electrónico.'
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La contraseña debe tener al menos 6 caracteres.'
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Por favor ingresa un correo electrónico válido.'
            }

            setErrors(prev => ({ ...prev, general: errorMessage }))
        } finally {
            setIsLoading(false)
        }
    }

    // Loading state
    if (isLoadingInvitation) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg text-slate-300">Verificando invitación...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (invitationError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FaKey className="w-10 h-10 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-3">Invitación No Válida</h1>
                    <p className="text-slate-400 mb-6">{invitationError}</p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-slate-900 font-bold rounded-2xl transition-all"
                    >
                        Ir a Iniciar Sesión
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white antialiased relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
                <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl mb-6 shadow-2xl shadow-blue-500/25">
                            <FaUserPlus className="w-10 h-10 text-slate-900" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent mb-3">
                            ¡Bienvenido al Equipo!
                        </h1>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            Completa tu registro para unirte a
                        </p>
                    </div>

                    {/* Invitation Info Card */}
                    <div className="backdrop-blur-xl bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-6">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <FaBuilding className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-emerald-300">Te unirás a</p>
                                <p className="text-lg font-semibold text-white">{invitationData?.businessName}</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-emerald-500/20">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Nombre:</span>
                                <span className="text-white font-medium">{invitationData?.displayName}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-slate-400">Rol:</span>
                                <span className="text-cyan-400 font-medium capitalize">
                                    {invitationData?.role === 'doctor' ? 'Profesional' :
                                        invitationData?.role === 'receptionist' ? 'Recepcionista' :
                                            invitationData?.role}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/20">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Email Field */}
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-slate-200">
                                    Correo Electrónico
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-300">
                                        <FaEnvelope className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Ingresa tu correo electrónico"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={`w-full pl-12 pr-4 py-4 bg-white/5 border-2 rounded-2xl text-white placeholder-slate-400 outline-none transition-all duration-300 ${errors.email
                                            ? 'border-red-400 focus:border-red-400 focus:bg-red-400/10'
                                            : 'border-white/10 focus:border-blue-400 focus:bg-white/10 focus:shadow-lg focus:shadow-blue-400/20'
                                            }`}
                                        required
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-sm text-red-400">{errors.email}</p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-slate-200">
                                    Crear Contraseña
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-300">
                                        <FaLock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="Crea una contraseña segura"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className={`w-full pl-12 pr-12 py-4 bg-white/5 border-2 rounded-2xl text-white placeholder-slate-400 outline-none transition-all duration-300 ${errors.password
                                            ? 'border-red-400 focus:border-red-400 focus:bg-red-400/10'
                                            : 'border-white/10 focus:border-blue-400 focus:bg-white/10 focus:shadow-lg focus:shadow-blue-400/20'
                                            }`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors duration-300"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-sm text-red-400">{errors.password}</p>
                                )}
                                <p className="text-xs text-slate-400">Mínimo 6 caracteres requeridos</p>
                            </div>

                            {/* Confirm Password Field */}
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-slate-200">
                                    Confirmar Contraseña
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-300">
                                        <FaLock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        placeholder="Confirma tu contraseña"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        className={`w-full pl-12 pr-12 py-4 bg-white/5 border-2 rounded-2xl text-white placeholder-slate-400 outline-none transition-all duration-300 ${errors.confirmPassword
                                            ? 'border-red-400 focus:border-red-400 focus:bg-red-400/10'
                                            : 'border-white/10 focus:border-blue-400 focus:bg-white/10 focus:shadow-lg focus:shadow-blue-400/20'
                                            }`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors duration-300"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-sm text-red-400">{errors.confirmPassword}</p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:scale-100"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Completando Registro...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center space-x-2">
                                        <FaUserPlus className="w-5 h-5" />
                                        <span>Unirme al Equipo</span>
                                        <FaArrowRight className="w-4 h-4" />
                                    </div>
                                )}
                            </button>

                            {/* General Error Display */}
                            {errors.general && (
                                <div className="flex items-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                                    <span className="text-sm">{errors.general}</span>
                                </div>
                            )}
                        </form>

                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white/5 text-slate-400">¿Ya tienes una cuenta?</span>
                            </div>
                        </div>

                        {/* Sign In Link */}
                        <div className="text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center w-full py-3 px-6 border-2 border-white/20 bg-white/5 hover:border-blue-400/40 hover:bg-blue-400/10 text-white font-medium rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-400/20"
                            >
                                Iniciar sesión aquí
                            </Link>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8">
                        <p className="text-sm text-slate-400">
                            Código de invitación: <span className="font-mono text-blue-400">{invitationCode}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
