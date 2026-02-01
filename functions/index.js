/**
 * Firebase Cloud Functions (Gen 2) - Notificaciones Transaccionales
 * 
 * Este archivo maneja el envío automático de notificaciones por Email y WhatsApp
 * cuando se crea una nueva cita en el sistema.
 * 
 * Trigger: onDocumentCreated en businesses/{businessId}/appointments/{appointmentId}
 * 
 * Credenciales: Se manejan con defineSecret (Google Cloud Secret Manager)
 * para máxima seguridad. NUNCA se exponen al cliente.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const sgMail = require("@sendgrid/mail");
const axios = require("axios");

// ============================================
// INICIALIZACIÓN
// ============================================
initializeApp();
const db = getFirestore();

// ============================================
// DEFINICIÓN DE SECRETOS
// ============================================
// Estos secretos se configuran con: firebase functions:secrets:set NOMBRE_SECRETO
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const smtpFrom = defineSecret("SMTP_FROM");
const metaPhoneId = defineSecret("META_PHONE_ID");
const metaToken = defineSecret("META_TOKEN");

// ============================================
// UTILIDADES
// ============================================

/**
 * Procesa las variables de plantilla con los datos de la cita
 * Variables disponibles: {cliente}, {hora}, {fecha}, {servicio}, {profesional}, {negocio}, {telefono}, {email}
 * 
 * @param {string} template - Plantilla con variables entre llaves
 * @param {Object} data - Datos de la cita
 * @returns {string} - Mensaje procesado
 */
function processTemplate(template, data) {
    if (!template) return "";

    const variables = {
        "{cliente}": data.patientName || "",
        "{hora}": data.appointmentTime || "",
        "{fecha}": data.appointmentDate || "",
        "{servicio}": data.serviceName || "",
        "{profesional}": data.doctorName || "",
        "{negocio}": data.businessName || "",
        "{telefono}": data.patientPhone || "",
        "{email}": data.patientEmail || ""
    };

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(key, "g"), value);
    }
    return result;
}

/**
 * Formatea un número de teléfono para WhatsApp
 * Elimina espacios, guiones, paréntesis y el signo +
 * 
 * @param {string} phone - Número de teléfono
 * @returns {string} - Número formateado (solo dígitos)
 */
function formatPhoneForWhatsApp(phone) {
    if (!phone) return "";
    // Quitar todo excepto dígitos
    return phone.replace(/[^\d]/g, "");
}

// ============================================
// ENVÍO DE EMAIL (SendGrid)
// ============================================

/**
 * Envía un email de confirmación usando SendGrid
 * 
 * @param {Object} appointment - Datos de la cita
 * @param {Object} businessConfig - Configuración del negocio
 * @param {string} apiKey - API Key de SendGrid
 * @param {string} fromEmail - Email del remitente
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendEmailNotification(appointment, businessConfig, apiKey, fromEmail) {
    // Verificar si las notificaciones por email están activadas
    if (!businessConfig.emailNotificationsEnabled) {
        console.log("[Email] Notificaciones por email desactivadas para este negocio");
        return { success: false, message: "Email notifications disabled" };
    }

    // Verificar que el cliente tenga email
    if (!appointment.patientEmail) {
        console.log("[Email] El cliente no tiene email registrado");
        return { success: false, message: "No client email provided" };
    }

    try {
        sgMail.setApiKey(apiKey);

        // Procesar asunto
        const subject = processTemplate(
            businessConfig.emailSubject || "Confirmación de Cita - {negocio}",
            { ...appointment, businessName: businessConfig.name }
        );

        // Generar HTML del email
        const htmlContent = generateEmailHTML(appointment, businessConfig);

        const msg = {
            to: appointment.patientEmail,
            from: {
                email: fromEmail || "noreply@rootwave.app",
                name: businessConfig.name || "Sistema de Citas"
            },
            subject: subject,
            html: htmlContent,
            // Texto plano como fallback
            text: `Hola ${appointment.patientName}, tu cita ha sido confirmada para el ${appointment.appointmentDate} a las ${appointment.appointmentTime}.`
        };

        await sgMail.send(msg);
        console.log(`[Email] ✅ Enviado exitosamente a ${appointment.patientEmail}`);
        return { success: true, message: `Email sent to ${appointment.patientEmail}` };

    } catch (error) {
        console.error("[Email] ❌ Error:", error.message);
        if (error.response) {
            console.error("[Email] Response body:", error.response.body);
        }
        return { success: false, message: error.message };
    }
}

/**
 * Genera el HTML del email de confirmación
 */
