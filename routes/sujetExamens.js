const express = require('express');
const router = express.Router();
const sujetExamenController = require('../controllers/sujetExamenController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

router.get('/examen/:idExamen', autoriser('admin', 'secretariat', 'bunexe', 'parent'), sujetExamenController.getByExamen);
router.post('/', autoriser('admin', 'bunexe'), sujetExamenController.create);
router.put('/:id', autoriser('admin', 'bunexe'), sujetExamenController.update);
router.delete('/:id', autoriser('admin', 'bunexe'), sujetExamenController.delete);

module.exports = router;