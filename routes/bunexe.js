const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

// Toutes les routes nécessitent authentification + rôle bunexe
router.use(auth);
router.use(autoriser('bunexe'));

// Dashboard route
router.get('/dashboard', (req, res) => {
  res.json({ message: 'Dashboard Bunexe - À implémenter' });
});

// Gestion des examens
router.get('/examens', (req, res) => {
  res.json({ message: 'Liste des examens - À implémenter' });
});

// Gestion des inscriptions aux examens
router.get('/inscriptions', (req, res) => {
  res.json({ message: 'Liste des inscriptions - À implémenter' });
});

// Publication des résultats
router.get('/resultats', (req, res) => {
  res.json({ message: 'Gestion des résultats - À implémenter' });
});

module.exports = router;