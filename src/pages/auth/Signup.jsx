import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FaHospital, FaUserDoctor, FaBellConcierge, FaIdCard, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowRight, FaStar, FaShieldHalved, FaUserTie, FaBuilding } from 'react-icons/fa6'
import { useAuth } from '../../hooks/useAuth'

export default function Signup() {
  const { role: initialRole } = useParams()
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState(initialRole || '')
  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const roleMeta = {
    doctor: { title: 'Profesional', icon: FaUserDoctor, description: 'Brinda atención con herramientas optimizadas para citas e historiales' },
    receptionist: { title: 'Recepcionista', icon: FaBellConcierge, description: 'Coordina la recepción de clientes, agenda y operaciones de mostrador' }
  }

  const currentRole = roleMeta[selectedRole] || null
  const IconComponent = currentRole?.icon || FaHospital

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!selectedRole) {
      newErrors.role = 'Por favor selecciona un rol profesional'
    }

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'El nombre del negocio es requerido'
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'El nombre completo es requerido'
    }

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

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Use Firebase authentication
      await signup(formData.email, formData.password, formData.fullName, selectedRole, formData.businessName)

      // Redirect to verify email page with role and email data
      navigate('/verify-email', {
        state: {
          role: selectedRole,
          email: formData.email,
          fullName: formData.fullName
        }
      })
    } catch (error) {
      console.error('Signup error:', error)
      // Handle specific Firebase errors
      let errorMessage = 'Error al crear la cuenta. Por favor intenta de nuevo.'

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white antialiased relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-slate-900/50 to-slate-900"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl mb-6 shadow-2xl shadow-blue-500/25">
              <IconComponent className="w-10 h-10 text-slate-900" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent mb-3">
              Únete al Equipo
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              {currentRole ? `Crea tu cuenta de ${currentRole.title}` : 'Elige tu rol y crea tu cuenta'}
            </p>
            {currentRole && (
              <p className="text-sm text-slate-400 mt-2">
                {currentRole.description}
              </p>
            )}
          </div>

          {/* Form Card */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/20">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Professional Role Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-200">
                  Rol Profesional
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('doctor')}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-300 ${selectedRole === 'doctor'
                      ? 'border-blue-400 bg-blue-400/10 shadow-lg shadow-blue-400/20'
                      : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${selectedRole === 'doctor'
                        ? 'bg-blue-400 text-slate-900'
                        : 'bg-white/10 text-slate-300'
                        }`}>
                        <FaUserDoctor className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium">Profesional</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('receptionist')}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-300 ${selectedRole === 'receptionist'
                      ? 'border-blue-400 bg-blue-400/10 shadow-lg shadow-blue-400/20'
                      : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${selectedRole === 'receptionist'
                        ? 'bg-blue-400 text-slate-900'
                        : 'bg-white/10 text-slate-300'
                        }`}>
                        <FaBellConcierge className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium">Recepcionista</span>
                    </div>
                  </button>
                </div>
                {errors.role && (
                  <p className="text-sm text-red-400">{errors.role}</p>
                )}
              </div>

              {/* Business Name Field */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-200">
                  Nombre del Negocio
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-300">
                    <FaBuilding className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="businessName"
                    placeholder="Ingresa el nombre de tu negocio"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className={`w-full pl-12 pr-4 py-4 bg-white/5 border-2 rounded-2xl text-white placeholder-slate-400 outline-none transition-all duration-300 ${errors.businessName
                      ? 'border-red-400 focus:border-red-400 focus:bg-red-400/10'
                      : 'border-white/10 focus:border-blue-400 focus:bg-white/10 focus:shadow-lg focus:shadow-blue-400/20'
                      }`}
                    required
                  />
                </div>
                {errors.businessName && (
                  <p className="text-sm text-red-400">{errors.businessName}</p>
                )}
              </div>

              {/* Full Name Field */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-200">
                  Nombre Completo
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-300">
                    <FaIdCard className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Ingresa tu nombre completo"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full pl-12 pr-4 py-4 bg-white/5 border-2 rounded-2xl text-white placeholder-slate-400 outline-none transition-all duration-300 ${errors.fullName
                      ? 'border-red-400 focus:border-red-400 focus:bg-red-400/10'
                      : 'border-white/10 focus:border-blue-400 focus:bg-white/10 focus:shadow-lg focus:shadow-blue-400/20'
                      }`}
                    required
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-red-400">{errors.fullName}</p>
                )}
              </div>

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
                  Contraseña
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
                    <span>Creando Cuenta...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <FaShieldHalved className="w-5 h-5" />
                    <span>Crear Cuenta</span>
                    <FaArrowRight className="w-4 h-4" />
                  </div>
                )}
              </button>

              {/* General Error Display */}
              {errors.general && (
                <div className="flex items-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  <FaStar className="w-4 h-4 mr-2" />
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
                <FaStar className="w-4 h-4 mr-2" />
                Iniciar sesión aquí
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-slate-400">
              Únete a nuestro equipo y marca la diferencia
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


