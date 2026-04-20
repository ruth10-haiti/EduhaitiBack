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

// Récupérer les résultats d’un examen spécifique (via l’id_examen)
exports.getByExamen = async (req, res) => {
  const { idExamen } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT 
          r.*,
          e.prenom AS eleve_prenom,
          e.nom AS eleve_nom,
          e.matricule_national,
          ec.nom AS ecole_nom,
          e.classe,
          s.nom_sujet,
          s.coefficient
       FROM resultat_examens r
       JOIN inscription_examens i ON r.id_inscription = i.id
       JOIN eleves e ON i.id_eleve = e.id
       LEFT JOIN ecoles ec ON e.id_ecole = ec.id
       JOIN sujet_examens s ON r.id_sujet = s.id
       WHERE i.id_examen = ?`,
      [idExamen]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer les résultats d’une inscription spécifique (pour un élève / un examen)
exports.getByInscription = async (req, res) => {
  const { idInscription } = req.params;

  // Vérification des droits pour les parents (si nécessaire)
  if (req.user && req.user.role === 'parent') {
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
       WHERE re.id_inscription = ?`,
      [idInscription]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un résultat (pour une inscription et un sujet donnés)
exports.create = async (req, res) => {
  // Maintenir la compatibilité : on peut recevoir id_inscription + id_sujet
  // ou alors id_eleve + id_examen (dans ce cas on cherche l’inscription correspondante)
  let { id_inscription, id_sujet, note, id_eleve, id_examen } = req.body;

  if (!id_inscription && id_eleve && id_examen) {
    // Chercher l’inscription correspondante
    const [inscrit] = await db.query(
      'SELECT id FROM inscription_examens WHERE id_eleve = ? AND id_examen = ?',
      [id_eleve, id_examen]
    );
    if (inscrit.length === 0) {
      return res.status(404).json({ message: 'Aucune inscription trouvée pour cet élève et cet examen' });
    }
    id_inscription = inscrit[0].id;
  }

  if (!id_inscription || !id_sujet) {
    return res.status(400).json({ message: 'id_inscription et id_sujet sont requis' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO resultat_examens (id_inscription, id_sujet, note) VALUES (?, ?, ?)',
      [id_inscription, id_sujet, note !== undefined ? note : 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Résultat créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour une note (par l’id du résultat)
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
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Résultat non trouvé' });
    }
    res.json({ message: 'Résultat supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Publier tous les résultats d’un examen (nécessite d’avoir une colonne "publie" dans resultat_examens)
// Si tu n’as pas cette colonne, soit tu l’ajoutes, soit tu ne publies pas via cette table.
// Exemple d’ajout de colonne : ALTER TABLE resultat_examens ADD COLUMN publie BOOLEAN DEFAULT FALSE;
exports.publier = async (req, res) => {
  const { idExamen } = req.params;
  try {
    // On met à jour tous les résultats liés à cet examen via inscription_examens
    await db.query(
      `UPDATE resultat_examens r
       JOIN inscription_examens i ON r.id_inscription = i.id
       SET r.publie = TRUE
       WHERE i.id_examen = ?`,
      [idExamen]
    );
    res.json({ message: 'Résultats publiés' });
  } catch (err) {
    console.error(err);
    // Si la colonne 'publie' n’existe pas, on renvoie une erreur explicite
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ 
        message: 'La colonne "publie" n’existe pas dans la table resultat_examens. Ajoutez-la avec ALTER TABLE.' 
      });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
};