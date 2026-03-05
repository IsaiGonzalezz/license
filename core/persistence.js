// Archivo: src/license/core/persistence.js
const { poolLocal, poolLocalConnect } = require('../config/db-local');
const { encriptar, desencriptar } = require('../config/crypto');
const sql = require('mssql');

const persistence = {
    getIdentity: async () => {
        try {
            await poolLocalConnect; // Esperamos la conexión a la BD del Cliente
            const result = await poolLocal.request().query(
                'SELECT TOP 1 sys_token_a, sys_token_b, sys_token_c, sys_token_d, sys_token_e, sys_auth_key FROM system_config'
            );
            
            if (result.recordset.length === 0) return null;

            const data = result.recordset[0];
            const memString = data.sys_token_c ? desencriptar(data.sys_token_c) : "0";
            const lastAccessStr = data.sys_token_d ? desencriptar(data.sys_token_d) : null;
            const endAccessStr = data.sys_token_e ? desencriptar(data.sys_token_e) : null;

            return {
                folio: desencriptar(data.sys_token_a),
                rfc: desencriptar(data.sys_token_b),
                licclie: desencriptar(data.sys_auth_key),
                storageLimit : parseInt(memString,10),
                lastAccess: lastAccessStr ? new Date(lastAccessStr) : null,
                endAccess: endAccessStr ? new Date(endAccessStr) : null
            };
        } catch (error) {
            console.error("Error leyendo BD Local:", error.message);
            return null;
        }
    },

    saveIdentity: async (folio, rfc, licclie, limit, tiemLim, fechAct) => {
        try {
            await poolLocalConnect;

            const today = new Date(); // La fecha real de hoy (solo para el lastAccess)
            const expirationDate = new Date(fechAct);
            expirationDate.setDate(expirationDate.getUTCDate() + parseInt(tiemLim, 10));

            // El último acceso es el momento en que activan la app localmente
            const lastAccessStr = today.toISOString();
            // La muerte es la fecha central + los días límite (fecha inamovible)
            const endAccessStr = expirationDate.toISOString();

            const tokenA = encriptar(folio.toString());
            const tokenB = encriptar(rfc.toString());
            const authKey = encriptar(licclie.toString());
            const tokenC = encriptar((limit || 0).toString());
            const tokenD = encriptar(lastAccessStr);
            const tokenE = encriptar(endAccessStr);

            await poolLocal.request()
                .input('a', sql.VarChar, tokenA)
                .input('b', sql.VarChar, tokenB)
                .input('k', sql.VarChar, authKey)
                .input('c', sql.VarChar, tokenC)
                .input('d', sql.VarChar, tokenD)
                .input('e', sql.VarChar, tokenE)
                .query(`
                    DELETE FROM system_config; 
                    INSERT INTO system_config (sys_token_a, sys_token_b, sys_auth_key, sys_token_c, sys_token_d, sys_token_e, last_sync)
                    VALUES (@a, @b, @k, @c, @d, @e, GETDATE())
                `);
            return true;
        } catch (error) {
            console.error("Error escribiendo en BD Local:", error.message);
            return false;
        }
    },

    updateLastAccess: async (newDate) => {
        try {
            await poolLocalConnect;

            const tokenD = encriptar(newDate.toISOString()); 
            await poolLocal.request()
                .input('d', sql.VarChar, tokenD)
                .query(`UPDATE system_config SET sys_token_d = @d`); // Solo hacemos UPDATE a esa columna
            return true;
        } catch (error) {
            console.error("Error actualizando last_access:", error.message);
            return false;
        }
    }
};

module.exports = persistence;