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
      `SELECT t.*, 
              es.nom as ecole_source_nom, 
              ed.nom as ecole_destination_nom
       FROM transferts t
       JOIN ecoles es ON t.id_ecole_source = es.id
       JOIN ecoles ed ON t.id_ecole_destination = ed.id
       WHERE t.id_eleve = ?
       ORDER BY t.date_transfert DESC`,
      [idEleve]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getByEcoleSource = async (req, res) => {
  const { idEcole } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT t.*, e.prenom, e.nom, e.matricule_national, ed.nom as ecole_destination_nom
       FROM transferts t
       JOIN eleves e ON t.id_eleve = e.id
       JOIN ecoles ed ON t.id_ecole_destination = ed.id
       WHERE t.id_ecole_source = ?
       ORDER BY t.date_transfert DESC`,
      [idEcole]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getByEcoleDestination = async (req, res) => {
  const { idEcole } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT t.*, e.prenom, e.nom, e.matricule_national, es.nom as ecole_source_nom
       FROM transferts t
       JOIN eleves e ON t.id_eleve = e.id
       JOIN ecoles es ON t.id_ecole_source = es.id
       WHERE t.id_ecole_destination = ?
       ORDER BY t.date_transfert DESC`,
      [idEcole]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  const { id_eleve, id_ecole_source, id_ecole_destination, id_inscription, date_transfert, code_qr, statut } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO transferts 
       (id_eleve, id_ecole_source, id_ecole_destination, id_inscription, date_transfert, code_qr, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_eleve, id_ecole_source, id_ecole_destination, id_inscription || null, date_transfert, code_qr, statut || 'en cours']
    );
    res.status(201).json({ id: result.insertId, message: 'Transfert créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { statut, code_qr } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE transferts SET statut = ?, code_qr = ? WHERE id = ?',
      [statut, code_qr, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Transfert non trouvé' });
    }
    res.json({ message: 'Transfert mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM transferts WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Transfert non trouvé' });
    }
    res.json({ message: 'Transfert supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};