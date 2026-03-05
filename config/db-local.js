// Archivo: src/license/config/db-local.js
const sql = require('mssql');
const path = require('path');

//SUPONIENDO QUE EN TU .ENV TIENES LAS CONTRASEÑAS DE LA BASE DE DATOS QUE ESTAS USANDO
//EN CASO DE TENERLAS EN OTRO SITIO MODIFICAR EL ACCESO A ELLAS O SI PREFIERES PONERLAS DIRECTAMENTE EN LAS VARIABLES


require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// Aquí usamos las variables que ya tienes en tu .env para el proyecto
const localConfig = {
    user: process.env.DB_USER,        // Usuario de la BD del cliente
    password: process.env.DB_PASSWORD, // Password de la BD del cliente
    server: process.env.DB_SERVER,     // Servidor
    database: process.env.DB_NAME,     // La BD del software
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const poolLocal = new sql.ConnectionPool(localConfig);
const poolLocalConnect = poolLocal.connect();
console.log('Conected')

module.exports = { poolLocal, poolLocalConnect };