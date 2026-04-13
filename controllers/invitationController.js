const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendTemporaryPasswordEmail } = require('../services/emailService');

// Création directe d'un utilisateur par l'admin
exports.createUserByAdmin = async (req, res) => {
    const { email, nom, prenom, role, id_ecole } = req.body;
    
    console.log('📝 [createUserByAdmin] Données reçues:', { email, nom, prenom, role, id_ecole });
    
    // Vérifier que l'admin a le droit de créer ce rôle
    const allowedRoles = ['admin', 'secretariat', 'bunexe'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Rôle non autorisé' });
    }
    
    try {
        // Vérifier si l'email existe déjà
        const [existing] = await db.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        
        // Générer un mot de passe temporaire sécurisé (8 caractères)
        const temporaryPassword = crypto.randomBytes(4).toString('hex'); // ex: "a3f5e2d1"
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        
        // Créer l'utilisateur
        const [result] = await db.query(
            `INSERT INTO utilisateurs 
             (nom, prenom, email, mot_de_passe, role, id_ecole, email_verifie, doit_changer_mdp) 
             VALUES (?, ?, ?, ?, ?, ?, true, true)`,
            [nom, prenom, email, hashedPassword, role, id_ecole || null]
        );
        
        console.log(`✅ Utilisateur créé avec ID: ${result.insertId}`);
        
        // Envoyer l'email avec le mot de passe temporaire (via Brevo)
        const emailSent = await sendTemporaryPasswordEmail(email, `${prenom} ${nom}`, role, temporaryPassword);
        
        if (!emailSent.success) {
            console.warn(`⚠️ Email non envoyé à ${email}:`, emailSent.error);
            // On ne bloque pas la création si l'email échoue
        }
        
        res.json({ 
            success: true, 
            message: `Compte ${role} créé avec succès. Un email a été envoyé à ${email}`,
            userId: result.insertId,
            emailSent: emailSent.success
        });
        
    } catch (error) {
        console.error('❌ Erreur création:', error);
        res.status(500).json({ error: 'Erreur lors de la création du compte' });
    }
};

// Liste des utilisateurs (pour l'admin)
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, nom, prenom, email, role, id_ecole, created_at, derniere_connexion, doit_changer_mdp
             FROM utilisateurs 
             ORDER BY created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('❌ Erreur liste:', error);
        res.status(500).json({ error: 'Erreur lors du chargement' });
    }
};

// Supprimer un utilisateur
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Empêcher de supprimer son propre compte
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
        }
        
        // Vérifier que l'utilisateur existe
        const [user] = await db.query('SELECT id FROM utilisateurs WHERE id = ?', [id]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        await db.query('DELETE FROM utilisateurs WHERE id = ?', [id]);
        res.json({ success: true, message: 'Utilisateur supprimé' });
    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
};

// Changer son mot de passe (première connexion ou volontaire)
exports.changePassword = async (req, res) => {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
    const userId = req.user.id;
    
    if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 6) {
        return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }
    
    try {
        const [users] = await db.query('SELECT mot_de_passe, doit_changer_mdp FROM utilisateurs WHERE id = ?', [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const user = users[0];
        
        // Vérifier l'ancien mot de passe (sauf si c'est la première connexion)
        const isFirstLogin = user.doit_changer_mdp === 1;
        
        if (!isFirstLogin) {
            const isValid = await bcrypt.compare(ancien_mot_de_passe, user.mot_de_passe);
            if (!isValid) {
                return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
            }
        }
        
        const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe, 10);
        await db.query(
            'UPDATE utilisateurs SET mot_de_passe = ?, doit_changer_mdp = false WHERE id = ?',
            [hashedPassword, userId]
        );
        
        res.json({ success: true, message: 'Mot de passe modifié avec succès' });
        
    } catch (error) {
        console.error('❌ Erreur changement MDP:', error);
        res.status(500).json({ error: 'Erreur lors du changement' });
    }
};

// Récupérer les écoles (pour le formulaire admin)
exports.getEcoles = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, nom FROM ecoles ORDER BY nom');
        res.json(rows);
    } catch (error) {
        console.error('❌ Erreur chargement écoles:', error);
        res.status(500).json({ error: 'Erreur lors du chargement des écoles' });
    }
};