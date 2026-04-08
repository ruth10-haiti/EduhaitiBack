const express = require('express');
const router = express.Router();
const ecoleController = require('../controllers/ecoleController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

router.get('/', autoriser('admin', 'secretariat', 'bunexe', 'parent'), ecoleController.getAll);
router.get('/:id', autoriser('admin', 'secretariat', 'bunexe', 'parent'), ecoleController.getOne);
router.post('/', autoriser('admin'), ecoleController.create);
router.put('/:id', autoriser('admin'), ecoleController.update);
router.delete('/:id', autoriser('admin'), ecoleController.delete);

module.exports = router;