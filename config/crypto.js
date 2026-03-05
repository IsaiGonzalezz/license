const crypto = require('crypto');
const path = require('path');

// Apuntamos directo a la raíz
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const ALGORITHM = 'aes-256-cbc';

const getSecretKey = () => {
    const secret = process.env.LICENSE_MASTER_KEY;
    if (!secret) {
        throw new Error("No se encontró LICENSE_MASTER_KEY en el archivo .env");
    }
    // Aseguramos que la llave mida 32 bytes
    return crypto.createHash('sha256').update(secret).digest();
};

const encriptar = (textoPlano) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
    let encriptado = cipher.update(textoPlano, 'utf8', 'hex');
    encriptado += cipher.final('hex');
    return `${iv.toString('hex')}:${encriptado}`;
};

const desencriptar = (textoEncriptado) => {
    try {
        const [ivHex, contenidoHex] = textoEncriptado.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
        let desencriptado = decipher.update(contenidoHex, 'hex', 'utf8');
        desencriptado += decipher.final('utf8');
        return desencriptado;
    } catch (error) {
        console.error("Error al desencriptar: Llave incorrecta o datos corruptos.");
        return null;
    }
};

module.exports = { encriptar, desencriptar };