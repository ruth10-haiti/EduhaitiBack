const express = require('express');
const router = express.Router();
const resultatExamenController = require('../controllers/resultatExamenController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

router.get('/inscription/:idInscription', autoriser('admin', 'bunexe', 'parent'), resultatExamenController.getByInscription);
router.post('/', autoriser('admin', 'bunexe'), resultatExamenController.create);
router.put('/:id', autoriser('admin', 'bunexe'), resultatExamenController.update);
router.delete('/:id', autoriser('admin', 'bunexe'), resultatExamenController.delete);

module.exports = router;