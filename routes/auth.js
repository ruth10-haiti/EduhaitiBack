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

module.exports = router;