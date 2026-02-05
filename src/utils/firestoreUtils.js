import { collection, doc, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'

// Tu función debería verse así:
export const getBusinessCollection = (businessId, collectionName) => {
    if (!businessId) throw new Error("businessId es requerido para consultas seguras");

    return query(
        collection(db, collectionName),
        where("businessId", "==", businessId)
    );
};

/**
 * Obtiene una referencia a un documento dentro de una colección de negocio
 * Estructura: businesses/{businessId}/{collectionName}/{docId}
 * 
 * @param {string} businessId - ID del negocio
 * @param {string} collectionName - Nombre de la colección
 * @param {string} docId - ID del documento
 * @returns {DocumentReference} Referencia al documento
 * @throws {Error} Si businessId no está definido
 */
export function getBusinessDoc(businessId, collectionName, docId) {
    if (!businessId) {
        throw new Error(`businessId is required for multi-tenant document: ${collectionName}/${docId}`)
    }
    return doc(db, 'businesses', businessId, collectionName, docId)
}
