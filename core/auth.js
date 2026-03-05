const { poolLicencias, poolConnect, sql } = require('../config/db-license');

async function verifyLicenseStatus(licclie, software) {
    try {
        // En lugar de await poolConnect, usamos esto que es más robusto:
        if (!poolLicencias.connected) {
            await poolConnect;
        }

        const result = await poolLicencias.request()
            .input('LicClie', sql.VarChar, licclie)
            .input('Software', sql.VarChar, software)
            .query(`
                SELECT Folio, RFCClie, FechAct, TiemLim, Lics, LicUso, Estatus, Memoria 
                FROM licencias 
                WHERE LicClie = @LicClie AND Software = @Software
            `);

        if (result.recordset.length === 0) return { isValid: false, error: "NOT_FOUND" };

        const lic = result.recordset[0];

        if (lic.Estatus !== true) {
            console.log(" Bloqueado por Estatus inactivo (False).");
            return { isValid: false, error: "LICENSE_INACTIVE_IN_CENTRAL" };
        }

        // 2. Candado del Tiempo (¿La llave ya expiró desde que se creó?)
        const fechaCreacionCentral = new Date(lic.FechAct);
        const fechaExpiracionCentral = new Date(fechaCreacionCentral);
        fechaExpiracionCentral.setDate(fechaCreacionCentral.getDate() + lic.TiemLim);
        
        const hoy = new Date();
        if (hoy > fechaExpiracionCentral) {
            return { isValid: false, error: "LICENSE_EXPIRED_IN_CENTRAL" };
        }

        return {
            isValid: true,
            data: { 
                folio: lic.Folio, 
                rfc: lic.RFCClie, 
                storage: lic.Memoria,
                tiemLim: lic.TiemLim,
                fechAct: lic.FechAct
            }
        };
    } catch (error) {
        console.error("ERROR REAL EN AUTH:", error.message);
        return { isValid: false, error: "DB_ERROR" };
    }
}


async function getActiveSessions(licclie, software) {
    try {

        await poolConnect;
        const result = await poolLicencias.request()
            .input('LicClie', sql.VarChar, licclie)
            .input('Software', sql.VarChar, software)
            .query(`
                SELECT LicUso, Lics 
                FROM licencias 
                WHERE LicClie = @LicClie AND Software = @Software
            `);

        if (result.recordset.length > 0) {
            const data = result.recordset[0];
            return {
                usoActual: data.LicUso,
                limitePermitido: data.Lics,
                tieneCupo: data.LicUso < data.Lics
            };
        }
        return null; 
    } catch (e) {
        console.error("Error al consultar sesiones:", e);
        return null;
    }
}


async function updateSession(licclie, software, increment = true) {
    try {
        
        if (!poolLicencias.connected) {
            await poolConnect;
        }

        const query = increment
            ? `UPDATE licencias 
               SET LicUso = LicUso + 1 
               WHERE LicClie = @LicClie AND Software = @Software AND LicUso < Lics` // Solo suma si hay cupo
            : `UPDATE licencias 
               SET LicUso = CASE WHEN LicUso - 1 < 0 THEN 0 ELSE LicUso - 1 END 
               WHERE LicClie = @LicClie AND Software = @Software`;

        const result = await poolLicencias.request()
            .input('LicClie', sql.VarChar, licclie)
            .input('Software', sql.VarChar, software)
            .query(query);

        // Si rowsAffected es 0 en un incremento, es porque LicUso >= Lics
        if (increment && result.rowsAffected[0] === 0) {
            return { success: false, message: "LIMITE_DE_USUARIOS_ALCANZADO" };
        }

        return { success: true };
    } catch (e) {
        console.error("Error en updateSession:", e);
        return { success: false, message: "DB_ERROR" };
    }
}

module.exports = { verifyLicenseStatus, updateSession, getActiveSessions };