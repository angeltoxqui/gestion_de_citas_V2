/**
 * Notification Service Utility
 * Sends webhook notifications when appointments are created
 * Designed to integrate with n8n, Twilio, Waha, or any webhook-compatible service
 */

/**
 * Replaces template variables with actual appointment data
 * Supported variables: {cliente}, {hora}, {fecha}, {servicio}, {profesional}, {negocio}, {telefono}
 * @param {string} template - Message template with variables
 * @param {Object} appointmentData - Appointment data object
 * @returns {string} - Processed message with variables replaced
 */
function processMessageTemplate(template, appointmentData) {
    if (!template) return ''

    const variables = {
        '{cliente}': appointmentData.patientName || '',
        '{hora}': appointmentData.appointmentTime || '',
        '{fecha}': appointmentData.appointmentDate || '',
        '{servicio}': appointmentData.serviceName || '',
        '{profesional}': appointmentData.doctorName || '',
        '{negocio}': appointmentData.businessName || '',
        '{telefono}': appointmentData.patientPhone || ''
    }

    let processedMessage = template
    for (const [variable, value] of Object.entries(variables)) {
        processedMessage = processedMessage.replace(new RegExp(variable, 'g'), value)
    }

    return processedMessage
}

/**
 * Sends a notification via webhook when an appointment is created
 * Handles errors silently to prevent breaking the main app flow
 * 
 * @param {Object} appointmentData - Appointment data to send
 * @param {string} appointmentData.patientName - Client name
 * @param {string} appointmentData.patientPhone - Client phone number
 * @param {string} appointmentData.appointmentDate - Appointment date
 * @param {string} appointmentData.appointmentTime - Appointment time
 * @param {string} appointmentData.serviceName - Service name
 * @param {string} appointmentData.doctorName - Professional/doctor name
 * @param {string} appointmentData.businessName - Business name
 * @param {Object} businessConfig - Business configuration
 * @param {string} businessConfig.webhookUrl - Webhook URL to send notification
 * @param {string} businessConfig.welcomeMessage - Message template with variables
 * @returns {Promise<boolean>} - True if notification was sent successfully
 */
export async function sendNotification(appointmentData, businessConfig) {
    // Validate required configuration
    if (!businessConfig?.webhookUrl) {
        console.log('[Notifications] No webhook URL configured, skipping notification')
        return false
    }

    try {
        // Process the message template
        const processedMessage = processMessageTemplate(
            businessConfig.welcomeMessage || 'Nueva cita agendada para {cliente}',
            appointmentData
        )

        // Prepare the webhook payload
        const payload = {
            // Appointment details
            appointment: {
                clientName: appointmentData.patientName,
                clientPhone: appointmentData.patientPhone,
                date: appointmentData.appointmentDate,
                time: appointmentData.appointmentTime,
                service: appointmentData.serviceName,
                professional: appointmentData.doctorName
            },
            // Business info
            business: {
                name: appointmentData.businessName || businessConfig.name
            },
            // Processed message ready to send
            message: processedMessage,
            // Timestamp
            timestamp: new Date().toISOString(),
            // Event type for webhook handlers
            eventType: 'appointment.created'
        }

        // Send the webhook request
        const response = await fetch(businessConfig.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (response.ok) {
            console.log('[Notifications] Webhook sent successfully')
            return true
        } else {
            console.warn(`[Notifications] Webhook returned status ${response.status}`)
            return false
        }
    } catch (error) {
        // Handle errors silently - don't break the app if notification fails
        console.error('[Notifications] Error sending webhook:', error.message)
        return false
    }
}

export default {
    sendNotification,
    processMessageTemplate
}
