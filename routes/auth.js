const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Routes publiques
router.post('/register', authController.register);
router.post('/inscription', authController.register); // Alias
router.post('/connexion', authController.connexion);
router.post('/mot-de-passe-oublie', authController.motDePasseOublie);
router.post('/reinitialiser-mot-de-passe', authController.reinitialiserMotDePasse);
router.post('/renvoyer-verification', authController.renvoyerVerification);

// Route de vérification d'email (GET)
router.get('/verifier-email/:token', authController.verifierEmail);

// Route protégée
router.get('/me', auth, authController.getMe);

// ========== CHANGER SON MOT DE PASSE (accessible à tous les utilisateurs connectés) ==========
router.post('/changer-mot-de-passe', auth, async (req, res) => {
  const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
  const userId = req.user.id;
  const db = require('../config/db');
  const bcrypt = require('bcryptjs');
  
  if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
  }
  
  try {
    const [users] = await db.query('SELECT mot_de_passe, doit_changer_mdp FROM utilisateurs WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const user = users[0];
    const isFirstLogin = user.doit_changer_mdp === 1;
    
    if (!isFirstLogin) {
      const isValid = await bcrypt.compare(ancien_mot_de_passe, user.mot_de_passe);
      if (!isValid) {
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      }
    }
    
    const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe, 10);
    await db.query(
      'UPDATE utilisateurs SET mot_de_passe = ?, doit_changer_mdp = false WHERE id = ?',
      [hashedPassword, userId]
    );
    
    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
    
  } catch (error) {
    console.error('❌ Erreur changement MDP:', error);
    res.status(500).json({ error: 'Erreur lors du changement' });
  }
});

module.exports = router;