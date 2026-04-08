const db = require('../config/db');

exports.getByExamen = async (req, res) => {
  const { idExamen } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM sujet_examens WHERE id_examen = ? ORDER BY nom_sujet',
      [idExamen]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  const { id_examen, nom_sujet, coefficient } = req.body;
  if (!id_examen || !nom_sujet || coefficient === undefined) {
    return res.status(400).json({ message: 'Champs requis manquants' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO sujet_examens (id_examen, nom_sujet, coefficient) VALUES (?, ?, ?)',
      [id_examen, nom_sujet, coefficient]
    );
    res.status(201).json({ id: result.insertId, message: 'Sujet créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { nom_sujet, coefficient } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE sujet_examens SET nom_sujet = ?, coefficient = ? WHERE id = ?',
      [nom_sujet, coefficient, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Sujet non trouvé' });
    }
    res.json({ message: 'Sujet mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM sujet_examens WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Sujet non trouvé' });
    }
    res.json({ message: 'Sujet supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};