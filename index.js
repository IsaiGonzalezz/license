const auth = require('./core/auth');
const limits = require('./core/limits');
const crypto = require('./config/crypto');
const persistence = require('./core/persistence')

module.exports = {

    getSessions: async (licclie, software) => {
        return await auth.getActiveSessions(licclie, software);
    },

    // ACTUALIZADA: Para validación de login restringir cupo de usuarios
    loginCheck: async (licclie, software) => {
        const res = await auth.verifyLicenseStatus(licclie, software);
        
        if (res.isValid) {
            // Intentamos ocupar un lugar
            const session = await auth.updateSession(licclie, software, true);
            if (!session.success) {
                return { 
                    isValid: false, 
                    error: "MAX_SESSIONS_REACHED", 
                    message: session.message 
                };
            }
        }
        return res;
    },

    // Para liberar usuarios (Logout)
    releaseLicense: async (licclie, software) => {
        await auth.updateSession(licclie, software, false);
    },

    // Para verificar antes de escribir en BD
    checkStorage: (licclie, software, usage) => {
        return limits.checkCapacity(licclie, software, usage);
    },

    syncSystem: async (softwareName, manualKey = null) => {
        // 1. Buscamos en la BD Local
        let identity = await persistence.getIdentity();

        // Prioridad: Si el usuario mandó una llave manualmente (activación), usamos esa.
        // Si no mandó nada, usamos la que esté guardada en la BD Local.
        let keyToVerify = manualKey || (identity ? identity.licclie : null);

        // Si al final no tenemos ni llave manual ni llave guardada, entonces sí es error.
        if (!keyToVerify) {
            return { isValid: false, error: "NO_LOCAL_LICENSE" };
        }

        // 2. Validar contra la BD MAESTRA (La de la nube)
        const check = await auth.verifyLicenseStatus(keyToVerify, softwareName);

        if (check.isValid) {

            // 3. Si la activación fue exitosa y venía de una llave manual, la guardamos localmente
            if (manualKey) {
                await persistence.saveIdentity(check.data.folio, check.data.rfc, manualKey, check.data.storage, check.data.tiemLim, check.data.fechAct);
            }
        }

        return check;
    },

    // Puente para leer quiénes somos localmente
    getLocalIdentity: async () => {
        return await persistence.getIdentity();
    },

    //validar las fechas de la licencia
    verifyTime: async() => {
        return await limits.timeGuard();
    },

    // Utilidades de cifrado (Para que el software guarde sus cosas encriptadas)
    tools: {
        encrypt: (text) => crypto.encriptar(text),
        decrypt: (text) => crypto.desencriptar(text)
    },

};