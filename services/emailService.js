const Brevo = require('@getbrevo/brevo');
require('dotenv').config();

// Initialisation de Brevo
let apiInstance = null;

if (process.env.BREVO_API_KEY) {
    apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
    console.log('✅ Brevo initialisé avec succès');
} else {
    console.warn('⚠️ BREVO_API_KEY non configurée, mode simulation activé');
}

// Email de vérification d'inscription
const sendVerificationEmail = async (to, token, nom) => {
    // Mode simulation si pas configuré
    if (!apiInstance || process.env.DISABLE_EMAILS === 'true') {
        console.log(`📧 [SIMULATION] Email de vérification à ${to}`);
        console.log(`   Lien: ${process.env.FRONTEND_URL}/verifier-email/${token}`);
        return { success: true, simulated: true };
    }

    const verificationLink = `${process.env.FRONTEND_URL}/verifier-email/${token}`;
    
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = '✅ Confirme ton inscription sur EduHaiti';
    sendSmtpEmail.to = [{ email: to, name: nom }];
    sendSmtpEmail.sender = { 
        name: 'EduHaiti', 
        email: process.env.EMAIL_FROM || 'ruthdieuveuille09@gmail.com' 
    };
    sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c3e50;">Bienvenue sur EduHaiti, ${nom} !</h1>
            <p>Merci de t'être inscrit sur notre plateforme de suivi scolaire.</p>
            
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;">Pour activer ton compte et accéder à ton espace personnel, clique sur le bouton ci-dessous :</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" 
                   style="background-color: #3498db; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Activer mon compte
                </a>
            </div>
            
            <p>Ce lien est valable <strong>24 heures</strong>.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            
            <p style="color: #7f8c8d; font-size: 12px;">
                Si tu n'as pas créé de compte sur EduHaiti, ignore cet email.<br>
                Pour toute question, contacte-nous à support@eduhaiti.com
            </p>
        </div>
    `;

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`✅ Email de vérification envoyé à ${to} via Brevo`);
        return { success: true, messageId: data.messageId };
    } catch (error) {
        console.error('❌ Erreur envoi email Brevo:', error.message);
        return { success: false, error: error.message };
    }
};

// Email de bienvenue après vérification
const sendWelcomeEmail = async (to, nom, role) => {
    if (!apiInstance || process.env.DISABLE_EMAILS === 'true') {
        console.log(`📧 [SIMULATION] Email de bienvenue à ${to}`);
        return { success: true, simulated: true };
    }

    const dashboardLink = `${process.env.FRONTEND_URL}/${role === 'parent' ? 'dashboard-parent' : 'dashboard'}`;
    
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = '🎉 Bienvenue sur EduHaiti - Ton compte est activé !';
    sendSmtpEmail.to = [{ email: to, name: nom }];
    sendSmtpEmail.sender = { 
        name: 'EduHaiti', 
        email: process.env.EMAIL_FROM || 'ruthdieuveuille09@gmail.com' 
    };
    sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c3e50;">Félicitations, ${nom} !</h1>
            <p>Ton compte a été activé avec succès.</p>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #155724;">
                    ✅ Ton adresse email a été vérifiée. Tu peux maintenant accéder à ton espace personnel.
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardLink}" 
                   style="background-color: #27ae60; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Accéder à mon tableau de bord
                </a>
            </div>
            
            <p>Ton rôle : <strong>${role === 'parent' ? 'Parent' : role === 'admin' ? 'Administrateur' : role}</strong></p>
            
            <hr style="margin: 30px 0;">
            <p style="color: #7f8c8d;">L'équipe EduHaiti</p>
        </div>
    `;

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`✅ Email de bienvenue envoyé à ${to} via Brevo`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur envoi email bienvenue:', error.message);
        return { success: false, error: error.message };
    }
};

// Email de réinitialisation mot de passe
const sendResetPasswordEmail = async (to, token, nom) => {
    if (!apiInstance || process.env.DISABLE_EMAILS === 'true') {
        console.log(`📧 [SIMULATION] Email reset à ${to}`);
        return { success: true, simulated: true };
    }

    const resetLink = `${process.env.FRONTEND_URL}/reinitialiser-mot-de-passe/${token}`;
    
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = '🔐 Réinitialisation de ton mot de passe EduHaiti';
    sendSmtpEmail.to = [{ email: to, name: nom }];
    sendSmtpEmail.sender = { 
        name: 'EduHaiti', 
        email: process.env.EMAIL_FROM || 'ruthdieuveuille09@gmail.com' 
    };
    sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c3e50;">Réinitialisation du mot de passe</h1>
            <p>Bonjour ${nom},</p>
            <p>Nous avons reçu une demande de réinitialisation de ton mot de passe.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background-color: #e74c3c; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Réinitialiser mon mot de passe
                </a>
            </div>
            
            <p>Ce lien est valable <strong>1 heure</strong>.</p>
            
            <p style="color: #7f8c8d;">Si tu n'as pas demandé cette réinitialisation, ignore cet email.</p>
        </div>
    `;

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`✅ Email de réinitialisation envoyé à ${to} via Brevo`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erreur envoi reset:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendVerificationEmail,
    sendWelcomeEmail,
    sendResetPasswordEmail
};