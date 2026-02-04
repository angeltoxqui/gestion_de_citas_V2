import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { getBusinessCollection } from '../../../utils/firestoreUtils'
import { query, orderBy, onSnapshot } from 'firebase/firestore'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'
import {
    DollarSign, TrendingUp, CreditCard, Calendar, Activity,
    ArrowUpRight, ArrowDownRight, Filter
} from 'lucide-react'

export default function FinancialDashboard() {
    const { businessId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('month') // week, month, year
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        pendingAmount: 0,
        averageTicket: 0,
        totalInvoices: 0,
        revenueChange: 0 // vs previous period
    })
    const [chartData, setChartData] = useState([])
    const [paymentMethodData, setPaymentMethodData] = useState([])
    const [statusData, setStatusData] = useState([])

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']
    const STATUS_COLORS = {
        paid: '#10b981',
        pending: '#f59e0b',
        overdue: '#ef4444',
        cancelled: '#64748b'
    }

    useEffect(() => {
        if (!businessId) return

        const fetchFinancials = async () => {
            try {
                const invoicesRef = getBusinessCollection(businessId, 'invoices')
                // Order by date to process temporal data efficiently
                const q = query(invoicesRef, orderBy('createdAt', 'desc'))

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const invoices = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAtDate: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
                    }))

                    processFinancialData(invoices, dateRange)
                    setLoading(false)
                })

                return unsubscribe
            } catch (error) {
                console.error("Error fetching financial data:", error)
                setLoading(false)
            }
        }

        fetchFinancials()
    }, [businessId, dateRange])

    const processFinancialData = (invoices, range) => {
        const now = new Date()
        let startDate = new Date()

        // Determine start date based on range
        if (range === 'week') startDate.setDate(now.getDate() - 7)
        if (range === 'month') startDate.setMonth(now.getMonth() - 1)
        if (range === 'year') startDate.setFullYear(now.getFullYear() - 1)

        // Filter invoices for current period
        const currentPeriodInvoices = invoices.filter(inv => inv.createdAtDate >= startDate)

        // Calculate previous period for comparison (simple approach)
        const prevStartDate = new Date(startDate)
        if (range === 'week') prevStartDate.setDate(prevStartDate.getDate() - 7)
        if (range === 'month') prevStartDate.setMonth(prevStartDate.getMonth() - 1)
        if (range === 'year') prevStartDate.setFullYear(prevStartDate.getFullYear() - 1)

        const prevPeriodInvoices = invoices.filter(inv =>
            inv.createdAtDate >= prevStartDate && inv.createdAtDate < startDate
        )

        // 1. Calculate Core Metrics
        const revenue = currentPeriodInvoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)

        const prevRevenue = prevPeriodInvoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)

        const pending = currentPeriodInvoices
            .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
            .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)

        const revenueChange = prevRevenue === 0 ? 100 : ((revenue - prevRevenue) / prevRevenue) * 100

        setMetrics({
            totalRevenue: revenue,
            pendingAmount: pending,
            averageTicket: revenue / (currentPeriodInvoices.filter(i => i.status === 'paid').length || 1),
            totalInvoices: currentPeriodInvoices.length,
            revenueChange
        })

        // 2. Prepare Area Chart Data (Revenue over time)
        // Group by day for week/month, by month for year
        const timeMap = new Map()

        currentPeriodInvoices.forEach(inv => {
            if (inv.status !== 'paid') return

            const dateKey = range === 'year'
                ? inv.createdAtDate.toLocaleString('default', { month: 'short' })
                : inv.createdAtDate.toLocaleDateString('default', { day: 'numeric', month: 'short' })

            timeMap.set(dateKey, (timeMap.get(dateKey) || 0) + (Number(inv.totalAmount) || 0))
        })

        // Convert map to array and sort (basic sort, might need refinement for detailed chronologies)
        const processedChartData = Array.from(timeMap, ([name, amount]) => ({ name, amount }))
            .reverse() // Basic reverse, for real production use proper date sorting

        setChartData(processedChartData.length ? processedChartData : [{ name: 'No Data', amount: 0 }])

        // 3. Prepare Pie Chart Data (Status Distribution)
        const statusCounts = {}
        currentPeriodInvoices.forEach(inv => {
            statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1
        })

        const processedStatusData = Object.entries(statusCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value
        }))
        setStatusData(processedStatusData)

        // 4. Payment Method Data
        const methodCounts = {}
        currentPeriodInvoices.forEach(inv => {
            if (inv.status === 'paid') {
                const method = inv.paymentMethod || 'Unknown'
                methodCounts[method] = (methodCounts[method] || 0) + (Number(inv.totalAmount) || 0)
            }
        })

        const processedMethodData = Object.entries(methodCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value
        }))
        setPaymentMethodData(processedMethodData)
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Resumen Financiero</h2>
                    <p className="text-slate-400">Visión general del rendimiento de tu negocio</p>
                </div>
                <div className="bg-white/5 p-1 rounded-lg flex space-x-1">
                    {['week', 'month', 'year'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setDateRange(r)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${dateRange === r
                                    ? 'bg-blue-500 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {r === 'week' ? 'Semana' : r === 'month' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Revenue */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-500/20 rounded-xl">
                            <DollarSign className="w-6 h-6 text-green-400" />
                        </div>
                        <span className={`flex items-center text-sm font-medium ${metrics.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {metrics.revenueChange >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                            {Math.abs(metrics.revenueChange).toFixed(1)}%
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm">Ingresos Totales</p>
                    <h3 className="text-3xl font-bold mt-1">
                        ${metrics.totalRevenue.toLocaleString()}
                    </h3>
                </div>

                {/* Pending Amount */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-500/20 rounded-xl">
                            <Activity className="w-6 h-6 text-amber-400" />
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm">Por Cobrar</p>
                    <h3 className="text-3xl font-bold mt-1 text-amber-400">
                        ${metrics.pendingAmount.toLocaleString()}
                    </h3>
                </div>

                {/* Average Ticket */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <CreditCard className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm">Ticket Promedio</p>
                    <h3 className="text-3xl font-bold mt-1">
                        ${Math.floor(metrics.averageTicket).toLocaleString()}
                    </h3>
                </div>

                {/* Total Invoices */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <Calendar className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm">Facturas Generadas</p>
                    <h3 className="text-3xl font-bold mt-1">
                        {metrics.totalInvoices}
                    </h3>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Revenue Chart */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                    <h3 className="text-lg font-bold mb-6 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
                        Evolución de Ingresos
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value) => [`$${value}`, 'Ingresos']}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                    <h3 className="text-lg font-bold mb-6">Estado de Facturas</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name.toLowerCase()] || '#cbd5e1'} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                />
                                <Legend layout="vertical" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-bold mb-6">Ingresos por Método de Pago</h3>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentMethodData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                            <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={100} />
                            <RechartsTooltip
                                cursor={{ fill: '#ffffff10' }}
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                formatter={(value) => [`$${value}`, 'Total']}
                            />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
