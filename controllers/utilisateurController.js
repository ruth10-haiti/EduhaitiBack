const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Récupérer tous les utilisateurs (admin seulement)
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nom, prenom, email, role, id_ecole, email_verifie, date_inscription, derniere_connexion FROM utilisateurs'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un utilisateur (admin)
exports.create = async (req, res) => {
  const { nom, prenom, email, mot_de_passe, role, id_ecole } = req.body;

  if (!nom || !prenom || !email || !mot_de_passe || !role) {
    return res.status(400).json({ message: 'Champs requis manquants' });
  }

  try {
    // Vérifier email unique
    const [existing] = await db.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    const [result] = await db.query(
      'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, id_ecole, email_verifie) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nom, prenom, email, hashedPassword, role, id_ecole || null, true] // Admin crée des comptes déjà vérifiés
    );

    res.status(201).json({ id: result.insertId, message: 'Utilisateur créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour un utilisateur (admin)
exports.update = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, email, role, id_ecole } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE utilisateurs SET nom = ?, prenom = ?, email = ?, role = ?, id_ecole = ? WHERE id = ?',
      [nom, prenom, email, role, id_ecole || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Utilisateur mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un utilisateur (admin)
exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM utilisateurs WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer les utilisateurs d'une école (admin, secretariat)
exports.getByEcole = async (req, res) => {
  const { idEcole } = req.params;

  // Le secrétariat ne peut voir que les utilisateurs de son école
  if (req.user.role === 'secretariat' && req.user.id_ecole !== parseInt(idEcole)) {
    return res.status(403).json({ message: 'Accès interdit à cette école' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, nom, prenom, email, role, id_ecole FROM utilisateurs WHERE id_ecole = ?',
      [idEcole]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour son propre profil
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { nom, prenom, email } = req.body;

  try {
    await db.query(
      'UPDATE utilisateurs SET nom = ?, prenom = ?, email = ? WHERE id = ?',
      [nom, prenom, email, userId]
    );
    res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};