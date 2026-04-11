const mysql = require('mysql2/promise');
require('dotenv').config();

// Support à la fois les variables DB_* et MYSQL_* de Railway
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
  // Important pour Railway
  ssl: false
});

// Test de connexion au démarrage (version async/await)
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connecté à la base de données MySQL');
    console.log(`📊 Hôte: ${pool.config.connectionConfig.host}:${pool.config.connectionConfig.port}`);
    console.log(`📊 Base: ${pool.config.connectionConfig.database}`);
    connection.release();
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
    console.error('💡 Vérifiez vos variables d\'environnement');
    // Ne pas exit ici, laisser le serveur démarrer pour debug
  }
})();

module.exports = pool;