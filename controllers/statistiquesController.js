// backend/controllers/statistiquesController.js (VERSION CORRIGÉE)
const db = require('../config/db');

// ========== STATISTIQUES AVANCÉES POUR GRAPHIQUES ==========
exports.getGraphiques = async (req, res) => {
  try {
    const { periode = '6' } = req.query;
    const userRole = req.user.role; // ← Récupérer le rôle de l'utilisateur connecté
    
    let evolutionQuery = `
      SELECT DATE_FORMAT(date_inscription, '%Y-%m') as mois, COUNT(*) as total
      FROM inscriptions
      WHERE date_inscription >= DATE_SUB(NOW(), INTERVAL ? MONTH)
    `;
    
    // Filtrer selon le rôle (optionnel)
    if (userRole === 'secretariat') {
      // Le secrétariat voit uniquement ses écoles
      evolutionQuery += ` AND id_ecole = ?`;
      const [evolution] = await db.query(evolutionQuery, [periode, req.user.id_ecole]);
    } else {
      const [evolution] = await db.query(evolutionQuery, [periode]);
    }
    
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
    
    res.json({ evolution, topEcoles, resultatsParExamen });
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
              CONCAT('Nouvelle inscription de l\'élève ', e.nom, ' ', e.prenom) as description,
              i.id as reference_id
       FROM inscriptions i
       JOIN eleves e ON i.id_eleve = e.id
       ORDER BY i.date_inscription DESC
       LIMIT 5)
      UNION ALL
      (SELECT 'examen' as type, e.date_creation as date,
              CONCAT('Création de l\'examen "', e.nom, '"') as description,
              e.id as reference_id
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