function generateEmailHTML(appointment, businessConfig) {
    // Si el negocio tiene una plantilla personalizada, usarla
    if (businessConfig.emailTemplate) {
        return processTemplate(businessConfig.emailTemplate, {
            ...appointment,
            businessName: businessConfig.name
        });
    }

    // Plantilla por defecto
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Cita</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ Cita Confirmada</h1>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="padding: 30px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Hola <strong>${appointment.patientName || "Cliente"}</strong>,
            </p>
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Tu cita ha sido agendada correctamente. Aquí están los detalles:
            </p>
            
            <!-- Appointment Details Card -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                        <strong style="color: #6c757d;">📅 Fecha:</strong>
                        <span style="float: right; color: #333;">${appointment.appointmentDate || "Por confirmar"}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                        <strong style="color: #6c757d;">🕐 Hora:</strong>
                        <span style="float: right; color: #333;">${appointment.appointmentTime || "Por confirmar"}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                        <strong style="color: #6c757d;">💼 Servicio:</strong>
                        <span style="float: right; color: #333;">${appointment.serviceName || "Consulta General"}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;">
                        <strong style="color: #6c757d;">👤 Profesional:</strong>
                        <span style="float: right; color: #333;">${appointment.doctorName || "Por asignar"}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            <p style="font-size: 14px; color: #6c757d; margin-top: 20px;">
              Si necesitas cancelar o reprogramar tu cita, por favor contáctanos con anticipación.
            </p>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              <strong>${businessConfig.name || "Sistema de Citas"}</strong>
            </p>
            <p style="margin: 5px 0 0 0; color: #adb5bd; font-size: 12px;">
              Este es un mensaje automático, por favor no responder.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ============================================
// ENVÍO DE WHATSAPP (Meta Cloud API)
// ============================================

/**
 * Envía un mensaje de WhatsApp usando la API de Meta
 * 
 * @param {Object} appointment - Datos de la cita
 * @param {Object} businessConfig - Configuración del negocio
 * @param {string} phoneId - Phone Number ID de WhatsApp Business
 * @param {string} accessToken - Access Token de Meta
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendWhatsAppNotification(appointment, businessConfig, phoneId, accessToken) {
    // Verificar si las notificaciones por WhatsApp están activadas
    if (!businessConfig.whatsappNotificationsEnabled) {
        console.log("[WhatsApp] Notificaciones por WhatsApp desactivadas para este negocio");
        return { success: false, message: "WhatsApp notifications disabled" };
    }

    // Verificar que el cliente tenga teléfono
    if (!appointment.patientPhone) {
        console.log("[WhatsApp] El cliente no tiene teléfono registrado");
        return { success: false, message: "No client phone provided" };
    }

    try {
        const formattedPhone = formatPhoneForWhatsApp(appointment.patientPhone);

        if (!formattedPhone || formattedPhone.length < 10) {
            console.log("[WhatsApp] Número de teléfono inválido:", appointment.patientPhone);
            return { success: false, message: "Invalid phone number" };
        }

        // Procesar mensaje con plantilla
        const messageBody = processTemplate(
            businessConfig.whatsappMessage ||
            "Hola {cliente} 👋\n\nTu cita ha sido confirmada:\n\n📅 Fecha: {fecha}\n🕐 Hora: {hora}\n💼 Servicio: {servicio}\n👤 Profesional: {profesional}\n\n¡Te esperamos en {negocio}!",
            { ...appointment, businessName: businessConfig.name }
        );

        // Usar plantilla aprobada si está configurada, sino mensaje de texto
        let payload;

        if (businessConfig.whatsappTemplateId) {
            // Usar plantilla aprobada de Meta
            payload = {
                messaging_product: "whatsapp",
                to: formattedPhone,
                type: "template",
                template: {
                    name: businessConfig.whatsappTemplateId,
                    language: { code: "es" },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: appointment.patientName || "Cliente" },
                                { type: "text", text: appointment.appointmentDate || "Por confirmar" },
                                { type: "text", text: appointment.appointmentTime || "Por confirmar" },
                                { type: "text", text: appointment.serviceName || "Consulta" }
                            ]
                        }
                    ]
                }
            };
        } else {
            // Mensaje de texto libre (solo funciona con números de prueba registrados)
            payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedPhone,
                type: "text",
                text: {
                    preview_url: false,
                    body: messageBody
                }
            };
        }

        const response = await axios.post(
            `https://graph.facebook.com/v18.0/${phoneId}/messages`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log(`[WhatsApp] ✅ Mensaje enviado a ${formattedPhone}`, response.data);
        return {
            success: true,
            message: `WhatsApp sent to ${formattedPhone}`,
            messageId: response.data.messages?.[0]?.id
        };

    } catch (error) {
        console.error("[WhatsApp] ❌ Error:", error.message);
        if (error.response) {
            console.error("[WhatsApp] Response:", JSON.stringify(error.response.data, null, 2));
        }
        return {
            success: false,
            message: error.response?.data?.error?.message || error.message
        };
    }
}

// ============================================
// CLOUD FUNCTION PRINCIPAL
// ============================================

/**
 * Cloud Function Gen 2 - Trigger on Appointment Creation
 * 
 * Se ejecuta automáticamente cuando se crea un documento en:
 * businesses/{businessId}/appointments/{appointmentId}
 * 
 * Envía notificaciones por Email y WhatsApp según la configuración del negocio.
 */
exports.sendAppointmentNotification = onDocumentCreated(
    {
        document: "businesses/{businessId}/appointments/{appointmentId}",
        // Especificar los secretos que necesita la función
        secrets: [sendgridApiKey, smtpFrom, metaPhoneId, metaToken],
        // Región (us-central1 es la más común, pero puedes usar southamerica-east1 para latencia menor en LATAM)
        region: "us-central1",
        // Tiempo máximo de ejecución (en segundos)
        timeoutSeconds: 60,
        // Memoria asignada
        memory: "256MiB"
    },
    async (event) => {
        const snapshot = event.data;

        if (!snapshot) {
            console.log("[Function] ⚠️ No hay datos asociados al evento");
            return null;
        }

        const appointmentData = snapshot.data();
        const { businessId, appointmentId } = event.params;

        console.log(`[Function] 📅 Nueva cita creada:`);
        console.log(`  - Appointment ID: ${appointmentId}`);
        console.log(`  - Business ID: ${businessId}`);
        console.log(`  - Cliente: ${appointmentData.patientName}`);
        console.log(`  - Fecha: ${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`);

        try {
            // ============================================
            // 1. LEER CONFIGURACIÓN DEL NEGOCIO
            // ============================================
            const businessDoc = await db.collection("businesses").doc(businessId).get();

            if (!businessDoc.exists) {
                console.error(`[Function] ❌ Negocio no encontrado: ${businessId}`);
                return { success: false, error: "Business not found" };
            }

            const businessConfig = businessDoc.data();
            console.log(`[Function] 🏢 Negocio: ${businessConfig.name}`);
            console.log(`  - Email habilitado: ${businessConfig.emailNotificationsEnabled || false}`);
            console.log(`  - WhatsApp habilitado: ${businessConfig.whatsappNotificationsEnabled || false}`);

            // Preparar datos completos de la cita
            const appointment = {
                ...appointmentData,
                appointmentId,
                businessId,
                businessName: businessConfig.name
            };

            // ============================================
            // 2. ENVIAR NOTIFICACIONES EN PARALELO
            // ============================================
            const [emailResult, whatsappResult] = await Promise.allSettled([
                sendEmailNotification(
                    appointment,
                    businessConfig,
                    sendgridApiKey.value(),
                    smtpFrom.value()
                ),
                sendWhatsAppNotification(
                    appointment,
                    businessConfig,
                    metaPhoneId.value(),
                    metaToken.value()
                )
            ]);

            // ============================================
            // 3. REGISTRAR RESULTADOS
            // ============================================
            const results = {
                email: emailResult.status === "fulfilled" ? emailResult.value : { success: false, message: emailResult.reason },
                whatsapp: whatsappResult.status === "fulfilled" ? whatsappResult.value : { success: false, message: whatsappResult.reason }
            };

            console.log("[Function] 📊 Resultados de notificaciones:");
            console.log(`  - Email: ${results.email.success ? "✅" : "❌"} ${results.email.message}`);
            console.log(`  - WhatsApp: ${results.whatsapp.success ? "✅" : "❌"} ${results.whatsapp.message}`);

            // Opcional: Guardar log de notificación en Firestore
            try {
                await db.collection("businesses").doc(businessId)
                    .collection("notificationLogs").add({
                        appointmentId,
                        timestamp: new Date(),
                        results,
                        appointmentData: {
                            patientName: appointment.patientName,
                            patientEmail: appointment.patientEmail,
                            patientPhone: appointment.patientPhone,
                            appointmentDate: appointment.appointmentDate,
                            appointmentTime: appointment.appointmentTime
                        }
                    });
            } catch (logError) {
                console.warn("[Function] ⚠️ No se pudo guardar el log:", logError.message);
            }

            return { success: true, results };

        } catch (error) {
            console.error("[Function] ❌ Error procesando cita:", error);
            return { success: false, error: error.message };
        }
    }
);

// ============================================
// INFORMACIÓN DE DEPLOYMENT
// ============================================
/*
  COMANDOS PARA CONFIGURAR SECRETOS:
  
  firebase functions:secrets:set SENDGRID_API_KEY
  firebase functions:secrets:set SMTP_FROM
  firebase functions:secrets:set META_PHONE_ID
  firebase functions:secrets:set META_TOKEN
  
  COMANDOS PARA DEPLOY:
  
  cd functions
  npm install
  firebase deploy --only functions
  
  COMANDOS PARA VER LOGS:
  
  firebase functions:log
  firebase functions:log --only sendAppointmentNotification
*/
