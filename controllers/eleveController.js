const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Liste des classes pour validation (1ère AF à NS4 uniquement)
const classesValides = [
  '1ère AF', '2ème AF', '3ème AF', '4ème AF', '5ème AF', '6ème AF',
  '7ème AF', '8ème AF', '9ème AF',
  'NS1', 'NS2', 'NS3', 'NS4'
];

// Fonction pour générer un code aléatoire unique (Identité de l'élève)
async function genererMatriculeUnique() {
  // Générer un code aléatoire de 8 caractères alphanumériques majuscules
  const codeAleatoire = crypto.randomBytes(4).toString('hex').toUpperCase();
  
  // Vérifier l'unicité dans la base de données
  const [existe] = await db.query(
    'SELECT id FROM eleves WHERE matricule_national = ?',
    [codeAleatoire]
  );
  
  if (existe.length > 0) {
    // Si le code existe déjà (très rare), on recommence
    return genererMatriculeUnique();
  }
  
  return codeAleatoire;
}

// Calculer l'âge à partir de la date de naissance
function calculerAge(dateNaissance) {
  const today = new Date();
  const birthDate = new Date(dateNaissance);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Récupérer tous les élèves (admin, secretariat, bunexe)
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, ec.nom as nom_ecole 
      FROM eleves e
      LEFT JOIN ecoles ec ON e.id_ecole = ec.id
      ORDER BY e.nom, e.prenom
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer un élève par ID
exports.getOne = async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.role === 'parent') {
      const [link] = await db.query(
        'SELECT 1 FROM parent_eleve WHERE id_utilisateur = ? AND id_eleve = ?',
        [req.user.id, id]
      );
      if (link.length === 0) {
        return res.status(403).json({ message: 'Accès interdit à cet élève' });
      }
    }

    const [rows] = await db.query(`
      SELECT e.*, ec.nom as nom_ecole 
      FROM eleves e
      LEFT JOIN ecoles ec ON e.id_ecole = ec.id
      WHERE e.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Validation des champs
function validateEleveData(data) {
  const errors = [];

  // Validation du nom
  if (!data.nom || data.nom.trim().length < 2) {
    errors.push('Le nom doit contenir au moins 2 caractères');
  }
  if (data.nom && data.nom.length > 50) {
    errors.push('Le nom ne peut pas dépasser 50 caractères');
  }
  if (data.nom && !/^[a-zA-ZÀ-ÿ\s-]+$/.test(data.nom)) {
    errors.push('Le nom ne doit contenir que des lettres');
  }

  // Validation du prénom
  if (!data.prenom || data.prenom.trim().length < 2) {
    errors.push('Le prénom doit contenir au moins 2 caractères');
  }
  if (data.prenom && data.prenom.length > 50) {
    errors.push('Le prénom ne peut pas dépasser 50 caractères');
  }
  if (data.prenom && !/^[a-zA-ZÀ-ÿ\s-]+$/.test(data.prenom)) {
    errors.push('Le prénom ne doit contenir que des lettres');
  }

  // Validation de la date de naissance (âge entre 4 et 50 ans)
  if (data.date_naissance) {
    const dateNaissance = new Date(data.date_naissance);
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const dateMin = new Date('1900-01-01');
    
    // Calculer l'âge
    const age = calculerAge(data.date_naissance);

    if (isNaN(dateNaissance.getTime())) {
      errors.push('Date de naissance invalide');
    } else if (dateNaissance > aujourdhui) {
      errors.push('La date de naissance ne peut pas être dans le futur');
    } else if (age < 4) {
      errors.push('L\'élève doit avoir au moins 4 ans');
    } else if (age > 50) {
      errors.push('L\'élève ne peut pas avoir plus de 50 ans');
    } else if (dateNaissance < dateMin) {
      errors.push('Date de naissance invalide');
    }
  } else {
    errors.push('La date de naissance est requise');
  }

  // Validation de la classe
  if (!data.classe) {
    errors.push('Veuillez sélectionner une classe');
  } else if (!classesValides.includes(data.classe)) {
    errors.push(`Classe invalide. Valeurs acceptées: ${classesValides.join(', ')}`);
  }

  // Validation du téléphone parent (format haïtien)
  if (data.tel_parent) {
    const phoneClean = data.tel_parent.replace(/\s/g, '');
    if (!/^(\+509|509)?[0-9]{8}$/.test(phoneClean)) {
      errors.push('Téléphone invalide. Format: 12345678 ou +50912345678');
    }
  }

  // Validation de l'email
  if (data.email_parent && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_parent)) {
    errors.push('Email invalide');
  }

  // Validation de l'école
  if (!data.id_ecole) {
    errors.push('Veuillez sélectionner une école');
  }

  // Validation du lieu de naissance
  if (data.lieu_naissance && data.lieu_naissance.length > 100) {
    errors.push('Le lieu de naissance ne peut pas dépasser 100 caractères');
  }

  // Validation de l'adresse
  if (data.adresse && data.adresse.length > 255) {
    errors.push('L\'adresse ne peut pas dépasser 255 caractères');
  }

  return errors;
}

// Créer un élève avec génération automatique du matricule
exports.create = async (req, res) => {
  const {
    prenom,
    nom,
    date_naissance,
    lieu_naissance,
    sexe,
    id_ecole,
    classe,
    tel_parent,
    email_parent,
    adresse
  } = req.body;

  // Validation des champs requis
  if (!prenom || !nom) {
    return res.status(400).json({ message: 'Le prénom et le nom sont requis' });
  }

  // Validation complète
  const validationErrors = validateEleveData(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors.join(', ') });
  }

  try {
    // Générer un matricule unique plus sécurisé
    const matricule_national = await genererMatriculeUnique();
    
    console.log(`📝 Création élève: ${prenom} ${nom} - Matricule: ${matricule_national}`);

    const [result] = await db.query(
      `INSERT INTO eleves 
       (matricule_national, prenom, nom, date_naissance, lieu_naissance, 
        sexe, id_ecole, classe, tel_parent, email_parent, adresse)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [matricule_national, prenom, nom, date_naissance || null, lieu_naissance || null,
       sexe || 'M', id_ecole || null, classe || null, tel_parent || null, email_parent || null, adresse || null]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      matricule_national,
      message: 'Élève créé avec succès' 
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Erreur de génération du matricule, veuillez réessayer' });
    }
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour un élève
exports.update = async (req, res) => {
  const { id } = req.params;
  const {
    prenom, nom, date_naissance, lieu_naissance, sexe,
    id_ecole, classe, tel_parent, email_parent, adresse
  } = req.body;

  // Validation
  const validationErrors = validateEleveData(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors.join(', ') });
  }

  try {
    const [result] = await db.query(
      `UPDATE eleves SET 
        prenom = ?, nom = ?, date_naissance = ?, lieu_naissance = ?,
        sexe = ?, id_ecole = ?, classe = ?, tel_parent = ?, email_parent = ?, adresse = ?
       WHERE id = ?`,
      [prenom, nom, date_naissance || null, lieu_naissance || null,
       sexe || 'M', id_ecole || null, classe || null, tel_parent || null, email_parent || null, adresse || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }

    res.json({ message: 'Élève mis à jour avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un élève (admin seulement)
exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM parent_eleve WHERE id_eleve = ?', [id]);
    const [result] = await db.query('DELETE FROM eleves WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }
    res.json({ message: 'Élève supprimé avec succès' });
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

// Lier un parent à un élève
exports.lierParentEleve = async (req, res) => {
  const { id_eleve, email_parent } = req.body;
  
  // Validation email
  if (!email_parent || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_parent)) {
    return res.status(400).json({ message: 'Email invalide' });
  }
  
  try {
    const [eleve] = await db.query('SELECT * FROM eleves WHERE id = ?', [id_eleve]);
    if (eleve.length === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }
    
    let [parent] = await db.query('SELECT * FROM utilisateurs WHERE email = ? AND role = "parent"', [email_parent]);
    let parentId;
    let motDePasseTemporaire;
    
    if (parent.length === 0) {
      motDePasseTemporaire = crypto.randomBytes(6).toString('hex');
      const hashedPassword = await bcrypt.hash(motDePasseTemporaire, 10);
      
      const [result] = await db.query(
        `INSERT INTO utilisateurs (email, nom, prenom, mot_de_passe, role, doit_changer_mdp, email_verifie)
         VALUES (?, ?, ?, ?, 'parent', true, true)`,
        [email_parent, eleve[0].nom, `Parent ${eleve[0].nom}`, hashedPassword]
      );
      parentId = result.insertId;
      
      const { sendTemporaryPasswordEmail } = require('../services/emailService');
      await sendTemporaryPasswordEmail(email_parent, `Parent de ${eleve[0].prenom} ${eleve[0].nom}`, 'parent', motDePasseTemporaire);
    } else {
      parentId = parent[0].id;
    }
    
    await db.query(
      'INSERT INTO parent_eleve (id_utilisateur, id_eleve) VALUES (?, ?)',
      [parentId, id_eleve]
    );
    
    res.json({ 
      success: true, 
      message: parent.length === 0 ? 
        `Compte parent créé et lié à l'élève. Un email a été envoyé à ${email_parent}` :
        `Parent existant lié à l'élève avec succès`
    });
    
  } catch (err) {
    console.error('Erreur liaison parent-élève:', err);
    res.status(500).json({ message: 'Erreur lors de la liaison' });
  }
};

// Récupérer le matricule d'un élève pour le parent
exports.getMatriculeByParent = async (req, res) => {
  const parentId = req.user.id;
  
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.matricule_national, e.prenom, e.nom 
       FROM eleves e
       INNER JOIN parent_eleve pe ON e.id = pe.id_eleve
       WHERE pe.id_utilisateur = ?`,
      [parentId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};