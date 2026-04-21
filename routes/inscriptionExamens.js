const express = require('express');
const router = express.Router();
const inscriptionExamenController = require('../controllers/inscriptionExamenController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

// ========== ROUTES EXISTANTES ==========
router.get('/examen/:idExamen', autoriser('admin', 'bunexe', 'secretariat'), inscriptionExamenController.getByExamen);
router.get('/eleve/:idEleve', autoriser('admin', 'bunexe', 'parent', 'secretariat'), inscriptionExamenController.getByEleve);
router.post('/', autoriser('admin', 'bunexe', 'secretariat'), inscriptionExamenController.create);
router.put('/:id', autoriser('admin', 'bunexe', 'secretariat'), inscriptionExamenController.update);
router.delete('/:id', autoriser('admin', 'bunexe', 'secretariat'), inscriptionExamenController.delete);

// POST soumettre la liste d'élèves (secrétariat)
router.post('/soumettre', autoriser('admin', 'secretariat'), inscriptionExamenController.soumettreListe);

// ========== NOUVELLES ROUTES POUR LE FRONTEND ==========

// GET toutes les inscriptions (pour BUNEXE)
router.get('/', autoriser('admin', 'bunexe'), inscriptionExamenController.getAll);

// PATCH valider une inscription
router.patch('/:id/valider', autoriser('admin', 'bunexe'), inscriptionExamenController.valider);

// PATCH rejeter une inscription
router.patch('/:id/rejeter', autoriser('admin', 'bunexe'), inscriptionExamenController.rejeter);

module.exports = router;