const db = require('../config/db');

// Récupérer tous les élèves (admin, secretariat, bunexe)
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM eleves ORDER BY nom, prenom');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer un élève par ID (vérification parent : seulement si lié)
exports.getOne = async (req, res) => {
  const { id } = req.params;

  try {
    // Si l'utilisateur est un parent, vérifier qu'il a le droit de voir cet élève
    if (req.user.role === 'parent') {
      const [link] = await db.query(
        'SELECT 1 FROM parent_eleve WHERE id_utilisateur = ? AND id_eleve = ?',
        [req.user.id, id]
      );
      if (link.length === 0) {
        return res.status(403).json({ message: 'Accès interdit à cet élève' });
      }
    }

    const [rows] = await db.query('SELECT * FROM eleves WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un élève (admin, secretariat)
exports.create = async (req, res) => {
  const {
    matricule_national,
    prenom,
    nom,
    date_de_naissance,
    lieu_de_naissance,
    tel_parent,
    email_parent,
    adresse,
    url_photo
  } = req.body;

  if (!matricule_national || !prenom || !nom) {
    return res.status(400).json({ message: 'Matricule, prénom et nom requis' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO eleves 
       (matricule_national, prenom, nom, date_de_naissance, lieu_de_naissance, tel_parent, email_parent, adresse, url_photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [matricule_national, prenom, nom, date_de_naissance, lieu_de_naissance, tel_parent, email_parent, adresse, url_photo]
    );
    res.status(201).json({ id: result.insertId, message: 'Élève créé' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Ce matricule national existe déjà' });
    }
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour un élève
exports.update = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Construire la requête dynamiquement
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const [result] = await db.query(
      `UPDATE eleves SET ${setClause} WHERE id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }

    res.json({ message: 'Élève mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un élève (admin seulement)
exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM eleves WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }
    res.json({ message: 'Élève supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer les enfants d'un parent connecté
exports.getEnfantsParent = async (req, res) => {
  const parentId = req.user.id;

  try {
    const [rows] = await db.query(
      `SELECT e.* FROM eleves e
       INNER JOIN parent_eleve pe ON e.id = pe.id_eleve
       WHERE pe.id_utilisateur = ?
       ORDER BY e.nom, e.prenom`,
      [parentId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Rechercher par matricule national
exports.searchByMatricule = async (req, res) => {
  const { matricule } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT * FROM eleves WHERE matricule_national LIKE ?',
      [`%${matricule}%`]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};