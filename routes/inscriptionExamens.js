const express = require('express');
const router = express.Router();
const inscriptionExamenController = require('../controllers/inscriptionExamenController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

router.get('/examen/:idExamen', autoriser('admin', 'bunexe'), inscriptionExamenController.getByExamen);
router.get('/eleve/:idEleve', autoriser('admin', 'bunexe', 'parent'), inscriptionExamenController.getByEleve);
router.post('/', autoriser('admin', 'bunexe'), inscriptionExamenController.create);
router.put('/:id', autoriser('admin', 'bunexe'), inscriptionExamenController.update);
router.delete('/:id', autoriser('admin', 'bunexe'), inscriptionExamenController.delete);

module.exports = router;