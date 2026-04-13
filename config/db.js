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
  connectTimeout: 30000
});

// Test de connexion au démarrage (version corrigée sans .connectionConfig)
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connecté à la base de données MySQL');
    
    // Afficher les infos de connexion correctement
    const config = pool.pool.config;
    console.log(`📊 Hôte: ${config.host}:${config.port}`);
    console.log(`📊 Base: ${config.database}`);
    console.log(`📊 Utilisateur: ${config.user}`);
    
    connection.release();
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
    console.error('💡 Vérifiez vos variables d\'environnement');
    console.error('   Variables attendues: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE');
    // Ne pas exit ici, laisser le serveur démarrer pour debug
  }
})();

module.exports = pool;