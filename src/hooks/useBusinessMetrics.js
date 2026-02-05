import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';

export const useBusinessMetrics = () => {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState({
        appointments: 0,
        revenue: 0,
        activeClients: 0,
        growth: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 🚩 CRÍTICO: Si el businessId no existe todavía, NO inicies el listener.
        // Esto evita enviar una consulta vacía que genera el error de permisos.
        if (!user?.businessId) return;

        // 🛡️ CONSULTA SEGURA: Filtramos estrictamente por businessId
        const metricsQuery = query(
            collection(db, 'appointments'),
            where('businessId', '==', user.businessId), // <--- ESTA LÍNEA ES LA CLAVE
            orderBy('date', 'desc'), // Requiere índice compuesto en Firestore
            limit(100) // Buenas prácticas: no traer todo el historial para métricas simples
        );

        console.log("📊 Suscribiendo a métricas para negocio:", user.businessId);

        const unsubscribe = onSnapshot(metricsQuery, (snapshot) => {
            // Calcular métricas en cliente (o idealmente mover esto a un Cloud Function)
            const docs = snapshot.docs.map(doc => doc.data());

            const totalRevenue = docs.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);

            setMetrics({
                appointments: snapshot.size,
                revenue: totalRevenue,
                activeClients: new Set(docs.map(d => d.clientId)).size,
                growth: 10 // Valor ejemplo
            });
            setLoading(false);
        }, (error) => {
            console.error("❌ Error en useBusinessMetrics:", error);
            // Si el error persiste, verifica que exista el índice en la consola de Firebase
        });

        return () => unsubscribe();
    }, [user?.businessId]);

    return { metrics, loading };
};
