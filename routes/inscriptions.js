const express = require('express');
const router = express.Router();
const inscriptionController = require('../controllers/inscriptionController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

router.get('/', autoriser('admin', 'secretariat'), inscriptionController.getAll);
router.get('/eleve/:idEleve', autoriser('admin', 'secretariat', 'parent'), inscriptionController.getByEleve);
router.get('/ecole/:idEcole', autoriser('admin', 'secretariat'), inscriptionController.getByEcole);
router.post('/', autoriser('admin', 'secretariat'), inscriptionController.create);
router.put('/:id', autoriser('admin', 'secretariat'), inscriptionController.update);
router.delete('/:id', autoriser('admin'), inscriptionController.delete);

module.exports = router;