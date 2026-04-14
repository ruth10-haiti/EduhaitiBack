const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

// Toutes les routes nécessitent authentification + rôle secretariat
router.use(auth);
router.use(autoriser('secretariat'));

// Dashboard route
router.get('/dashboard', (req, res) => {
  res.json({ message: 'Dashboard Secrétariat - À implémenter' });
});

// Gestion des élèves
router.get('/eleves', (req, res) => {
  res.json({ message: 'Liste des élèves - À implémenter' });
});

// Gestion des inscriptions
router.get('/inscriptions', (req, res) => {
  res.json({ message: 'Liste des inscriptions - À implémenter' });
});

// Gestion des documents
router.get('/documents', (req, res) => {
  res.json({ message: 'Gestion des documents - À implémenter' });
});

module.exports = router;