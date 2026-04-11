const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Routes publiques
// ✅ Ajout de la route /register (pour compatibilité avec votre frontend)
router.post('/register', authController.register);
router.post('/inscription', authController.inscription);
router.post('/connexion', authController.connexion);
router.post('/mot-de-passe-oublie', authController.motDePasseOublie);
router.post('/reinitialiser-mot-de-passe', authController.reinitialiserMotDePasse);

// Route de vérification d'email (GET)
router.get('/verifier-email/:token', authController.verifierEmail);

// Route protégée pour récupérer les infos de l'utilisateur connecté
router.get('/me', auth, authController.getMe);

module.exports = router;