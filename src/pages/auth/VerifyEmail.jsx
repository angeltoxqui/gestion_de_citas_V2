import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaEnvelope, FaCircleCheck, FaArrowRight, FaStar, FaUserDoctor, FaBellConcierge, FaClock, FaShieldHalved } from 'react-icons/fa6'

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(20)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Get data from signup form
  const { role, email, fullName } = location.state || { role: 'staff', email: 'user@example.com', fullName: 'User' }

  const roleMeta = {
    doctor: { title: 'Profesional', icon: FaUserDoctor, color: 'blue' },
    receptionist: { title: 'Recepcionista', icon: FaBellConcierge, color: 'cyan' }
  }

  const currentRole = roleMeta[role] || { title: 'Personal', icon: FaUserDoctor, color: 'blue' }
  const IconComponent = currentRole.icon

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setIsRedirecting(true)
          setTimeout(() => navigate('/login'), 1000)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  const handleManualRedirect = () => {
    setIsRedirecting(true)
    setTimeout(() => navigate('/login'), 500)
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl mb-6 shadow-2xl shadow-blue-500/25 animate-bounce">
              <FaEnvelope className="w-10 h-10 text-slate-900" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent mb-3">
              Verifica tu Correo
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Hemos enviado un enlace de verificación a tu correo
            </p>
          </div>

          {/* Main Card */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/20">
            {/* Success Animation */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4 animate-pulse">
                <FaCircleCheck className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">
                ¡Cuenta Creada Exitosamente!
              </h2>
              <p className="text-slate-300">
                Bienvenido a nuestro equipo, <span className="text-blue-400 font-semibold">{fullName}</span>
              </p>
            </div>

            {/* Role Display */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-lg font-semibold text-blue-400">
                  {currentRole.title}
                </span>
              </div>
              <p className="text-center text-slate-300 text-sm">
                Tu cuenta ha sido creada con privilegios de {currentRole.title.toLowerCase()}
              </p>
            </div>

            {/* Email Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <FaEnvelope className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-blue-400">Correo de Verificación Enviado</span>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                Hemos enviado un enlace de verificación a:
              </p>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <span className="text-blue-300 font-mono text-sm break-all">{email}</span>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <FaClock className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-blue-400">Redirección automática en</span>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">
                  {countdown}s
                </div>
                <p className="text-slate-300 text-sm">
                  Serás redirigido al inicio de sesión automáticamente
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleManualRedirect}
                disabled={isRedirecting}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-slate-900 font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:scale-100"
              >
                {isRedirecting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    <span>Redirigiendo...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <FaArrowRight className="w-5 h-5" />
                    <span>Ir a Iniciar Sesión</span>
                  </div>
                )}
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-6 border-2 border-white/20 bg-white/5 hover:border-blue-400/40 hover:bg-blue-400/10 text-white font-medium rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-400/20"
              >
                <FaShieldHalved className="w-4 h-4 mr-2 inline" />
                Reenviar Correo de Verificación
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 text-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">¿Qué sigue?</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center space-x-2">
                  <FaStar className="w-3 h-3 text-blue-400" />
                  <span>Revisa tu bandeja de entrada (y spam)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaStar className="w-3 h-3 text-blue-400" />
                  <span>Haz clic en el enlace de verificación</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaStar className="w-3 h-3 text-blue-400" />
                  <span>Regresa aquí e inicia sesión con tus credenciales</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-slate-400">
              Verificación segura para tu espacio de trabajo
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
