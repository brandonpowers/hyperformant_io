const nodemailer = require('nodemailer');

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter based on environment
const createTransporter = () => {
  // Use SMTP (Inbucket) for local development
  if (process.env.NODE_ENV === 'development' && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '2500'),
      secure: false, // Inbucket doesn't use TLS
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }
  
  // Use Resend for production (when we implement it)
  if (process.env.RESEND_API_KEY) {
    // TODO: Implement Resend integration
    console.warn('Resend integration not yet implemented, falling back to console logging');
    return null;
  }
  
  // Fallback to console logging
  return null;
};

export const sendEmail = async ({ to, subject, html, text }: EmailOptions) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    // Fallback to console logging
    console.log('=== Email (No transporter configured) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text || html}`);
    console.log('=======================================');
    return;
  }
  
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Hyperformant" <noreply@hyperformant.io>',
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      html,
    });
    
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

// Email templates
export const emailTemplates = {
  verificationCode: (code: string) => ({
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Thank you for signing up! Please use the following verification code to verify your email address:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      </div>
    `,
    text: `Your verification code is: ${code}\n\nThis code will expire in 15 minutes.`,
  }),
  
  passwordReset: (resetLink: string) => ({
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>You requested to reset your password. Click the link below to create a new password:</p>
        <div style="margin: 20px 0;">
          <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetLink}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
      </div>
    `,
    text: `Reset your password by visiting this link: ${resetLink}\n\nThis link will expire in 1 hour.`,
  }),
};