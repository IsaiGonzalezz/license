const { poolLocal, poolLocalConnect } = require('../config/db-local.js');
const persistence = require('../core/persistence.js'); 

const verifyStorage = async (req, res, next) => {
    try {
        // 1. Obtenemos el límite dinámico desde persistence
        const identity = await persistence.getIdentity();
        
        if (!identity || !identity.storageLimit) {
            console.error("[Licencia] Límite local no encontrado en persistence.");
            return res.status(500).json({
                success: false,
                detail: "Error interno: No se encontró la configuración del límite de almacenamiento."
            });
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
        //console.log(`[Middleware] Checando espacio: ${usedMB} MB / ${limitMB} MB`);

        // 3. El muro de contención 
        if (usedMB >= limitMB) {
            console.warn(`[Licencia] Intento de inserción bloqueado. Espacio: ${usedMB}MB / ${limitMB}MB`);
            
            // Mandamos el error 403 al frontend
            return res.status(403).json({
                success: false,
                detail: "Has alcanzado el límite de almacenamiento de tu licencia. No se pueden guardar más registros."
            });
        }

        // 4. Si tiene espacio (usedMB < limitMB), le damos luz verde
        next();

    } catch (error) {
        console.error("[Licencia] Error al verificar el almacenamiento:", error.message);
        return res.status(500).json({ 
            success: false, 
            detail: "Error interno al verificar la capacidad del sistema." 
        });
    }
};

module.exports = { verifyStorage };