import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useBusinessMetrics } from '../../../hooks/useBusinessMetrics'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts'
import {
    ArrowLeft,
    BarChart3,
    PieChart as PieChartIcon,
    TrendingUp,
    DollarSign,
    Users,
    Calendar,
    Target,
    Loader2
} from 'lucide-react'

export default function Analytics() {
    const { businessId } = useAuth()
    const [dateRange, setDateRange] = useState('month')
    const { loading, salesByProfessional, serviceBreakdown, kpis } = useBusinessMetrics(businessId, dateRange)

    // Custom tooltip for bar chart
    const CustomBarTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-800 border border-white/20 rounded-lg p-3 shadow-xl">
                    <p className="text-white font-medium">{label}</p>
                    <p className="text-green-400">
                        Ventas: ${payload[0].value.toLocaleString()}
                    </p>
                    <p className="text-slate-400 text-sm">
                        {payload[0].payload.count} citas
                    </p>
                </div>
            )
        }
        return null
    }

    // Custom tooltip for pie chart
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-800 border border-white/20 rounded-lg p-3 shadow-xl">
                    <p className="text-white font-medium">{payload[0].name}</p>
                    <p className="text-purple-400">
                        ${payload[0].value.toLocaleString()} ({payload[0].payload.percentage}%)
                    </p>
                    <p className="text-slate-400 text-sm">
                        {payload[0].payload.count} servicios
                    </p>
                </div>
            )
        }
        return null
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Cargando estadísticas...</p>
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
                            to="/receptionist/billing"
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Dashboard de Rentabilidad</h1>
                            <p className="text-sm text-slate-400">Análisis de ventas y rendimiento</p>
                        </div>
                    </div>

                    {/* Date Range Filter */}
                    <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                            <option value="today">Hoy</option>
                            <option value="week">Esta Semana</option>
                            <option value="month">Este Mes</option>
                            <option value="quarter">Trimestre</option>
                            <option value="year">Este Año</option>
                            <option value="all">Todo el Tiempo</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Revenue */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Ingresos Totales</p>
                                <p className="text-2xl font-bold text-green-400">
                                    ${kpis.appointmentsRevenue.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Ticket Promedio - MAIN KPI */}
                    <div className="bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-400/30 rounded-2xl p-6 backdrop-blur-xl">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
                                <Target className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-300">Ticket Promedio</p>
                                <p className="text-3xl font-bold text-white">
                                    ${kpis.averageTicket.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">
                            Ingreso promedio por cita
                        </p>
                    </div>

                    {/* Total Appointments */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total Citas</p>
                                <p className="text-2xl font-bold text-blue-400">
                                    {kpis.totalAppointments}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Completed Appointments */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Profesionales Activos</p>
                                <p className="text-2xl font-bold text-cyan-400">
                                    {salesByProfessional.length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart - Sales by Professional */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                        <h3 className="text-lg font-semibold mb-6 flex items-center space-x-2">
                            <BarChart3 className="w-5 h-5 text-green-400" />
                            <span>Ventas por Profesional</span>
                        </h3>

                        {salesByProfessional.length > 0 ? (
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={salesByProfessional}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis
                                            type="number"
                                            stroke="#94a3b8"
                                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            stroke="#94a3b8"
                                            width={75}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <Tooltip content={<CustomBarTooltip />} />
                                        <Bar
                                            dataKey="sales"
                                            fill="#10b981"
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-80 flex items-center justify-center text-slate-400">
                                <div className="text-center">
                                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No hay datos de ventas por profesional</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pie Chart - Services Breakdown */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                        <h3 className="text-lg font-semibold mb-6 flex items-center space-x-2">
                            <PieChartIcon className="w-5 h-5 text-purple-400" />
                            <span>Servicios Más Vendidos</span>
                        </h3>

                        {serviceBreakdown.length > 0 ? (
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={serviceBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                            labelLine={false}
                                            label={({ name, percentage }) => `${percentage}%`}
                                        >
                                            {serviceBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
                                        <Legend
                                            layout="vertical"
                                            align="right"
                                            verticalAlign="middle"
                                            wrapperStyle={{ fontSize: '12px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-80 flex items-center justify-center text-slate-400">
                                <div className="text-center">
                                    <PieChartIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No hay datos de servicios</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Performers Table */}
                {salesByProfessional.length > 0 && (
                    <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                            <TrendingUp className="w-5 h-5 text-yellow-400" />
                            <span>Ranking de Profesionales</span>
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">#</th>
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Profesional</th>
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Citas</th>
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Ventas</th>
                                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Ticket Prom.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesByProfessional.map((professional, index) => (
                                        <tr key={professional.name} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-3 px-4">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-500 text-black' :
                                                        index === 1 ? 'bg-slate-300 text-black' :
                                                            index === 2 ? 'bg-amber-600 text-white' :
                                                                'bg-slate-700 text-white'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-medium">{professional.name}</td>
                                            <td className="py-3 px-4 text-slate-300">{professional.count}</td>
                                            <td className="py-3 px-4 text-green-400 font-semibold">
                                                ${professional.sales.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-purple-400">
                                                ${professional.count > 0 ? Math.round(professional.sales / professional.count).toLocaleString() : 0}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
