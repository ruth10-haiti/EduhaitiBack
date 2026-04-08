const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ecoles ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getOne = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM ecoles WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'École non trouvée' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  const { nom, adresse, telephone } = req.body;
  if (!nom) {
    return res.status(400).json({ message: 'Le nom est requis' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO ecoles (nom, adresse, telephone) VALUES (?, ?, ?)',
      [nom, adresse, telephone]
    );
    res.status(201).json({ id: result.insertId, message: 'École créée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { nom, adresse, telephone } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE ecoles SET nom = ?, adresse = ?, telephone = ? WHERE id = ?',
      [nom, adresse, telephone, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'École non trouvée' });
    }
    res.json({ message: 'École mise à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM ecoles WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'École non trouvée' });
    }
    res.json({ message: 'École supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};