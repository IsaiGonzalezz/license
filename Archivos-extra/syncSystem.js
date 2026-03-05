const license = require('../license/index');
const path = require('path');
// Cargamos variables de entorno para los datos de soporte
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Verifica si el sistema ya cuenta con registro en la BD local.
 * Si no hay, devuelve los datos de contacto para la interfaz.
 */

const checkSystemStatus = async (req, res) => {
    try {
        const softwareName = process.env.SOFTWARE_NAME;
        // syncSystem internamente debería llamar a tu nuevo timeGuard numérico
        const result = await license.syncSystem(softwareName);

        // CASO A: No hay licencia (Instalación limpia)
        if (!result.isValid && result.error === "NO_LOCAL_LICENSE") {
            return res.status(200).json({
                activated: false,
                reason: "NO_LOCAL_LICENSE", // Clave para mostrar pantalla de bienvenida
                message: "REQUIERE_LICENCIA",
                support: {
                    email: "ventas@siaumex.com",
                    phone: "+52 55 6818 6849"
                }
            });
        }

        // CASO B: Hay licencia pero algo está mal (Expiró o Reloj movido)
        if (!result.isValid) {
            return res.status(200).json({ 
                activated: false, 
                reason: result.error, // "LICENSE_EXPIRED" o "TIME_TAMPERING"
                support: {
                    email: "ventas@siaumex.com",
                    phone: "+52 55 6818 6849"
                }
            });
        }

        // CASO C: Todo perfecto
        return res.status(200).json({ activated: true });

    } catch (error) {
        console.error("Error en checkSystemStatus:", error);
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
};

/**
 * Procesa la clave de licencia ingresada por el usuario.
 * Solo recibe la licencia, la valida y el módulo se encarga del guardado.
 */
const activateSystem = async (req, res) => {
    try {
        const { licencia } = req.body; // Solo recibimos la licencia
        const softwareName = process.env.SOFTWARE_NAME;

        if (!licencia) {
            return res.status(400).json({ message: "La licencia es requerida." });
        }

        // El módulo valida en la Maestra y guarda en la Local automáticamente
        const result = await license.syncSystem(softwareName, licencia);

        if (!result.isValid) {
            console.log("🚨 LA NUBE RECHAZÓ LA LLAVE POR ESTE MOTIVO:", result.error);
            return res.status(401).json({
                success: false,
                error: result.error,
                message: "Licencia no válida.",
                support: {
                    email: "ventas@siaumex.com",
                    phone: "+52 55 6818 6849"
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "SISTEMA_ACTIVADO"
        });
    } catch (error) {
        res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
};



const getLicenseWidgetData = async (req, res) => {
    try {
        const identity = await license.getLocalIdentity();
        
        if (!identity || !identity.endAccess) {
            return res.status(200).json({ success: false, message: "No se encontró licencia local" });
        }

        const hoy = new Date();
        const fechaFin = new Date(identity.endAccess);

        hoy.setHours(0, 0, 0, 0);
        fechaFin.setHours(0, 0, 0, 0);
        
        // 3. Calculamos la diferencia y usamos Math.round para el día exacto
        const diferenciaMs = fechaFin.getTime() - hoy.getTime();
        const diasRestantes = Math.round(diferenciaMs / (1000 * 60 * 60 * 24));

        return res.status(200).json({
            success: true,
            data: {
                diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
                fechaExpiracion: identity.endAccess
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
};

module.exports = { checkSystemStatus, activateSystem, getLicenseWidgetData };