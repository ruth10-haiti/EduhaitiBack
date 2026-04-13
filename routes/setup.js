const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setupController');

// Route pour vérifier si un admin existe
router.get('/check-admin', setupController.checkAdminExists);

// Route pour créer le premier admin (sans auth car aucun admin n'existe)
router.post('/create-admin', setupController.createFirstAdmin);

module.exports = router;