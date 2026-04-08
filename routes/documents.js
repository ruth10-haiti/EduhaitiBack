const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

router.get('/eleve/:idEleve', autoriser('admin', 'secretariat', 'parent'), documentController.getByEleve);
router.post('/', autoriser('admin', 'secretariat'), documentController.create);
router.delete('/:id', autoriser('admin', 'secretariat'), documentController.delete);

module.exports = router;