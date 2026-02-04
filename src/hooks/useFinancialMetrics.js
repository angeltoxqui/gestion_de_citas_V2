import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useFinancialMetrics(businessId) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchInvoices() {
      if (!businessId) return

      try {
        setLoading(true)

        // Get start of current month
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfMonthStr = startOfMonth.toISOString().split('T')[0] // Format YYYY-MM-DD if stored as string

        // Filter by paid status and businessId using proper security rules
        const q = query(
          collection(db, 'invoices'),
          where('businessId', '==', businessId),
          where('status', '==', 'paid')
        )

        const snapshot = await getDocs(q)
        const fetchedInvoices = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Filter for current month in memory to handle potential date format differences safely
        const currentMonthInvoices = fetchedInvoices.filter(inv => {
          if (!inv.date) return false
          // Handle both Timestamp objects and string dates
          const invDate = inv.date.toDate ? inv.date.toDate() : new Date(inv.date)
          return invDate >= startOfMonth
        })

        setInvoices(currentMonthInvoices)
      } catch (err) {
        console.error('Error fetching invoices:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [businessId])

  const metrics = useMemo(() => {
    if (!invoices.length) {
      return {
        totalRevenue: 0,
        averageTicket: 0,
        totalInvoices: 0,
        dailyRevenue: [],
        topServices: []
      }
    }

    // 1. Total Revenue & Count
    const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
    const totalInvoices = invoices.length
    const averageTicket = totalInvoices > 0 ? totalRevenue / totalInvoices : 0

    // 2. Daily Revenue (for Bar Chart)
    const dailyMap = invoices.reduce((acc, inv) => {
      // Normalize date to YYYY-MM-DD
      let dateKey = ''
      if (inv.date && inv.date.toDate) {
        dateKey = inv.date.toDate().toISOString().split('T')[0]
      } else if (inv.date) {
        dateKey = new Date(inv.date).toISOString().split('T')[0]
      }

      if (!dateKey) return acc

      if (!acc[dateKey]) {
        acc[dateKey] = 0
      }
      acc[dateKey] += (Number(inv.amount) || 0)
      return acc
    }, {})

    // Sort by date and format for Recharts
    const dailyRevenue = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        amount
      }))

    // 3. Top Services (for Pie Chart)
    const serviceMap = invoices.reduce((acc, inv) => {
      // Check for serviceName or items array
      if (inv.serviceName) {
        acc[inv.serviceName] = (acc[inv.serviceName] || 0) + 1
      } else if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach(item => {
          const name = item.name || 'Unknown'
          acc[name] = (acc[name] || 0) + 1
        })
      } else {
        const name = 'General'
        acc[name] = (acc[name] || 0) + 1
      }
      return acc
    }, {})

    const topServices = Object.entries(serviceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5) // Top 5

    return {
      totalRevenue,
      averageTicket,
      totalInvoices,
      dailyRevenue,
      topServices
    }
  }, [invoices])

  return { metrics, loading, error }
}
