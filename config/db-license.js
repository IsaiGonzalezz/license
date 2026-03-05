const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const { desencriptar } = require('./crypto');

const vaultPath = path.join(__dirname, 'vault.json');
const vaultData = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
const credencialesString = desencriptar(vaultData.credenciales_bd);

if (!credencialesString) {
    process.exit(1);
}

const dbConfig = JSON.parse(credencialesString);

const config = {
    user: dbConfig.user,
    password: dbConfig.password,
    server: dbConfig.server,
    database: dbConfig.database,
    options: { encrypt: false, trustServerCertificate: true }
};

const poolLicencias = new sql.ConnectionPool(config);
const poolConnect = poolLicencias.connect();

module.exports = { poolLicencias, poolConnect, sql };