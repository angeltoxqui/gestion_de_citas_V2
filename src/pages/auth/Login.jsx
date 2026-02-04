import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaHospital, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowRight, FaStar, FaShieldHalved } from 'react-icons/fa6'
import { useAuth } from '../../hooks/useAuth'
import { fetchUserRoleFromFirestore } from '../../utils/authUtils'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login, user, loading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Efecto para redirigir si ya hay usuario logueado
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const userRole = user?.role
    if (!loading && user && userRole) {
      switch (userRole) {
        case 'owner':
        case 'admin':
          navigate('/doctor/dashboard')
          break
        case 'receptionist':
          navigate('/receptionist/dashboard')
          break
        case 'staff':
        case 'professional':
        case 'doctor':
          navigate('/doctor/appointments')
          break
        default:
          navigate('/doctor/appointments')
      }
    }
  }, [user, loading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Por favor completa todos los campos.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Use Firebase authentication
      const userCredential = await login(email, password)
      const user = userCredential.user

      // Fetch the user's role from Firestore using new unifed 'users' collection logic
      const userData = await fetchUserRoleFromFirestore(user.uid)

      if (!userData) {
        toast.error('Error: No se encontró perfil de usuario')
        setIsLoading(false)
        return
      }

      const userRole = userData.role

      // Redirect based on role
      switch (userRole) {
        case 'owner':
        case 'admin':
          // Owner / Admin -> Full Dashboard
          navigate('/doctor/dashboard')
          break
        case 'receptionist':
          // Receptionist -> Reception Dashboard
          navigate('/receptionist/dashboard')
          break
        case 'staff':
        case 'professional':
        case 'doctor': // Legacy support
          // Professional -> Personal Agenda
          navigate('/doctor/appointments')
          break
        default:
          // Fallback
          console.warn('Unknown role:', userRole)
          navigate('/doctor/appointments')
      }

    } catch (error) {
      console.error('Login error:', error)
      // Handle specific Firebase errors
      let errorMessage = 'Error al iniciar sesión. Por favor intenta de nuevo.'

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No se encontró una cuenta con este correo.'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta. Por favor intenta de nuevo.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Por favor ingresa un correo electrónico válido.'
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Esta cuenta ha sido deshabilitada.'
      } else if (error.message.includes('Usuario no encontrado')) {
        errorMessage = 'No se encontró información de perfil para este usuario.'
      } else if (error.message.includes('No document to update')) {
        errorMessage = 'Configuración de cuenta incompleta. Contacta a soporte.'
      }

      setError(errorMessage)
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
              <FaHospital className="w-10 h-10 text-slate-900" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent mb-3">
              Bienvenido de Nuevo
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Accede a tu panel profesional
            </p>
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
                    placeholder="Ingresa tu correo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-slate-400 outline-none transition-all duration-300 focus:border-blue-400 focus:bg-white/10 focus:shadow-lg focus:shadow-blue-400/20"
                    required
                  />
                </div>
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
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-slate-400 outline-none transition-all duration-300 focus:border-blue-400 focus:bg-white/10 focus:shadow-lg focus:shadow-blue-400/20"
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

                {/* Forgot Password Link */}
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors duration-300 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-center text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!email || !password || isLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:scale-100"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    <span>Iniciando Sesión...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <FaArrowRight className="w-5 h-5" />
                    <span>Iniciar Sesión</span>
                    <FaStar className="w-4 h-4" />
                  </div>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/5 text-slate-400">¿Nuevo en el equipo?</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center w-full py-3 px-6 border-2 border-white/20 bg-white/5 hover:border-blue-400/40 hover:bg-blue-400/10 text-white font-medium rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-400/20"
              >
                <FaShieldHalved className="w-4 h-4 mr-2" />
                Crear una cuenta
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-slate-400">
              Acceso seguro a tu espacio de trabajo
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
