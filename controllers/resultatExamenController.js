const db = require('../config/db');

// Récupérer tous les résultats (pour les stats)
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM resultat_examens');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer les résultats par examen
exports.getByExamen = async (req, res) => {
  const { idExamen } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT r.*, e.prenom as eleve_prenom, e.nom as eleve_nom, e.matricule_national, ec.nom as ecole_nom, e.classe
       FROM resultat_examens r
       JOIN eleves e ON r.id_eleve = e.id
       LEFT JOIN ecoles ec ON e.id_ecole = ec.id
       WHERE r.id_examen = ?`,
      [idExamen]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer par inscription (garder mais adapter)
exports.getByInscription = async (req, res) => {
  const { idInscription } = req.params;
  if (req.user.role === 'parent') {
    const [check] = await db.query(
      `SELECT 1 FROM inscription_examens ie
       JOIN parent_eleve pe ON ie.id_eleve = pe.id_eleve
       WHERE ie.id = ? AND pe.id_utilisateur = ?`,
      [idInscription, req.user.id]
    );
    if (check.length === 0) return res.status(403).json({ message: 'Accès interdit' });
  }
  try {
    const [rows] = await db.query(
      `SELECT re.*, se.nom_sujet, se.coefficient
       FROM resultat_examens re
       JOIN sujet_examens se ON re.id_sujet = se.id
       WHERE re.id_inscription = ?`,
      [idInscription]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un résultat (pour un élève et un examen)
exports.create = async (req, res) => {
  const { id_eleve, id_examen, note } = req.body;
  if (!id_eleve || !id_examen) {
    return res.status(400).json({ message: 'id_eleve et id_examen requis' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO resultat_examens (id_eleve, id_examen, note) VALUES (?, ?, ?)',
      [id_eleve, id_examen, note || 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Résultat créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour une note
exports.update = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  if (note === undefined) {
    return res.status(400).json({ message: 'Note requise' });
  }
  try {
    await db.query('UPDATE resultat_examens SET note = ? WHERE id = ?', [note, id]);
    res.json({ message: 'Note mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un résultat
exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM resultat_examens WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Résultat non trouvé' });
    res.json({ message: 'Résultat supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Publier tous les résultats d'un examen
exports.publier = async (req, res) => {
  const { idExamen } = req.params;
  try {
    await db.query('UPDATE resultat_examens SET publie = true WHERE id_examen = ?', [idExamen]);
    res.json({ message: 'Résultats publiés' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};