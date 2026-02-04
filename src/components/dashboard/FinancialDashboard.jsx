import React from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts'
import { DollarSign, TrendingUp, CreditCard, Calendar } from 'lucide-react'
import { useFinancialMetrics } from '../../hooks/useFinancialMetrics'
import { useAuth } from '../../hooks/useAuth'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316']

export function FinancialDashboard() {
    const { user } = useAuth()
    // Assuming user object has businessId, or we get it from context
    const businessId = user?.businessId

    const { metrics, loading, error } = useFinancialMetrics(businessId)

    if (loading) {
        return (
            <div className="w-full h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
                Error loading financial data: {error}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Resumen Financiero (Mes Actual)</h2>
                <div className="text-sm text-slate-400">
                    <Calendar className="inline-block w-4 h-4 mr-2" />
                    {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Revenue */}
                <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-500" />
                        </div>
                        <span className="text-sm text-green-400 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            +12%
                        </span>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium">Ingresos Totales</h3>
                    <p className="text-3xl font-bold text-white mt-2">
                        ${metrics.totalRevenue.toLocaleString('es-ES')}
                    </p>
                </div>

                {/* Average Ticket */}
                <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <CreditCard className="w-6 h-6 text-blue-500" />
                        </div>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium">Ticket Promedio</h3>
                    <p className="text-3xl font-bold text-white mt-2">
                        ${metrics.averageTicket.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                    </p>
                </div>

                {/* Total Invoices */}
                <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                            <Calendar className="w-6 h-6 text-purple-500" />
                        </div>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium">Citas Pagadas</h3>
                    <p className="text-3xl font-bold text-white mt-2">
                        {metrics.totalInvoices}
                    </p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Sales Bar Chart */}
                <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-6">Ventas Diarias</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.dailyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: '#374151', opacity: 0.4 }}
                                />
                                <Bar
                                    dataKey="amount"
                                    fill="#6366f1"
                                    radius={[4, 4, 0, 0]}
                                    name="Ventas"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Services Pie Chart */}
                <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-6">Top Servicios</h3>
                    <div className="h-80 flex items-center justify-center">
                        {metrics.topServices.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.topServices}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {metrics.topServices.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="middle"
                                        align="right"
                                        wrapperStyle={{ color: '#9ca3af' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-500 text-center">
                                No hay datos de servicios aún
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    )
}
