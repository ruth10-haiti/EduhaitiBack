// backend/routes/bunexe.js (VERSION CORRIGÉE - À REMPLACER)
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const autoriser = require('../middleware/role');

router.use(auth);
router.use(autoriser('bunexe'));

// ========== DASHBOARD ==========
router.get('/dashboard', async (req, res) => {
  try {
    const [examens] = await db.query('SELECT COUNT(*) as total FROM examens');
    const [inscriptions] = await db.query('SELECT COUNT(*) as total FROM inscription_examens');
    const [resultats] = await db.query(`
      SELECT COUNT(CASE WHEN statut = 'ADMIS' THEN 1 END) as admis, COUNT(*) as total FROM resultats
    `);
    
    const tauxReussite = resultats[0].total > 0 
      ? Math.round((resultats[0].admis / resultats[0].total) * 100) 
      : 0;
    
    res.json({
      examensActifs: examens[0].total,
      totalInscriptions: inscriptions[0].total,
      tauxReussite: tauxReussite
    });
  } catch (error) {
    console.error('❌ Erreur dashboard bunexe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== EXAMENS ==========
router.get('/examens', async (req, res) => {
  try {
    const [examens] = await db.query(`
      SELECT e.*, COUNT(ie.id) as total_inscriptions
      FROM examens e
      LEFT JOIN inscription_examens ie ON e.id = ie.id_examen
      GROUP BY e.id
      ORDER BY e.date_creation DESC
    `);
    res.json(examens);
  } catch (error) {
    console.error('❌ Erreur liste examens:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/examens', async (req, res) => {
  const { nom, annee, date_debut, date_fin } = req.body;
  
  if (!nom || !annee || !date_debut || !date_fin) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  
  try {
    const [result] = await db.query(
      `INSERT INTO examens (nom, annee, date_debut, date_fin, date_creation) 
       VALUES (?, ?, ?, ?, NOW())`,
      [nom, annee, date_debut, date_fin]
    );
    
    res.json({ success: true, id: result.insertId, message: 'Examen créé avec succès' });
  } catch (error) {
    console.error('❌ Erreur création examen:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/examens/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, annee, date_debut, date_fin } = req.body;
  
  try {
    await db.query(
      `UPDATE examens SET nom = ?, annee = ?, date_debut = ?, date_fin = ? WHERE id = ?`,
      [nom, annee, date_debut, date_fin, id]
    );
    
    res.json({ success: true, message: 'Examen modifié avec succès' });
  } catch (error) {
    console.error('❌ Erreur modification examen:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/examens/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.query('DELETE FROM inscription_examens WHERE id_examen = ?', [id]);
    await db.query('DELETE FROM examens WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Examen supprimé avec succès' });
  } catch (error) {
    console.error('❌ Erreur suppression examen:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== INSCRIPTIONS EXAMENS ==========
router.get('/inscriptions', async (req, res) => {
  try {
    const [inscriptions] = await db.query(`
      SELECT ie.*, e.nom as examen_nom, el.nom as eleve_nom, el.prenom as eleve_prenom
      FROM inscription_examens ie
      JOIN examens e ON ie.id_examen = e.id
      JOIN eleves el ON ie.id_eleve = el.id
      ORDER BY ie.date_inscription DESC
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
    await db.query('UPDATE inscription_examens SET statut = "valide" WHERE id = ?', [id]);
    res.json({ success: true, message: 'Inscription validée' });
  } catch (error) {
    console.error('❌ Erreur validation inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== RÉSULTATS ==========
router.get('/resultats', async (req, res) => {
  try {
    const [resultats] = await db.query(`
      SELECT r.*, e.nom as examen_nom, el.nom as eleve_nom, el.prenom as eleve_prenom
      FROM resultats r
      JOIN examens e ON r.id_examen = e.id
      JOIN eleves el ON r.id_eleve = el.id
      ORDER BY r.date_publication DESC
    `);
    res.json(resultats);
  } catch (error) {
    console.error('❌ Erreur liste resultats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/resultats', async (req, res) => {
  const { id_examen, id_eleve, note, statut } = req.body;
  
  try {
    await db.query(
      `INSERT INTO resultats (id_examen, id_eleve, note, statut, date_publication)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE note = ?, statut = ?, date_publication = NOW()`,
      [id_examen, id_eleve, note, statut, note, statut]
    );
    
    res.json({ success: true, message: 'Résultat publié' });
  } catch (error) {
    console.error('❌ Erreur publication résultat:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;