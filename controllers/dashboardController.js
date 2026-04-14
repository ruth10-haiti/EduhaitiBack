const db = require('../config/db');

// ========== STATS ADMIN ==========
exports.getAdminStats = async (req, res) => {
  try {
    const [users] = await db.query('SELECT COUNT(*) as total FROM utilisateurs');
    const [ecoles] = await db.query('SELECT COUNT(*) as total FROM ecoles');
    const [eleves] = await db.query('SELECT COUNT(*) as total FROM eleves');
    const [examens] = await db.query('SELECT COUNT(*) as total FROM examens');
    const [inscriptions] = await db.query('SELECT COUNT(*) as total FROM inscriptions');
    
    // Inscriptions par mois (derniers 6 mois)
    const [inscriptionsParMois] = await db.query(`
      SELECT DATE_FORMAT(date_inscription, '%Y-%m') as mois, COUNT(*) as total
      FROM inscriptions
      WHERE date_inscription >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(date_inscription, '%Y-%m')
      ORDER BY mois ASC
    `);
    
    // Répartition par rôle
    const [repartitionRoles] = await db.query(`
      SELECT role, COUNT(*) as total FROM utilisateurs GROUP BY role
    `);
    
    res.json({
      totalUtilisateurs: users[0].total,
      totalEcoles: ecoles[0].total,
      totalEleves: eleves[0].total,
      totalExamens: examens[0].total,
      totalInscriptions: inscriptions[0].total,
      inscriptionsParMois,
      repartitionRoles
    });
  } catch (error) {
    console.error('❌ Erreur getAdminStats:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des statistiques' });
  }
};

// ========== STATS BUNEXE ==========
exports.getBunexeStats = async (req, res) => {
  try {
    const [examensActifs] = await db.query(`
      SELECT COUNT(*) as total FROM examens WHERE date_fin >= CURDATE()
    `);
    const [totalInscriptions] = await db.query(`
      SELECT COUNT(*) as total FROM inscription_examens
    `);
    const [tauxReussite] = await db.query(`
      SELECT 
        COUNT(CASE WHEN statut = 'ADMIS' THEN 1 END) as admis,
        COUNT(*) as total
      FROM resultats
    `);
    const [centresExamen] = await db.query(`
      SELECT COUNT(DISTINCT id_ecole) as total FROM examens
    `);
    
    const taux = tauxReussite[0].total > 0 
      ? Math.round((tauxReussite[0].admis / tauxReussite[0].total) * 100)
      : 0;
    
    // Évolution inscriptions par mois
    const [evolutionInscriptions] = await db.query(`
      SELECT DATE_FORMAT(date_inscription, '%Y-%m') as mois, COUNT(*) as total
      FROM inscription_examens
      WHERE date_inscription >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(date_inscription, '%Y-%m')
      ORDER BY mois ASC
    `);
    
    res.json({
      examensActifs: examensActifs[0].total,
      totalInscriptions: totalInscriptions[0].total,
      tauxReussite: taux,
      centresExamen: centresExamen[0].total,
      evolutionInscriptions
    });
  } catch (error) {
    console.error('❌ Erreur getBunexeStats:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des statistiques' });
  }
};

// ========== STATS SECRETARIAT ==========
exports.getSecretariatStats = async (req, res) => {
  try {
    const [inscriptionsAttente] = await db.query(`
      SELECT COUNT(*) as total FROM inscriptions WHERE statut = 'en_attente'
    `);
    const [dossiersComplets] = await db.query(`
      SELECT COUNT(*) as total FROM inscriptions WHERE statut = 'valide'
    `);
    const [elevesTotal] = await db.query('SELECT COUNT(*) as total FROM eleves');
    const [inscriptionsParStatut] = await db.query(`
      SELECT statut, COUNT(*) as total FROM inscriptions GROUP BY statut
    `);
    
    res.json({
      inscriptionsAttente: inscriptionsAttente[0].total,
      dossiersComplets: dossiersComplets[0].total,
      elevesTotal: elevesTotal[0].total,
      inscriptionsParStatut
    });
  } catch (error) {
    console.error('❌ Erreur getSecretariatStats:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des statistiques' });
  }
};