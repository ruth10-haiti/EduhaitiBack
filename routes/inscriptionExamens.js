const express = require('express');
const router = express.Router();
const inscriptionExamenController = require('../controllers/inscriptionExamenController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

// ========== ROUTES EXISTANTES ==========
router.get('/examen/:idExamen', autoriser('admin', 'bunexe'), inscriptionExamenController.getByExamen);
router.get('/eleve/:idEleve', autoriser('admin', 'bunexe', 'parent'), inscriptionExamenController.getByEleve);
router.post('/', autoriser('admin', 'bunexe'), inscriptionExamenController.create);
router.put('/:id', autoriser('admin', 'bunexe'), inscriptionExamenController.update);
router.delete('/:id', autoriser('admin', 'bunexe'), inscriptionExamenController.delete);

// ========== NOUVELLES ROUTES POUR LE FRONTEND ==========

// GET toutes les inscriptions (pour BUNEXE)
router.get('/', autoriser('admin', 'bunexe'), inscriptionExamenController.getAll);

// PATCH valider une inscription
router.patch('/:id/valider', autoriser('admin', 'bunexe'), inscriptionExamenController.valider);

// PATCH rejeter une inscription
router.patch('/:id/rejeter', autoriser('admin', 'bunexe'), inscriptionExamenController.rejeter);

module.exports = router;