// backend/routes/secretariat.js (VERSION CORRIGÉE - À REMPLACER)
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);
router.use(autoriser('secretariat'));

// ========== DASHBOARD ==========
router.get('/dashboard', async (req, res) => {
  try {
    const [inscriptionsAttente] = await db.query('SELECT COUNT(*) as total FROM inscriptions WHERE statut = "en_attente"');
    const [eleves] = await db.query('SELECT COUNT(*) as total FROM eleves');
    const [inscriptions] = await db.query('SELECT COUNT(*) as total FROM inscriptions');
    
    res.json({
      inscriptionsAttente: inscriptionsAttente[0].total,
      totalEleves: eleves[0].total,
      totalInscriptions: inscriptions[0].total
    });
  } catch (error) {
    console.error('❌ Erreur dashboard secretariat:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== ÉLÈVES ==========
router.get('/eleves', async (req, res) => {
  try {
    const [eleves] = await db.query(`
      SELECT e.*, ec.nom as ecole_nom
      FROM eleves e
      LEFT JOIN ecoles ec ON e.id_ecole = ec.id
      ORDER BY e.created_at DESC
    `);
    res.json(eleves);
  } catch (error) {
    console.error('❌ Erreur liste eleves:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/eleves', async (req, res) => {
  const { nom, prenom, date_naissance, lieu_naissance, id_ecole, classe } = req.body;
  
  try {
    const [result] = await db.query(
      `INSERT INTO eleves (nom, prenom, date_naissance, lieu_naissance, id_ecole, classe) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nom, prenom, date_naissance, lieu_naissance, id_ecole, classe]
    );
    
    res.json({ success: true, id: result.insertId, message: 'Élève créé avec succès' });
  } catch (error) {
    console.error('❌ Erreur creation eleve:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/eleves/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, date_naissance, lieu_naissance, id_ecole, classe } = req.body;
  
  try {
    await db.query(
      `UPDATE eleves SET nom = ?, prenom = ?, date_naissance = ?, lieu_naissance = ?, id_ecole = ?, classe = ? WHERE id = ?`,
      [nom, prenom, date_naissance, lieu_naissance, id_ecole, classe, id]
    );
    
    res.json({ success: true, message: 'Élève modifié avec succès' });
  } catch (error) {
    console.error('❌ Erreur modification eleve:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/eleves/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query('DELETE FROM inscriptions WHERE id_eleve = ?', [id]);
    await db.query('DELETE FROM eleves WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Élève supprimé avec succès' });
  } catch (error) {
    console.error('❌ Erreur suppression eleve:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== INSCRIPTIONS ==========
router.get('/inscriptions', async (req, res) => {
  try {
    const [inscriptions] = await db.query(`
      SELECT i.*, e.nom as eleve_nom, e.prenom as eleve_prenom, ec.nom as ecole_nom
      FROM inscriptions i
      JOIN eleves e ON i.id_eleve = e.id
      JOIN ecoles ec ON e.id_ecole = ec.id
      ORDER BY i.date_inscription DESC
    `);
    res.json(inscriptions);
  } catch (error) {
    console.error('❌ Erreur liste inscriptions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/inscriptions/:id/valider', async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query('UPDATE inscriptions SET statut = "valide" WHERE id = ?', [id]);
    res.json({ success: true, message: 'Inscription validée' });
  } catch (error) {
    console.error('❌ Erreur validation inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/inscriptions/:id/refuser', async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query('UPDATE inscriptions SET statut = "refuse" WHERE id = ?', [id]);
    res.json({ success: true, message: 'Inscription refusée' });
  } catch (error) {
    console.error('❌ Erreur refus inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== DOCUMENTS ==========
router.get('/documents', async (req, res) => {
  try {
    const [documents] = await db.query(`
      SELECT d.*, e.nom as eleve_nom, e.prenom as eleve_prenom
      FROM documents d
      JOIN eleves e ON d.id_eleve = e.id
      ORDER BY d.date_upload DESC
    `);
    res.json(documents);
  } catch (error) {
    console.error('❌ Erreur liste documents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;