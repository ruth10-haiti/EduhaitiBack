const express = require('express');
const cors = require("cors");
require('dotenv').config();

const app = express();

// ========== 1. CONFIGURATION CORS AMÉLIORÉE ==========
// Liste des origines autorisées (ajoutez vos domaines frontend)
const allowedOrigins = [
  'https://eduhaiti-wjx6.onrender.com',    
  'https://edu-haiti.vercel.app',      
  'http://localhost:5173',                  // Développement local (Vite)
  'http://localhost:5000'                   // Pour tester localement
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permettre les requêtes sans origin (comme les appels serveur à serveur)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`❌ Origine bloquée par CORS : ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,            // Permet l'envoi de cookies / tokens
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('/*', cors(corsOptions)); 

// ========== 2. MIDDLEWARE DE LOGING ==========
// Affiche chaque requête reçue (très utile pour voir si le backend est contacté)
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});

// ========== 3. MIDDLEWARE STANDARDS ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== 4. CONNEXION À LA BASE DE DONNÉES ==========
const pool = require('./config/db');

// Tester la connexion DB au démarrage
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Erreur de connexion à la base de données:', err.message);
    process.exit(1); // Arrête le serveur si la DB est inaccessible
  } else {
    console.log('✅ Connecté à la base de données MySQL');
    connection.release();
  }
});

// ========== 5. ROUTES ==========
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

// Route de test (santé)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: "EduHaiti est en marche!" });
});

app.get('/', (req, res) => {
  res.send('Bienvenue sur l’API EduHaiti.');
});

// ========== 6. GESTION DES ERREURS 404 ==========
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// ========== 7. GESTION DES ERREURS GLOBALES ==========
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ========== 8. DÉMARRAGE ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌐 CORS autorisé pour : ${allowedOrigins.join(', ')}`);
});