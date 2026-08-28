/**
 * server/utils/mailer.js
 * Configures and sends transactional emails via SMTP
 */

import nodemailer from 'nodemailer';

let transporter = null;

export function getMailerConfig() {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || 'BabyCharts <noreply@babycharts.local>';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  const isConfigured = Boolean(host && user);

  return { host, port, user, pass, from, secure, isConfigured };
}

export function getTransporter() {
  const config = getMailerConfig();
  if (!config.isConfigured) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }
  return transporter;
}

/**
 * Sends a password reset email if SMTP is configured.
 * Returns true if sent, or false if SMTP is unconfigured or failed.
 */
export async function sendPasswordResetEmail(toEmail, resetToken, userName = 'Elternteil') {
  const config = getMailerConfig();
  const transport = getTransporter();

  const appUrl = process.env.APP_URL || 'http://localhost:3001';
  const resetLink = `${appUrl}/#reset-password?token=${encodeURIComponent(resetToken)}`;

  if (!transport) {
    console.log(
      `\x1b[33m[Mailer ${new Date().toISOString()}]\x1b[0m SMTP is not configured. Reset link for ${toEmail}: ${resetLink}`
    );
    return false;
  }

  try {
    await transport.sendMail({
      from: config.from,
      to: toEmail,
      subject: 'BabyCharts - Passwort zurücksetzen',
      text: `Hallo ${userName},\n\nSie haben das Zurücksetzen Ihres Passworts angefordert.\nKlicken Sie auf den folgenden Link, um Ihr neues Passwort festzulegen:\n\n${resetLink}\n\nDieser Link ist 1 Stunde lang gültig.\nFalls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #3b82f6;">BabyCharts - Passwort zurücksetzen</h2>
          <p>Hallo <strong>${userName}</strong>,</p>
          <p>Sie haben das Zurücksetzen Ihres Passworts angefordert.</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Neues Passwort festlegen</a>
          </div>
          <p style="color: #666; font-size: 14px;">Dieser Link ist <strong>1 Stunde</strong> lang gültig.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail einfach ignorieren.</p>
        </div>
      `,
    });
    console.log('[Mailer]', new Date().toISOString(), 'Password reset email sent to:', toEmail);
    return true;
  } catch (err) {
    console.error(
      '[Mailer Error]',
      new Date().toISOString(),
      'Failed to send email to:',
      toEmail,
      err?.message || err
    );
    return false;
  }
}
