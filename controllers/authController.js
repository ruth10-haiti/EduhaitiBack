const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Resend } = require('resend');

// Initialisation de Resend avec ta clé API (stockée dans .env)
const resend = new Resend(process.env.RESEND_API_KEY);

// Adresse d'envoi (doit être vérifiée dans Resend)
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@ton-domaine.com';

// ---------- Fonctions d'envoi d'email ----------

// Email de vérification d'inscription
const sendVerificationEmail = async (to, token) => {
  const verificationLink = `${process.env.FRONTEND_URL}/verifier-email/${token}`;
  try {
    const { data, error } = await resend.emails.send({
      from: `"EduHaiti" <${FROM_EMAIL}>`,
      to: [to],
      subject: 'Vérifie ton adresse email',
      html: `
        <h2>Bienvenue sur EduHaiti !</h2>
        <p>Merci de t’être inscrit. Pour activer ton compte, clique sur le lien ci-dessous :</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>Ce lien expire dans 24 heures.</p>
        <p>Si tu n’as pas créé de compte, ignore cet email.</p>
      `,
    });
    if (error) throw new Error(error.message);
    console.log(`Email de vérification envoyé à ${to} (ID: ${data?.id})`);
  } catch (err) {
    console.error('Erreur sendVerificationEmail:', err);
    throw new Error("Impossible d'envoyer l'email de vérification");
  }
};

// Email de réinitialisation du mot de passe
const sendResetEmail = async (to, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/reinitialiser-mot-de-passe/${token}`;
  try {
    const { data, error } = await resend.emails.send({
      from: `"EduHaiti" <${FROM_EMAIL}>`,
      to: [to],
      subject: 'Réinitialisation de ton mot de passe',
      html: `
        <h2>Réinitialisation du mot de passe</h2>
        <p>Tu as demandé à réinitialiser ton mot de passe. Clique sur le lien ci-dessous :</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si tu n’es pas à l’origine de cette demande, ignore cet email.</p>
      `,
    });
    if (error) throw new Error(error.message);
    console.log(`Email de réinitialisation envoyé à ${to} (ID: ${data?.id})`);
  } catch (err) {
    console.error('Erreur sendResetEmail:', err);
    throw new Error("Impossible d'envoyer l'email de réinitialisation");
  }
};

// ---------- Inscription ----------
exports.inscription = async (req, res) => {
  const { nom, prenom, email, mot_de_passe } = req.body;

  if (!nom || !prenom || !email || !mot_de_passe) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  try {
    // Vérifier si l'email existe déjà
    const [rows] = await db.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // Insérer l'utilisateur
    const [result] = await db.query(
      'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, email_verifie) VALUES (?, ?, ?, ?, ?, ?)',
      [nom, prenom, email, hashedPassword, 'parent', false]
    );

    // Générer un token de vérification d'email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await db.query(
      'INSERT INTO verification_email (id_utilisateur, token, expire_a) VALUES (?, ?, ?)',
      [result.insertId, verificationToken, expireDate]
    );

    // Envoyer l'email de vérification
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: 'Inscription réussie. Veuillez vérifier votre email pour activer votre compte.'
    });
  } catch (err) {
    console.error('Erreur inscription:', err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
};

// ---------- Vérification d'email ----------
exports.verifierEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT id_utilisateur FROM verification_email WHERE token = ? AND expire_a > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).send('Lien de vérification invalide ou expiré.');
    }

    const userId = rows[0].id_utilisateur;

    // Marquer l'email comme vérifié
    await db.query('UPDATE utilisateurs SET email_verifie = true WHERE id = ?', [userId]);

    // Supprimer le token utilisé
    await db.query('DELETE FROM verification_email WHERE token = ?', [token]);

    // Rediriger vers la page de connexion du frontend
    res.redirect(`${process.env.FRONTEND_URL}/connexion?verified=true`);
  } catch (err) {
    console.error('Erreur vérification email:', err);
    res.status(500).send('Erreur lors de la vérification de l\'email.');
  }
};

// ---------- Connexion ----------
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
      return res.status(403).json({ message: 'Veuillez vérifier votre email avant de vous connecter' });
    }

    await db.query('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        id_ecole: user.id_ecole
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      token,
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

// ---------- Mot de passe oublié ----------
exports.motDePasseOublie = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email requis' });
  }

  try {
    const [rows] = await db.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' });
    }

    const userId = rows[0].id;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expireDate = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await db.query('DELETE FROM reinitialisation_mdp WHERE id_utilisateur = ?', [userId]);
    await db.query(
      'INSERT INTO reinitialisation_mdp (id_utilisateur, token, expire_a) VALUES (?, ?, ?)',
      [userId, resetToken, expireDate]
    );

    // Envoi de l'email
    await sendResetEmail(email, resetToken);

    res.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' });
  } catch (err) {
    console.error('Erreur mot de passe oublié:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ---------- Réinitialisation du mot de passe ----------
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

// ---------- Récupérer l'utilisateur connecté ----------
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