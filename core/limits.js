// Archivo: src/license/core/limits.js
const { poolLocal, poolLocalConnect } = require('../config/db-local');
const { poolLicencias, poolConnect: poolLicenciasConnect, sql } = require('../config/db-license');
const persistence = require('./persistence');

async function checkCapacity() {
    try {
        // 1. Obtenemos el límite 
        const identity = await persistence.getIdentity();
        if (!identity || !identity.storageLimit) {
            return { hasSpace: false, error: "NO_LOCAL_LIMIT_FOUND" };
        }

        const limitMB = identity.storageLimit; // Ej: 512

        // 2. Le preguntamos a SQL Server cuánto pesa esta BD exactamente
        await poolLocalConnect;
        const result = await poolLocal.request().query(`
            SELECT 
                CAST(SUM(used_pages) * 8. / 1024 AS DECIMAL(10,2)) AS UsadoMB
            FROM 
                sys.allocation_units
        `);
        // Si la base está totalmente vacía, SQL a veces devuelve null, por eso el "|| 0"
        const usedMB = result.recordset[0].UsadoMB || 0;

        return {
            hasSpace: usedMB < limitMB, // ¿Usado es menor que el límite?
            usedMB: usedMB,
            limitMB: limitMB
        };

    } catch (error) {
        console.error("Error en checkCapacity:", error.message);
        return { hasSpace: false, error: "DB_ERROR" };
    }
}


async function timeGuard() {

    // 1. Traemos la informacion local
    const identity = await persistence.getIdentity();
    if (!identity) return { isValid: false, error: "NO_LOCAL_LICENSE" };

    const { lastAccess, endAccess } = identity;

    if (!lastAccess || !endAccess) {
        return { isValid: false, error: "LICENSE_NEEDS_SYNC" };
    }

    const now = new Date(); 

    // Convierte la fecha a número entero (YYYYMMDD) usando la zona local
    const dateToNumber = (dateObj) => {
        const d = new Date(dateObj); 
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return parseInt(`${year}${month}${day}`, 10);
    };

    // Convertimos las 3 fechas al mismo formato numérico
    const hoyNum = dateToNumber(now);
    const finNum = dateToNumber(endAccess);
    const ultimoNum = dateToNumber(lastAccess);

    // REGLA 1: La Muerte Natural (Ya expiró)
    // Ejemplo: ¿20260404 es mayor que 20260314? Sí -> Bloqueado.
    if (hoyNum > finNum) {
        return { isValid: false, error: "LICENSE_EXPIRED" };
    }

    // REGLA 2: Intento de atrasar el reloj de la computadora
    if (hoyNum < ultimoNum) {
        return { isValid: false, error: "TIME_TAMPERING" };
    }

    // REGLA 3: El Pase Libre 
    if (hoyNum !== ultimoNum) {
        await persistence.updateLastAccess(now);
    }

    // Si pasó todos los filtros entra al sistema
    return { isValid: true };
};


module.exports = { checkCapacity, timeGuard }; 