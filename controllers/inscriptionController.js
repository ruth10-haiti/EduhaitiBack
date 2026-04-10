const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT i.*, e.prenom, e.nom, e.matricule_national, ec.nom as ecole_nom FROM inscriptions i JOIN eleves e ON i.id_eleve = e.id JOIN ecoles ec ON i.id_ecole = ec.id ORDER BY i.annee_academique DESC, e.nom');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getByEleve = async (req, res) => {
  const { idEleve } = req.params;

  // Vérification parent
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
      'SELECT i.*, ec.nom as ecole_nom FROM inscriptions i JOIN ecoles ec ON i.id_ecole = ec.id WHERE i.id_eleve = ? ORDER BY i.annee_academique DESC',
      [idEleve]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getByEcole = async (req, res) => {
  const { idEcole } = req.params;
  const { annee } = req.query;

  try {
    let query = 'SELECT i.*, e.prenom, e.nom, e.matricule_national FROM inscriptions i JOIN eleves e ON i.id_eleve = e.id WHERE i.id_ecole = ?'
    ;
    const params = [idEcole];

    if (annee) {
      query += ' AND i.annee_academique = ?';
      params.push(annee);
    }

    query += ' ORDER BY i.nom_classe, e.nom';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  const { id_eleve, id_ecole, nom_classe, annee_academique, date_inscription, dossier_complet } = req.body;

  if (!id_eleve || !id_ecole || !nom_classe || !annee_academique || !date_inscription) {
    return res.status(400).json({ message: 'Champs requis manquants' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO inscriptions (id_eleve, id_ecole, nom_classe, annee_academique, date_inscription, dossier_complet) VALUES (?, ?, ?, ?, ?, ?)',
      [id_eleve, id_ecole, nom_classe, annee_academique, date_inscription, dossier_complet || 1]
    );
    res.status(201).json({ id: result.insertId, message: 'Inscription créée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const allowedFields = ['nom_classe', 'annee_academique', 'date_inscription', 'dossier_complet'];
  const updates = req.body;
  const fields = Object.keys(updates).filter(f => allowedFields.includes(f));
  if (fields.length === 0) {
    return res.status(400).json({ message: 'Aucun champ valide à mettre à jour' });
  }
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);
  try {
    const [result] = await db.query(
      `UPDATE inscriptions SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Inscription non trouvée' });
    res.json({ message: 'Inscription mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM inscriptions WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Inscription non trouvée' });
    }
    res.json({ message: 'Inscription supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};