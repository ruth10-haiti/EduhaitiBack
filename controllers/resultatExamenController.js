const db = require('../config/db');

exports.getByInscription = async (req, res) => {
  const { idInscription } = req.params;

  // Vérification parent : l'inscription doit appartenir à un de ses enfants
  if (req.user.role === 'parent') {
    const [check] = await db.query(
      `SELECT 1 FROM inscription_examens ie
       JOIN parent_eleve pe ON ie.id_eleve = pe.id_eleve
       WHERE ie.id = ? AND pe.id_utilisateur = ?`,
      [idInscription, req.user.id]
    );
    if (check.length === 0) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
  }

  try {
    const [rows] = await db.query(
      `SELECT re.*, se.nom_sujet, se.coefficient
       FROM resultat_examens re
       JOIN sujet_examens se ON re.id_sujet = se.id
       WHERE re.id_inscription = ?
       ORDER BY se.nom_sujet`,
      [idInscription]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  const { id_inscription, id_sujet, note } = req.body;
  if (!id_inscription || !id_sujet || note === undefined) {
    return res.status(400).json({ message: 'Champs requis manquants' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO resultat_examens (id_inscription, id_sujet, note) VALUES (?, ?, ?)',
      [id_inscription, id_sujet, note]
    );
    res.status(201).json({ id: result.insertId, message: 'Note enregistrée' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Une note existe déjà pour cette matière' });
    }
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE resultat_examens SET note = ? WHERE id = ?',
      [note, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Résultat non trouvé' });
    }
    res.json({ message: 'Note mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM resultat_examens WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Résultat non trouvé' });
    }
    res.json({ message: 'Résultat supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};