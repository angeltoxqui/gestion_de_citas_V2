import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import {
    getPlan,
    getPlanLimits,
    getUpgradeSuggestion,
    PLAN_IDS,
    isTrialExpired,
    getRemainingTrialDays
} from '../utils/plans'

/**
 * Hook to manage plan limits and enforce restrictions
 * Provides functions to check if user can perform actions based on their plan
 * Handles trial period logic
 */
export function usePlanLimits() {
    const { businessId } = useAuth()
    const [businessData, setBusinessData] = useState(null)
    const [staffCount, setStaffCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)

    // Fetch business data to get current plan
    useEffect(() => {
        if (!businessId) {
            setIsLoading(false)
            return
        }

        const businessRef = doc(db, 'businesses', businessId)
        const unsubscribe = onSnapshot(businessRef, (snapshot) => {
            if (snapshot.exists()) {
                setBusinessData(snapshot.data())
            }
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [businessId])

    // Get current plan info
    const currentPlanId = businessData?.plan || PLAN_IDS.TRIAL
    const currentPlan = getPlan(currentPlanId)
    const limits = getPlanLimits(currentPlanId)
    const upgradeSuggestion = getUpgradeSuggestion(currentPlanId)

    // Trial status
    const trialEndsAt = businessData?.trialEndsAt
    const trialExpired = currentPlanId === PLAN_IDS.TRIAL && isTrialExpired(trialEndsAt)
    const remainingTrialDays = getRemainingTrialDays(trialEndsAt)
    const isOnTrial = currentPlanId === PLAN_IDS.TRIAL && !trialExpired

    /**
     * Update staff count (called from components that track staff)
     */
    const updateStaffCount = (count) => {
        setStaffCount(count)
    }

    /**
     * Check if trial has expired (blocks all actions)
     */
    const isBlocked = () => {
        return trialExpired
    }

    /**
     * Check if user can add more staff members
     */
    const canAddStaff = (currentCount = staffCount) => {
        if (trialExpired) return false
        return currentCount < limits.maxStaff
    }

    /**
     * Get remaining staff slots
     */
    const getRemainingStaffSlots = (currentCount = staffCount) => {
        return Math.max(0, limits.maxStaff - currentCount)
    }

    /**
     * Check if user can send marketing campaigns
     */
    const canSendCampaigns = () => {
        if (trialExpired) return false
        return limits.canSendCampaigns
    }

    /**
     * Check if user can export reports
     */
    const canExportReports = () => {
        if (trialExpired) return false
        return limits.canExportReports
    }

    /**
     * Check if user can customize branding
     */
    const canCustomizeBranding = () => {
        if (trialExpired) return false
        return limits.canCustomizeBranding
    }

    /**
     * Check if user can use email reminders
     */
    const canUseEmailReminders = () => {
        if (trialExpired) return false
        return limits.emailReminders
    }

    /**
     * Check if user can use SMS reminders
     */
    const canUseSmsReminders = () => {
        if (trialExpired) return false
        return limits.smsReminders
    }

    /**
     * Check if user can add more services
     */
    const canAddService = (currentServiceCount) => {
        if (trialExpired) return false
        return currentServiceCount < limits.maxServices
    }

    /**
     * Get upgrade message for staff limit
     */
    const getStaffLimitMessage = () => {
        // Trial expired - must subscribe
        if (trialExpired) {
            return {
                title: 'Prueba gratis finalizada',
                message: 'Tu período de prueba ha terminado. Elige un plan para continuar usando la plataforma.',
                suggestedPlan: PLANS[PLAN_IDS.BASIC],
                isTrialExpired: true
            }
        }

        if (canAddStaff()) return null

        if (currentPlanId === PLAN_IDS.TRIAL) {
            return {
                title: 'Límite de prueba alcanzado',
                message: 'Suscríbete al Plan Básico para continuar agregando profesionales.',
                suggestedPlan: upgradeSuggestion
            }
        }

        if (currentPlanId === PLAN_IDS.INDIVIDUAL) {
            return {
                title: 'Límite de 1 profesional',
                message: 'Actualiza al Plan Básico para agregar hasta 20 profesionales a tu equipo.',
                suggestedPlan: upgradeSuggestion
            }
        }

        if (currentPlanId === PLAN_IDS.BASIC) {
            return {
                title: 'Límite de 20 profesionales',
                message: 'Actualiza al Plan Profesional para agregar hasta 50 profesionales.',
                suggestedPlan: upgradeSuggestion
            }
        }

        return {
            title: 'Límite alcanzado',
            message: 'Contacta a soporte para aumentar tu límite de profesionales.',
            suggestedPlan: null
        }
    }

    /**
     * Get trial expiration message
     */
    const getTrialMessage = () => {
        if (!isOnTrial) return null

        if (remainingTrialDays <= 0) {
            return {
                type: 'expired',
                title: 'Prueba finalizada',
                message: 'Tu prueba gratis ha finalizado. Elige un plan para continuar.',
                urgent: true
            }
        }

        if (remainingTrialDays <= 2) {
            return {
                type: 'warning',
                title: `Tu prueba termina en ${remainingTrialDays} día${remainingTrialDays === 1 ? '' : 's'}`,
                message: 'Elige un plan ahora para no perder acceso.',
                urgent: true
            }
        }

        return {
            type: 'info',
            title: `${remainingTrialDays} días restantes de prueba`,
            message: 'Explora todas las funciones. Cuando estés listo, elige un plan.',
            urgent: false
        }
    }

    /**
     * Get upsell message for a specific feature
     */
    const getFeatureUpsellMessage = (featureName) => {
        const messages = {
            campaigns: {
                title: 'Campañas de Marketing',
                message: 'Las campañas de marketing están disponibles en el Plan Básico.',
                requiredPlan: PLAN_IDS.BASIC
            },
            smsReminders: {
                title: 'Recordatorios SMS',
                message: 'Los recordatorios por SMS están disponibles en el Plan Básico.',
                requiredPlan: PLAN_IDS.BASIC
            },
            emailReminders: {
                title: 'Recordatorios por Email',
                message: 'Los recordatorios por email están disponibles en el Plan Individual.',
                requiredPlan: PLAN_IDS.INDIVIDUAL
            },
            reports: {
                title: 'Exportar Reportes',
                message: 'La exportación de reportes está disponible en el Plan Individual.',
                requiredPlan: PLAN_IDS.INDIVIDUAL
            }
        }

        return messages[featureName] || null
    }

    return {
        // State
        isLoading,
        currentPlan,
        currentPlanId,
        limits,
        upgradeSuggestion,
        staffCount,

        // Trial state
        isOnTrial,
        trialExpired,
        remainingTrialDays,
        trialEndsAt,

        // Actions
        updateStaffCount,

        // Permission checks
        isBlocked,
        canAddStaff,
        canSendCampaigns,
        canExportReports,
        canCustomizeBranding,
        canUseEmailReminders,
        canUseSmsReminders,
        canAddService,

        // Helpers
        getRemainingStaffSlots,
        getStaffLimitMessage,
        getTrialMessage,
        getFeatureUpsellMessage
    }
}

// Import PLANS for use in getStaffLimitMessage
import { PLANS } from '../utils/plans'
