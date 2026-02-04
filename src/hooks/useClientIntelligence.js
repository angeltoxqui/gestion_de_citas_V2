import { useMemo } from 'react'

/**
 * Hook to calculate Client Intelligence metrics (RFM)
 * @param {Array} appointments - List of client appointments
 * @param {Array} invoices - List of client invoices
 * @returns {Object} Intelligence metrics, tags, and suggestions
 */
export function useClientIntelligence(appointments = [], invoices = []) {
    const intelligence = useMemo(() => {
        const today = new Date()
        const currentYear = today.getFullYear()

        // 1. MONETARY (Total spent)
        const totalSpent = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)

        // 2. RECENCY (Days since last appointment)
        // Filter out future appointments for recency calculation
        const pastAppointments = appointments
            .filter(apt => new Date(apt.appointmentDate) <= today)
            .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))

        const lastAppointmentDate = pastAppointments.length > 0
            ? new Date(pastAppointments[0].appointmentDate)
            : null

        const daysSinceLastVisit = lastAppointmentDate
            ? Math.floor((today - lastAppointmentDate) / (1000 * 60 * 60 * 24))
            : null

        // 3. FREQUENCY
        const totalAppointments = appointments.length

        const appointmentsThisYear = appointments.filter(apt => {
            const aptDate = new Date(apt.appointmentDate)
            return aptDate.getFullYear() === currentYear
        }).length

        // 4. AUTOMATED TAGGING
        const tags = []

        // "Cliente Perdido" (> 60 days inactive)
        if (daysSinceLastVisit !== null && daysSinceLastVisit > 60) {
            tags.push({
                id: 'lost',
                label: 'Cliente Perdido',
                color: 'red',
                description: 'Inactivo por más de 60 días'
            })
        }

        // "Cliente Fiel" (> 5 appointments this year)
        if (appointmentsThisYear > 5) {
            tags.push({
                id: 'loyal',
                label: 'Cliente Fiel',
                color: 'blue',
                description: 'Más de 5 visitas este año'
            })
        }

        // "Ballena" (High spender - placeholder threshold 1,000,000 or dynamic)
        // Using a static high threshold for now, could be dynamic based on business average
        if (totalSpent > 1000000) {
            tags.push({
                id: 'whale',
                label: 'Ballena',
                color: 'purple',
                description: 'Alto volumen de facturación'
            })
        }

        // "Nuevo" (First visit within last 30 days and low count)
        if (totalAppointments === 1 && daysSinceLastVisit !== null && daysSinceLastVisit <= 30) {
            tags.push({
                id: 'new',
                label: 'Nuevo',
                color: 'cyan',
                description: 'Primera visita reciente'
            })
        }

        // 5. SUGGESTED ACTIONS
        const suggestions = []

        if (tags.some(t => t.id === 'lost')) {
            suggestions.push({
                type: 'reactivation',
                title: 'Reactivar Cliente',
                action: 'Enviar WhatsApp de promoción',
                priority: 'high'
            })
        }

        if (tags.some(t => t.id === 'loyal')) {
            suggestions.push({
                type: 'reward',
                title: 'Premiar Fidelidad',
                action: 'Ofrecer descuento en próximo servicio',
                priority: 'medium'
            })
        }

        if (tags.some(t => t.id === 'whale')) {
            suggestions.push({
                type: 'vip',
                title: 'Trato VIP',
                action: 'Ofrecer cita prioritaria o servicio premium',
                priority: 'high'
            })
        }

        if (tags.some(t => t.id === 'new')) {
            suggestions.push({
                type: 'welcome',
                title: 'Seguimiento',
                action: 'Consultar satisfacción post-servicio',
                priority: 'medium'
            })
        }

        return {
            recency: {
                days: daysSinceLastVisit,
                lastDate: lastAppointmentDate
            },
            frequency: {
                total: totalAppointments,
                thisYear: appointmentsThisYear,
                avgPerMonth: totalAppointments > 0 ? (totalAppointments / 12).toFixed(1) : 0 // Rough estimate
            },
            monetary: {
                total: totalSpent,
                avgTicket: totalAppointments > 0 ? Math.round(totalSpent / totalAppointments) : 0
            },
            tags,
            suggestions
        }

    }, [appointments, invoices])

    return intelligence
}
