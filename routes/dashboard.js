const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');
const dashboardController = require('../controllers/dashboardController');

// Toutes les routes nécessitent authentification
router.use(auth);

// Routes ADMIN uniquement
router.get('/admin', autoriser('admin'), dashboardController.getAdminStats);

// Routes BUNEXE uniquement
router.get('/bunexe', autoriser('bunexe'), dashboardController.getBunexeStats);

// Routes SECRETARIAT uniquement
router.get('/secretariat', autoriser('secretariat'), dashboardController.getSecretariatStats);

module.exports = router;