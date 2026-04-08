const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateurController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

// Toutes les routes nécessitent une authentification
router.use(auth);

// Routes accessibles à admin uniquement
router.get('/', autoriser('admin'), utilisateurController.getAll);
router.post('/', autoriser('admin'), utilisateurController.create);
router.put('/:id', autoriser('admin'), utilisateurController.update);
router.delete('/:id', autoriser('admin'), utilisateurController.delete);

// Routes pour le secrétariat (lecture seule)
router.get('/ecole/:idEcole', autoriser('admin', 'secretariat'), utilisateurController.getByEcole);

// Route pour l'utilisateur connecté (tous les rôles)
router.put('/profil', utilisateurController.updateProfile);

module.exports = router;