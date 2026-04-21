const db = require('../config/db');

// ========== ROUTES EXISTANTES (gardées telles quelles) ==========

exports.getByExamen = async (req, res) => {
  const { idExamen } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT ie.*, e.prenom, e.nom, e.matricule_national
       FROM inscription_examens ie
       JOIN eleves e ON ie.id_eleve = e.id
       WHERE ie.id_examen = ?
       ORDER BY e.nom`,
      [idExamen]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getByEleve = async (req, res) => {
  const { idEleve } = req.params;

  if (req.user.role === 'parent') {
    const [link] = await db.query(
      'SELECT 1 FROM parent_eleve WHERE id_utilisateur = ? AND id_eleve = ?',
      [req.user.id, idEleve]
    );
    if (link.length === 0) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
  }

  try {
    const [rows] = await db.query(
      `SELECT ie.*, e.nom as examen_nom, e.annee_session
       FROM inscription_examens ie
       JOIN examens e ON ie.id_examen = e.id
       WHERE ie.id_eleve = ?
       ORDER BY e.annee_session DESC`,
      [idEleve]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  const { id_eleve, id_examen, date_inscription, statut } = req.body;
  try {
    // Vérifier si l'élève est déjà inscrit à cet examen
    const [existing] = await db.query(
      'SELECT id FROM inscription_examens WHERE id_eleve = ? AND id_examen = ?',
      [id_eleve, id_examen]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Cet élève est déjà inscrit à cet examen' });
    }
    
    const [result] = await db.query(
      'INSERT INTO inscription_examens (id_eleve, id_examen, date_inscription, statut) VALUES (?, ?, NOW(), ?)',
      [id_eleve, id_examen, statut || 'en_attente']
    );
    res.status(201).json({ id: result.insertId, message: 'Inscription créée' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Élève déjà inscrit à cet examen' });
    }
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE inscription_examens SET statut = ? WHERE id = ?',
      [statut, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM inscription_examens WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    res.json({ message: 'Inscription supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== NOUVELLES FONCTIONS POUR LE FRONTEND ==========

// GET toutes les inscriptions (pour BUNEXE)
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ie.*, 
             e.prenom as eleve_prenom, 
             e.nom as eleve_nom, 
             e.matricule_national,
             ex.nom as examen_nom,
             ex.type_examen
      FROM inscription_examens ie
      JOIN eleves e ON ie.id_eleve = e.id
      JOIN examens ex ON ie.id_examen = ex.id
      ORDER BY ie.date_inscription DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Valider une inscription
exports.valider = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      'UPDATE inscription_examens SET statut = "validee" WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    res.json({ message: 'Inscription validée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Rejeter une inscription
exports.rejeter = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      'UPDATE inscription_examens SET statut = "rejetee" WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    res.json({ message: 'Inscription rejetée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Soumettre la liste des élèves (secrétariat vers BUNEXE)
exports.soumettreListe = async (req, res) => {
  const { idExamen } = req.body;
  const idEcole = req.user.id_ecole;

  if (!idExamen) {
    return res.status(400).json({ message: 'L\'ID de l\'examen est requis' });
  }

  if (!idEcole && req.user.role !== 'admin') {
     return res.status(403).json({ message: 'Aucune école associée à cet utilisateur' });
  }

  try {
    let query = `
      UPDATE inscription_examens ie
      JOIN eleves e ON ie.id_eleve = e.id
      SET ie.statut = 'soumise'
      WHERE ie.id_examen = ? AND ie.statut = 'en_attente'
    `;
    let params = [idExamen];

    if (req.user.role !== 'admin') {
      query += ` AND e.id_ecole = ?`;
      params.push(idEcole);
    }

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Aucune inscription en attente à soumettre pour cet examen' });
    }

    res.json({ message: `${result.affectedRows} inscription(s) soumise(s) avec succès au BUNEXE` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la soumission de la liste' });
  }
};