const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendTemporaryPasswordEmail } = require('../services/emailService');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');
const dashboardController = require('../controllers/dashboardController');

// Toutes ces routes nécessitent d'être admin
router.use(auth);
router.use(autoriser('admin'));

router.get('/dashboard', dashboardController.getAdminStats);

// ========== CRÉER UN UTILISATEUR (création directe) ==========
router.post('/utilisateurs/creer', async (req, res) => {
  const { email, nom, prenom, role, id_ecole } = req.body;
  
  console.log('📝 Création utilisateur:', { email, nom, prenom, role });
  
  const allowedRoles = ['admin', 'secretariat', 'bunexe'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Rôle non autorisé' });
  }
  
  try {
    const [existing] = await db.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    
    const temporaryPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    
    const [result] = await db.query(
      `INSERT INTO utilisateurs 
       (nom, prenom, email, mot_de_passe, role, id_ecole, email_verifie, doit_changer_mdp) 
       VALUES (?, ?, ?, ?, ?, ?, true, true)`,
      [nom, prenom, email, hashedPassword, role, id_ecole || null]
    );
    
    await sendTemporaryPasswordEmail(email, `${prenom} ${nom}`, role, temporaryPassword);
    
    res.json({ 
      success: true, 
      message: `Compte ${role} créé avec succès. Un email a été envoyé à ${email}`,
      userId: result.insertId
    });
    
  } catch (error) {
    console.error('❌ Erreur création:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

// ========== LISTER LES UTILISATEURS ==========
router.get('/utilisateurs', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nom, prenom, email, role, id_ecole, 
              COALESCE(created_at, date_inscription) as created_at,
              derniere_connexion,
              COALESCE(doit_changer_mdp, false) as doit_changer_mdp
       FROM utilisateurs 
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Erreur liste:', error);
    res.status(500).json({ error: 'Erreur lors du chargement' });
  }
});

// ========== SUPPRIMER UN UTILISATEUR ==========
router.delete('/utilisateurs/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    
    const [user] = await db.query('SELECT id FROM utilisateurs WHERE id = ?', [id]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    await db.query('DELETE FROM utilisateurs WHERE id = ?', [id]);
    res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ========== LISTER LES ÉCOLES ==========
router.get('/ecoles', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nom FROM ecoles ORDER BY nom');
    res.json(rows);
  } catch (error) {
    console.error('❌ Erreur chargement écoles:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des écoles' });
  }
});

module.exports = router;