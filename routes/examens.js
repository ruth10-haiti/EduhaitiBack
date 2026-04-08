const express = require('express');
const router = express.Router();
const examenController = require('../controllers/examenController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

router.get('/', autoriser('admin', 'secretariat', 'bunexe'), examenController.getAll);
router.get('/:id', autoriser('admin', 'secretariat', 'bunexe'), examenController.getOne);
router.post('/', autoriser('admin', 'bunexe'), examenController.create);
router.put('/:id', autoriser('admin', 'bunexe'), examenController.update);
router.delete('/:id', autoriser('admin', 'bunexe'), examenController.delete);

module.exports = router;