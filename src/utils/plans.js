/**
 * Plan configuration and limits
 * Defines the features and limits for each subscription plan
 * 
 * TRIAL SYSTEM:
 * - All new businesses start with a 7-day free trial of the Basic plan
 * - No free tier exists; after trial ends, user must subscribe
 * - Trial status is tracked via `trialEndsAt` field in business document
 */

export const TRIAL_DURATION_DAYS = 7

export const PLAN_IDS = {
    TRIAL: 'trial',
    INDIVIDUAL: 'individual',
    BASIC: 'basic',
    PROFESSIONAL: 'professional',
    ENTERPRISE: 'enterprise'
}

export const PLANS = {
    [PLAN_IDS.TRIAL]: {
        id: PLAN_IDS.TRIAL,
        name: 'Prueba Gratis',
        price: 0,
        isTrial: true,
        trialDays: TRIAL_DURATION_DAYS,
        // Trial gets Basic plan features
        limits: {
            maxStaff: 20,
            maxAppointmentsPerMonth: 1000,
            maxServices: 50,
            canSendCampaigns: true,
            canExportReports: true,
            canCustomizeBranding: true,
            onlineBooking: true,
            emailReminders: true,
            smsReminders: true
        },
        features: [
            'Todas las funciones del Plan Básico',
            'Hasta 20 Profesionales',
            'Citas ilimitadas',
            'Campañas de marketing',
            'Recordatorios SMS',
            `${TRIAL_DURATION_DAYS} días gratis`
        ]
    },
    [PLAN_IDS.INDIVIDUAL]: {
        id: PLAN_IDS.INDIVIDUAL,
        name: 'Individual',
        price: 199, // MXN per month
        limits: {
            maxStaff: 1,
            maxAppointmentsPerMonth: 200,
            maxServices: 10,
            canSendCampaigns: false,
            canExportReports: true,
            canCustomizeBranding: true,
            onlineBooking: true,
            emailReminders: true,
            smsReminders: false
        },
        features: [
            '1 Profesional',
            'Hasta 200 citas/mes',
            'Recordatorios por email',
            'Exportar reportes',
            'Logo personalizado'
        ]
    },
    [PLAN_IDS.BASIC]: {
        id: PLAN_IDS.BASIC,
        name: 'Básico',
        price: 499, // MXN per month
        isPopular: true,
        limits: {
            maxStaff: 20,
            maxAppointmentsPerMonth: 1000,
            maxServices: 50,
            canSendCampaigns: true,
            canExportReports: true,
            canCustomizeBranding: true,
            onlineBooking: true,
            emailReminders: true,
            smsReminders: true
        },
        features: [
            'Hasta 20 Profesionales',
            'Citas ilimitadas',
            'Campañas de marketing',
            'Recordatorios SMS',
            'Soporte prioritario'
        ]
    },
    [PLAN_IDS.PROFESSIONAL]: {
        id: PLAN_IDS.PROFESSIONAL,
        name: 'Profesional',
        price: 999, // MXN per month
        limits: {
            maxStaff: 50,
            maxAppointmentsPerMonth: Infinity,
            maxServices: Infinity,
            canSendCampaigns: true,
            canExportReports: true,
            canCustomizeBranding: true,
            onlineBooking: true,
            emailReminders: true,
            smsReminders: true
        },
        features: [
            'Hasta 50 Profesionales',
            'API Access',
            'Integraciones avanzadas',
            'Soporte 24/7'
        ]
    },
    [PLAN_IDS.ENTERPRISE]: {
        id: PLAN_IDS.ENTERPRISE,
        name: 'Empresarial',
        price: null, // Custom pricing
        limits: {
            maxStaff: Infinity,
            maxAppointmentsPerMonth: Infinity,
            maxServices: Infinity,
            canSendCampaigns: true,
            canExportReports: true,
            canCustomizeBranding: true,
            onlineBooking: true,
            emailReminders: true,
            smsReminders: true
        },
        features: [
            'Profesionales ilimitados',
            'Múltiples sucursales',
            'Onboarding dedicado',
            'SLA garantizado'
        ]
    }
}

/**
 * Get plan by ID
 * @param {string} planId - Plan identifier
 * @returns {object} - Plan configuration
 */
export function getPlan(planId) {
    return PLANS[planId] || PLANS[PLAN_IDS.TRIAL]
}

/**
 * Get plan limits by ID
 * @param {string} planId - Plan identifier
 * @returns {object} - Plan limits
 */
export function getPlanLimits(planId) {
    const plan = getPlan(planId)
    return plan.limits
}

/**
 * Get upgrade suggestion based on current plan
 * @param {string} currentPlanId - Current plan ID
 * @returns {object|null} - Suggested upgrade plan
 */
export function getUpgradeSuggestion(currentPlanId) {
    const upgradeOrder = [PLAN_IDS.TRIAL, PLAN_IDS.INDIVIDUAL, PLAN_IDS.BASIC, PLAN_IDS.PROFESSIONAL]
    const currentIndex = upgradeOrder.indexOf(currentPlanId)

    if (currentIndex === -1 || currentIndex >= upgradeOrder.length - 1) {
        return null
    }

    return PLANS[upgradeOrder[currentIndex + 1]]
}

/**
 * Format price for display
 * @param {number|null} price - Price in MXN
 * @returns {string} - Formatted price
 */
export function formatPlanPrice(price) {
    if (price === null) return 'Contactar'
    if (price === 0) return 'Gratis'
    return `$${price} MXN/mes`
}

/**
 * Calculate trial end date from a start date
 * @param {Date|string} startDate - Trial start date
 * @returns {Date} - Trial end date
 */
export function calculateTrialEndDate(startDate = new Date()) {
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + TRIAL_DURATION_DAYS)
    return end
}

/**
 * Check if trial has expired
 * @param {Date|string} trialEndsAt - Trial end date
 * @returns {boolean} - True if trial has expired
 */
export function isTrialExpired(trialEndsAt) {
    if (!trialEndsAt) return false
    const endDate = new Date(trialEndsAt)
    return new Date() > endDate
}

/**
 * Get remaining trial days
 * @param {Date|string} trialEndsAt - Trial end date
 * @returns {number} - Remaining days (0 if expired)
 */
export function getRemainingTrialDays(trialEndsAt) {
    if (!trialEndsAt) return 0
    const endDate = new Date(trialEndsAt)
    const now = new Date()
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
}

/**
 * Get default plan for new businesses (trial)
 * @returns {object} - Trial plan configuration with dates
 */
export function getNewBusinessPlan() {
    return {
        plan: PLAN_IDS.TRIAL,
        trialStartedAt: new Date().toISOString(),
        trialEndsAt: calculateTrialEndDate().toISOString()
    }
}
