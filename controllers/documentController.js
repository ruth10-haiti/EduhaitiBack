const db = require('../config/db');

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
      'SELECT * FROM documents WHERE id_eleve = ? ORDER BY date_generation DESC',
      [idEleve]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  const { id_eleve, type_document, url_fichier } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO documents (id_eleve, type_document, url_fichier) VALUES (?, ?, ?)',
      [id_eleve, type_document, url_fichier]
    );
    res.status(201).json({ id: result.insertId, message: 'Document ajouté' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM documents WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }
    res.json({ message: 'Document supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};