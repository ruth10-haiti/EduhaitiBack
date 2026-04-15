const express = require('express');
const router = express.Router();
const eleveController = require('../controllers/eleveController');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);

// Routes avec permissions
router.get('/', autoriser('admin', 'secretariat', 'bunexe'), eleveController.getAll);
router.get('/:id', autoriser('admin', 'secretariat', 'bunexe', 'parent'), eleveController.getOne);
router.post('/', autoriser('admin', 'secretariat'), eleveController.create);
router.put('/:id', autoriser('admin', 'secretariat'), eleveController.update);
router.delete('/:id', autoriser('admin'), eleveController.delete);

// Routes spécifiques pour les parents
router.get('/parent/enfants', autoriser('parent'), eleveController.getEnfantsParent);
router.get('/parent/matricules', autoriser('parent'), eleveController.getMatriculeByParent);

// Route pour lier un parent à un élève (admin/bunexe)
router.post('/:id/lier-parent', autoriser('admin', 'bunexe'), eleveController.lierParentEleve);

// Recherche par matricule
router.get('/search/matricule/:matricule', autoriser('admin', 'secretariat', 'bunexe'), eleveController.searchByMatricule);

module.exports = router;