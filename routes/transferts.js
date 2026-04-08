const express = require('express');
const router = express.Router();
const transfertController = require('../controllers/transfertController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

router.get('/eleve/:idEleve', autoriser('admin', 'secretariat', 'parent'), transfertController.getByEleve);
router.get('/ecole/source/:idEcole', autoriser('admin', 'secretariat'), transfertController.getByEcoleSource);
router.get('/ecole/destination/:idEcole', autoriser('admin', 'secretariat'), transfertController.getByEcoleDestination);
router.post('/', autoriser('admin', 'secretariat'), transfertController.create);
router.put('/:id', autoriser('admin', 'secretariat'), transfertController.update);
router.delete('/:id', autoriser('admin'), transfertController.delete);

module.exports = router;