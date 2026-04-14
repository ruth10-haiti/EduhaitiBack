const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');
const statistiquesController = require('../controllers/statistiquesController');

// Routes protégées
router.use(auth);

// Stats graphiques (accessible par tous les rôles authentifiés)
router.get('/graphiques', statistiquesController.getGraphiques);
router.get('/activites', statistiquesController.getActivitesRecentes);

module.exports = router;