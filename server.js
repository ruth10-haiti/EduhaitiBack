const express = require('express');
const cors = require("cors");
require('dotenv').config();

const app = express();

const port = 5000;


// Middleware pour analyser le JSON des requêtes
app.use(cors());
app.use(express.json());


// Connexion DB
const pool = require('./config/db');
app.use(express.urlencoded({ extended: true }));

// Import des routes
const authRoutes = require('./routes/auth');
const utilisateurRoutes = require('./routes/utilisateurs');
const eleveRoutes = require('./routes/eleves');
const ecoleRoutes = require('./routes/ecoles');
const inscriptionRoutes = require('./routes/inscriptions');
const examenRoutes = require('./routes/examens');
const sujetExamenRoutes = require('./routes/sujetExamens');
const inscriptionExamenRoutes = require('./routes/inscriptionExamens');
const resultatExamenRoutes = require('./routes/resultatExamens');
const documentRoutes = require('./routes/documents');
const transfertRoutes = require('./routes/transferts');

// Utilisation des routes
app.use('/api/auth', authRoutes);
app.use('/api/utilisateurs', utilisateurRoutes);
app.use('/api/eleves', eleveRoutes);
app.use('/api/ecoles', ecoleRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/examens', examenRoutes);
app.use('/api/sujets-examens', sujetExamenRoutes);
app.use('/api/inscriptions-examens', inscriptionExamenRoutes);
app.use('/api/resultats-examens', resultatExamenRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/transferts', transfertRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: "EduHaiti est en marche!" });
});

// app.get('/', (req, res) => {
//   res.json({ message: 'Bienvenue sur l’API EduHaiti.' });
// });
app.get('/', (req, res) => {
  res.send('Bienvenue sur l’API EduHaiti.');
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
 console.log(`Serveur démarré sur le port ${PORT}`);
});