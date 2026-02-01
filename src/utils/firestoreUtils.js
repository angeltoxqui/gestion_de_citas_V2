import { collection, doc } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Obtiene una referencia a una colección dentro de un negocio específico
 * Estructura: businesses/{businessId}/{collectionName}
 * 
 * @param {string} businessId - ID del negocio (obtenido de useAuth())
 * @param {string} collectionName - Nombre de la colección (appointments, services, etc.)
 * @returns {CollectionReference} Referencia a la subcolección del negocio
 * @throws {Error} Si businessId no está definido
 */
export function getBusinessCollection(businessId, collectionName) {
    if (!businessId) {
        throw new Error(`businessId is required for multi-tenant collection: ${collectionName}`)
    }
    return collection(db, 'businesses', businessId, collectionName)
}

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
