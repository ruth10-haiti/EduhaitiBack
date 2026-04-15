const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Fonction pour générer un matricule unique
async function genererMatriculeUnique() {
  const annee = new Date().getFullYear();
  const prefixe = `EL-${annee}-`;
  
  // Compter le nombre d'élèves pour l'année en cours
  const [rows] = await db.query(
    'SELECT COUNT(*) as count FROM eleves WHERE matricule_national LIKE ?',
    [`${prefixe}%`]
  );
  
  const numero = String(rows[0].count + 1).padStart(4, '0');
  const matricule = `${prefixe}${numero}`;
  
  // Vérifier l'unicité (sécurité)
  const [existe] = await db.query(
    'SELECT id FROM eleves WHERE matricule_national = ?',
    [matricule]
  );
  
  if (existe.length > 0) {
    return genererMatriculeUnique(); // Re-générer si collision
  }
  
  return matricule;
}

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

  try {
    // Générer un matricule unique automatiquement
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

  try {
    // Ne pas modifier le matricule !
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
    // Supprimer d'abord les liens parent-élève
    await db.query('DELETE FROM parent_eleve WHERE id_eleve = ?', [id]);
    // Puis supprimer l'élève
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

// ========== NOUVELLE FONCTION : Lier un parent à un élève ==========
exports.lierParentEleve = async (req, res) => {
  const { id_eleve, email_parent, mot_de_passe_parent } = req.body;
  
  try {
    // Vérifier si l'élève existe
    const [eleve] = await db.query('SELECT * FROM eleves WHERE id = ?', [id_eleve]);
    if (eleve.length === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }
    
    // Vérifier si le parent existe déjà
    let [parent] = await db.query('SELECT * FROM utilisateurs WHERE email = ? AND role = "parent"', [email_parent]);
    let parentId;
    let motDePasseTemporaire;
    
    if (parent.length === 0) {
      // Créer un compte parent automatiquement
      motDePasseTemporaire = crypto.randomBytes(6).toString('hex');
      const hashedPassword = await bcrypt.hash(motDePasseTemporaire, 10);
      
      const [result] = await db.query(
        `INSERT INTO utilisateurs (email, nom, prenom, mot_de_passe, role, doit_changer_mdp, email_verifie)
         VALUES (?, ?, ?, ?, 'parent', true, true)`,
        [email_parent, eleve[0].nom, `Parent ${eleve[0].nom}`, hashedPassword]
      );
      parentId = result.insertId;
      
      // Envoyer l'email avec les identifiants
      await sendTemporaryPasswordEmail(email_parent, `Parent de ${eleve[0].prenom} ${eleve[0].nom}`, 'parent', motDePasseTemporaire);
    } else {
      parentId = parent[0].id;
    }
    
    // Créer le lien parent-élève
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

// ========== Récupérer le matricule d'un élève pour le parent ==========
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