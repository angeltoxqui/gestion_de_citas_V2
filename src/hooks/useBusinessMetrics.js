import { useState, useEffect, useMemo } from 'react'
import { onSnapshot, query, orderBy } from 'firebase/firestore'
import { getBusinessCollection } from '../utils/firestoreUtils'

/**
 * Hook para calcular métricas de negocio para dashboards analytics
 * @param {string} businessId - ID del negocio
 * @param {string} dateRange - Rango: 'today', 'week', 'month', 'quarter', 'year', 'all'
 * @returns {Object} Métricas procesadas para gráficas
 */
export function useBusinessMetrics(businessId, dateRange = 'month') {
    const [loading, setLoading] = useState(true)
    const [invoices, setInvoices] = useState([])
    const [appointments, setAppointments] = useState([])

    // Fetch data from Firestore
    useEffect(() => {
        if (!businessId) {
            setLoading(false)
            return
        }

        setLoading(true)

        // Subscribe to invoices
        const invoicesRef = getBusinessCollection(businessId, 'invoices')
        const invoicesQuery = query(invoicesRef, orderBy('createdAt', 'desc'))

        const unsubscribeInvoices = onSnapshot(invoicesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setInvoices(data)
        }, (error) => {
            console.error('Error fetching invoices:', error)
        })

        // Subscribe to appointments
        const appointmentsRef = getBusinessCollection(businessId, 'appointments')
        const appointmentsQuery = query(appointmentsRef, orderBy('createdAt', 'desc'))

        const unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setAppointments(data)
            setLoading(false)
        }, (error) => {
            console.error('Error fetching appointments:', error)
            setLoading(false)
        })

        return () => {
            unsubscribeInvoices()
            unsubscribeAppointments()
        }
    }, [businessId])

    // Filter data by date range
    const filteredData = useMemo(() => {
        const today = new Date()
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

        const getDateThreshold = () => {
            switch (dateRange) {
                case 'today':
                    return startOfDay
                case 'week':
                    return new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000)
                case 'month':
                    return new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000)
                case 'quarter':
                    return new Date(startOfDay.getTime() - 90 * 24 * 60 * 60 * 1000)
                case 'year':
                    return new Date(startOfDay.getTime() - 365 * 24 * 60 * 60 * 1000)
                case 'all':
                default:
                    return null
            }
        }

        const threshold = getDateThreshold()

        const parseDate = (dateValue) => {
            if (!dateValue) return null
            if (dateValue.toDate) return dateValue.toDate()
            return new Date(dateValue)
        }

        const filterByDate = (items, dateField = 'createdAt') => {
            if (!threshold) return items
            return items.filter(item => {
                const itemDate = parseDate(item[dateField])
                return itemDate && itemDate >= threshold
            })
        }

        return {
            invoices: filterByDate(invoices),
            appointments: filterByDate(appointments)
        }
    }, [invoices, appointments, dateRange])

    // Calculate sales by professional
    const salesByProfessional = useMemo(() => {
        const { appointments: filteredAppointments } = filteredData
        const salesMap = {}

        filteredAppointments.forEach(appointment => {
            const professional = appointment.doctorName || 'Sin asignar'
            const amount = appointment.servicePrice || 0

            if (!salesMap[professional]) {
                salesMap[professional] = { name: professional, sales: 0, count: 0 }
            }
            salesMap[professional].sales += amount
            salesMap[professional].count += 1
        })

        return Object.values(salesMap)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10) // Top 10 professionals
    }, [filteredData])

    // Calculate service breakdown for pie chart
    const serviceBreakdown = useMemo(() => {
        const { appointments: filteredAppointments } = filteredData
        const serviceMap = {}
        let totalRevenue = 0

        filteredAppointments.forEach(appointment => {
            const service = appointment.serviceName || 'Otro'
            const amount = appointment.servicePrice || 0

            if (!serviceMap[service]) {
                serviceMap[service] = { name: service, value: 0, count: 0 }
            }
            serviceMap[service].value += amount
            serviceMap[service].count += 1
            totalRevenue += amount
        })

        // Convert to percentages and add colors
        const colors = [
            '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
            '#ec4899', '#6366f1', '#84cc16', '#f97316', '#14b8a6'
        ]

        return Object.values(serviceMap)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
            .map((item, index) => ({
                ...item,
                percentage: totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) : 0,
                fill: colors[index % colors.length]
            }))
    }, [filteredData])

    // Calculate KPIs
    const kpis = useMemo(() => {
        const { invoices: filteredInvoices, appointments: filteredAppointments } = filteredData

        // Total sales from paid invoices
        const totalSales = filteredInvoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)

        // Total appointments count
        const totalAppointments = filteredAppointments.length

        // Completed appointments
        const completedAppointments = filteredAppointments
            .filter(apt => apt.status === 'completed').length

        // Average ticket
        const averageTicket = totalAppointments > 0
            ? Math.round(totalSales / totalAppointments)
            : 0

        // Revenue from appointments (servicePrice)
        const appointmentsRevenue = filteredAppointments
            .reduce((sum, apt) => sum + (apt.servicePrice || 0), 0)

        return {
            totalSales,
            totalAppointments,
            completedAppointments,
            averageTicket,
            appointmentsRevenue,
            pendingInvoices: filteredInvoices.filter(inv => inv.status === 'pending').length
        }
    }, [filteredData])

    return {
        loading,
        salesByProfessional,
        serviceBreakdown,
        kpis,
        rawData: filteredData
    }
}

export default useBusinessMetrics
