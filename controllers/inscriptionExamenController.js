const db = require('../config/db');

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
    const [result] = await db.query(
      'INSERT INTO inscription_examens (id_eleve, id_examen, date_inscription, statut) VALUES (?, ?, ?, ?)',
      [id_eleve, id_examen, date_inscription, statut || 'en cours']
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