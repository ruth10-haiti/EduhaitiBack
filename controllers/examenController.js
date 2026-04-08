const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM examens ORDER BY annee_session DESC, nom');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getOne = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM examens WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Examen non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  const { nom, annee_session, debut_inscription, fin_inscription } = req.body;
  if (!nom || !annee_session) {
    return res.status(400).json({ message: 'Nom et année requis' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO examens (nom, annee_session, debut_inscription, fin_inscription) VALUES (?, ?, ?, ?)',
      [nom, annee_session, debut_inscription, fin_inscription]
    );
    res.status(201).json({ id: result.insertId, message: 'Examen créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { nom, annee_session, debut_inscription, fin_inscription } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE examens SET nom = ?, annee_session = ?, debut_inscription = ?, fin_inscription = ? WHERE id = ?',
      [nom, annee_session, debut_inscription, fin_inscription, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Examen non trouvé' });
    }
    res.json({ message: 'Examen mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM examens WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Examen non trouvé' });
    }
    res.json({ message: 'Examen supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};