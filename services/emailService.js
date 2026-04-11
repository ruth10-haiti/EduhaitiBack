const nodemailer = require('nodemailer');
require('dotenv').config();

// ✅ CORRECTION: Configuration explicite pour Render.com
const createTransporter = () => {
  // Vérifier si les variables sont présentes
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('⚠️ Variables d\'email non configurées');
    return null;
  }

  // Configuration optimisée pour Render.com
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,                    // ✅ Port 587 (pas 465)
    secure: false,                // ✅ false pour port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    family: 4,                    // ✅ FORCE IPv4 (CRITIQUE pour Render)
    tls: {
      rejectUnauthorized: false   // Évite les erreurs de certificat
    },
    connectionTimeout: 30000,     // 30 secondes
    greetingTimeout: 30000,
    socketTimeout: 30000
  });
};

// Email de vérification d'inscription
const sendVerificationEmail = async (to, token, nom) => {
  const transporter = createTransporter();
  
  // Mode développement/sans email
  if (!transporter) {
    console.log(`📧 [SIMULATION] Email de vérification à ${to}`);
    console.log(`   Lien: ${process.env.FRONTEND_URL}/verifier-email/${token}`);
    return { success: true, simulated: true };
  }

  const verificationLink = `${process.env.FRONTEND_URL}/verifier-email/${token}`;
  
  const mailOptions = {
    from: `"EduHaiti" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: '✅ Confirme ton inscription sur EduHaiti',
    html: `
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
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de vérification envoyé à ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error.message);
    return { success: false, error: error.message };
  }
};

// Email de bienvenue après vérification
const sendWelcomeEmail = async (to, nom, role) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log(`📧 [SIMULATION] Email de bienvenue à ${to}`);
    return { success: true, simulated: true };
  }

  const dashboardLink = `${process.env.FRONTEND_URL}/${role === 'parent' ? 'dashboard-parent' : 'dashboard'}`;
  
  const mailOptions = {
    from: `"EduHaiti" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: '🎉 Bienvenue sur EduHaiti - Ton compte est activé !',
    html: `
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
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de bienvenue envoyé à ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email bienvenue:', error.message);
    return { success: false, error: error.message };
  }
};

// Email de réinitialisation mot de passe
const sendResetPasswordEmail = async (to, token, nom) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log(`📧 [SIMULATION] Email reset à ${to}`);
    return { success: true, simulated: true };
  }

  const resetLink = `${process.env.FRONTEND_URL}/reinitialiser-mot-de-passe/${token}`;
  
  const mailOptions = {
    from: `"EduHaiti" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: '🔐 Réinitialisation de ton mot de passe EduHaiti',
    html: `
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
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de réinitialisation envoyé à ${to}`);
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