const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../services/emailService');

// Vérifier si un admin existe déjà
exports.checkAdminExists = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id FROM utilisateurs WHERE role = "admin" LIMIT 1');
    res.json({ exists: rows.length > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Créer le premier admin (accessible seulement si aucun admin n'existe)
exports.createFirstAdmin = async (req, res) => {
  const { nom, prenom, email, mot_de_passe } = req.body;
  
  if (!nom || !prenom || !email || !mot_de_passe) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  
  if (mot_de_passe.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }
  
  try {
    // Vérifier qu'aucun admin n'existe
    const [existingAdmin] = await db.query('SELECT id FROM utilisateurs WHERE role = "admin" LIMIT 1');
    if (existingAdmin.length > 0) {
      return res.status(403).json({ error: 'Un administrateur existe déjà. Utilisez la connexion normale.' });
    }
    
    // Vérifier si l'email est déjà utilisé
    const [existingUser] = await db.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    
    // Créer l'admin (email non vérifié pour l'instant)
    const [result] = await db.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, email_verifie, doit_changer_mdp) 
       VALUES (?, ?, ?, ?, 'admin', false, false)`,
      [nom, prenom, email, hashedPassword]
    );
    
    // Générer un token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await db.query(
      'INSERT INTO verification_email (id_utilisateur, token, expire_a) VALUES (?, ?, ?)',
      [result.insertId, verificationToken, expireDate]
    );
    
    // Envoyer l'email de vérification
    await sendVerificationEmail(email, verificationToken, `${prenom} ${nom}`);
    
    res.status(201).json({
      success: true,
      message: 'Administrateur créé avec succès ! Un email de vérification a été envoyé.',
      email: email
    });
    
  } catch (error) {
    console.error('❌ Erreur création admin:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
};