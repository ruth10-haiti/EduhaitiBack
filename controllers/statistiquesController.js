const db = require('../config/db');

// ========== STATISTIQUES AVANCÉES POUR GRAPHIQUES ==========
exports.getGraphiques = async (req, res) => {
  try {
    const { role, periode = '6' } = req.query;
    
    let data = {};
    
    // Évolution générale des inscriptions (tous rôles)
    const [evolution] = await db.query(`
      SELECT DATE_FORMAT(date_inscription, '%Y-%m') as mois, COUNT(*) as total
      FROM inscriptions
      WHERE date_inscription >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(date_inscription, '%Y-%m')
      ORDER BY mois ASC
    `, [periode]);
    
    // Top 5 écoles avec plus d'inscriptions
    const [topEcoles] = await db.query(`
      SELECT e.nom, COUNT(i.id) as total
      FROM inscriptions i
      JOIN eleves el ON i.id_eleve = el.id
      JOIN ecoles e ON el.id_ecole = e.id
      GROUP BY e.id
      ORDER BY total DESC
      LIMIT 5
    `);
    
    // Résultats par examen
    const [resultatsParExamen] = await db.query(`
      SELECT e.nom as examen, 
        COUNT(CASE WHEN r.statut = 'ADMIS' THEN 1 END) as admis,
        COUNT(CASE WHEN r.statut = 'ECHEC' THEN 1 END) as echec,
        COUNT(*) as total
      FROM resultats r
      JOIN examens e ON r.id_examen = e.id
      GROUP BY e.id
      LIMIT 5
    `);
    
    data = { evolution, topEcoles, resultatsParExamen };
    
    res.json(data);
  } catch (error) {
    console.error('❌ Erreur getGraphiques:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des graphiques' });
  }
};

// ========== ACTIVITÉS RÉCENTES ==========
exports.getActivitesRecentes = async (req, res) => {
  try {
    const [activites] = await db.query(`
      (SELECT 'inscription' as type, i.date_inscription as date, 
              CONCAT('Nouvelle inscription de l\'élève ', e.nom) as description
       FROM inscriptions i
       JOIN eleves e ON i.id_eleve = e.id
       ORDER BY i.date_inscription DESC
       LIMIT 5)
      UNION ALL
      (SELECT 'examen' as type, e.date_creation as date,
              CONCAT('Création de l\'examen ', e.nom) as description
       FROM examens e
       ORDER BY e.date_creation DESC
       LIMIT 5)
      ORDER BY date DESC
      LIMIT 10
    `);
    
    res.json(activites);
  } catch (error) {
    console.error('❌ Erreur getActivitesRecentes:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des activités' });
  }
};