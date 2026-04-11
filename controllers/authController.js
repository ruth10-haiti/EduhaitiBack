const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail, sendWelcomeEmail, sendResetPasswordEmail } = require('../services/emailService');

// ========== INSCRIPTION ==========
exports.register = async (req, res) => {
  console.log('📝 [register] Corps reçu:', req.body);
  
  try {
    let { nom, prenom, email, password, mot_de_passe, role } = req.body;
    
    const finalPassword = password || mot_de_passe;
    let finalNom = nom;
    if (prenom && nom) {
      finalNom = `${prenom} ${nom}`;
    }
    
    console.log('📊 Données traitées:', { nom: finalNom, email, role });
    
    if (!finalNom || !email || !finalPassword) {
      return res.status(400).json({ error: 'Nom, email et mot de passe sont requis' });
    }
    
    if (finalPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    
    const [rows] = await db.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    
    const hashedPassword = await bcrypt.hash(finalPassword, 10);
    
    let nomPart = finalNom;
    let prenomPart = '';
    const nameParts = finalNom.split(' ');
    if (nameParts.length > 1) {
      prenomPart = nameParts[0];
      nomPart = nameParts.slice(1).join(' ');
    } else {
      prenomPart = finalNom;
      nomPart = '';
    }
    
    const [result] = await db.query(
      'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, email_verifie) VALUES (?, ?, ?, ?, ?, ?)',
      [nomPart, prenomPart, email, hashedPassword, role || 'parent', false]
    );
    
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await db.query(
      'INSERT INTO verification_email (id_utilisateur, token, expire_a) VALUES (?, ?, ?)',
      [result.insertId, verificationToken, expireDate]
    );
    
    // Envoyer l'email de vérification
    await sendVerificationEmail(email, verificationToken, finalNom);
    
    res.status(201).json({
      success: true,
      message: 'Inscription réussie ! Un email de vérification a été envoyé.',
      userId: result.insertId
    });
    
  } catch (err) {
    console.error('❌ Erreur register:', err);
    res.status(500).json({ error: 'Erreur lors de l\'inscription', details: err.message });
  }
};

// ========== VÉRIFICATION EMAIL ==========
exports.verifierEmail = async (req, res) => {
  const { token } = req.params;
  
  try {
    const [rows] = await db.query(
      `SELECT v.id_utilisateur, u.nom, u.prenom, u.email, u.role 
       FROM verification_email v 
       JOIN utilisateurs u ON v.id_utilisateur = u.id 
       WHERE v.token = ? AND v.expire_a > NOW() AND u.email_verifie = false`,
      [token]
    );
    
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Lien de vérification invalide ou expiré' });
    }
    
    const userId = rows[0].id_utilisateur;
    const userEmail = rows[0].email;
    const userNom = `${rows[0].prenom} ${rows[0].nom}`;
    const userRole = rows[0].role;
    
    await db.query('UPDATE utilisateurs SET email_verifie = true WHERE id = ?', [userId]);
    await db.query('DELETE FROM verification_email WHERE token = ?', [token]);
    
    // Envoyer email de bienvenue
    await sendWelcomeEmail(userEmail, userNom, userRole);
    
    // Rediriger vers le frontend avec paramètre de succès
    res.redirect(`${process.env.FRONTEND_URL}/connexion?verified=true`);
    
  } catch (error) {
    console.error('❌ Erreur vérification:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
};

// ========== CONNEXION ==========
exports.connexion = async (req, res) => {
  const { email, mot_de_passe } = req.body;

  if (!email || !mot_de_passe) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, nom, prenom, email, mot_de_passe, role, id_ecole, email_verifie FROM utilisateurs WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const user = rows[0];

    const isValidPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    if (!user.email_verifie) {
      return res.status(403).json({ 
        message: 'Veuillez vérifier votre email avant de vous connecter',
        needVerification: true,
        email: user.email
      });
    }

    await db.query('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?', [user.id]);

    // Déterminer la redirection selon le rôle
    let redirectUrl = '/dashboard';
    switch(user.role) {
      case 'admin': redirectUrl = '/admin'; break;
      case 'parent': redirectUrl = '/parent'; break;
      case 'bunexe': redirectUrl = '/bunexe'; break;
      case 'secretariat': redirectUrl = '/secretariat'; break;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, id_ecole: user.id_ecole },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      token,
      redirectUrl,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        id_ecole: user.id_ecole
      }
    });
  } catch (err) {
    console.error('Erreur connexion:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
};

// ========== RENVOYER EMAIL DE VÉRIFICATION ==========
exports.renvoyerVerification = async (req, res) => {
  const { email } = req.body;
  
  try {
    const [users] = await db.query(
      'SELECT id, nom, prenom, email FROM utilisateurs WHERE email = ? AND email_verifie = false',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'Email déjà vérifié ou inexistant' });
    }
    
    const user = users[0];
    
    await db.query('DELETE FROM verification_email WHERE id_utilisateur = ?', [user.id]);
    
    const newToken = crypto.randomBytes(32).toString('hex');
    const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await db.query(
      'INSERT INTO verification_email (id_utilisateur, token, expire_a) VALUES (?, ?, ?)',
      [user.id, newToken, expireDate]
    );
    
    await sendVerificationEmail(email, newToken, `${user.prenom} ${user.nom}`);
    
    res.json({ success: true, message: 'Nouvel email de vérification envoyé' });
    
  } catch (error) {
    console.error('❌ Erreur renvoi:', error);
    res.status(500).json({ error: 'Erreur lors du renvoi' });
  }
};

// ========== MOT DE PASSE OUBLIÉ ==========
exports.motDePasseOublie = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email requis' });
  }

  try {
    const [rows] = await db.query('SELECT id, nom, prenom FROM utilisateurs WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' });
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expireDate = new Date(Date.now() + 60 * 60 * 1000);

    await db.query('DELETE FROM reinitialisation_mdp WHERE id_utilisateur = ?', [user.id]);
    await db.query(
      'INSERT INTO reinitialisation_mdp (id_utilisateur, token, expire_a) VALUES (?, ?, ?)',
      [user.id, resetToken, expireDate]
    );

    await sendResetPasswordEmail(email, resetToken, `${user.prenom} ${user.nom}`);

    res.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' });
  } catch (err) {
    console.error('Erreur mot de passe oublié:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== RÉINITIALISATION MOT DE PASSE ==========
exports.reinitialiserMotDePasse = async (req, res) => {
  const { token, nouveau_mot_de_passe } = req.body;

  if (!token || !nouveau_mot_de_passe) {
    return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id_utilisateur FROM reinitialisation_mdp WHERE token = ? AND expire_a > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }

    const userId = rows[0].id_utilisateur;
    const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe, 10);

    await db.query('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?', [hashedPassword, userId]);
    await db.query('DELETE FROM reinitialisation_mdp WHERE token = ?', [token]);

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    console.error('Erreur réinitialisation:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== RÉCUPÉRER UTILISATEUR CONNECTÉ ==========
exports.getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nom, prenom, email, role, id_ecole, email_verifie, derniere_connexion FROM utilisateurs WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur getMe:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};