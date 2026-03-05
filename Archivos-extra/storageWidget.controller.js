const license = require('../license/index'); // Ajusta la ruta a tu carpeta license

const getStorageWidgetData = async (req, res) => {
    try {
        const storageData = await license.checkStorage();

        if (storageData.error) {
            return res.status(400).json({ 
                success: false, 
                message: "No se pudo obtener la información de almacenamiento",
                detalle: storageData.error 
            });
        }

        let porcentaje = 0;
        if (storageData.limitMB > 0) {
            porcentaje = (storageData.usedMB / storageData.limitMB) * 100;
        }

        res.json({
            success: true,
            data: {
                usedMB: storageData.usedMB,
                limitMB: storageData.limitMB,
                porcentaje: porcentaje.toFixed(2)
            }
        });

    } catch (error) {
        console.error("Error consultando storage:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
};

module.exports = { getStorageWidgetData };