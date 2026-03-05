const license = require('../license');

const getUsersWidgetData = async (req,res) => {
    try{

        const identity = await license.getLocalIdentity();
        const softwareName = process.env.SOFTWARE_NAME;
        const usersData = await license.getSessions(identity.licclie,softwareName);

        if(!usersData){
            return res.status(400).json({
                success: false,
                message: 'No se pudo obtener la información de usuarios activos.',
            });
        }

        res.json({
            success:true,
            data:{
                usoActual: usersData.usoActual,
                limite: usersData.limitePermitido,
            }
        })
    }catch(e){
        console.error("Error consultando limite de usuarios: ", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
}

module.exports = { getUsersWidgetData };