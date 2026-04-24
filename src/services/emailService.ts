import { ENV } from '../config/env';

/**
 * Email service interface
 * In development: logs to console
 * In production: can be configured to use SendGrid, AWS SES, etc.
 */

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${ENV.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const emailOptions: EmailOptions = {
    to: email,
    subject: 'Tetrix - Password Reset Request',
    text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Tetrix account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p style="color: #999; font-size: 14px; margin-top: 32px;">This link will expire in 1 hour.</p>
        <p style="color: #999; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  // In development or when EMAIL_SERVICE is 'console', just log
  if (!ENV.NODE_ENV || ENV.NODE_ENV === 'development' || process.env.EMAIL_SERVICE === 'console') {
    console.log('\n' + '='.repeat(80));
    console.log('📧 PASSWORD RESET EMAIL');
    console.log('='.repeat(80));
    console.log(`To: ${emailOptions.to}`);
    console.log(`Subject: ${emailOptions.subject}`);
    console.log(`\n${emailOptions.text}`);
    console.log('='.repeat(80) + '\n');
    return;
  }

  // In production, use configured email service
  if (process.env.EMAIL_SERVICE === 'sendgrid') {
    await sendViaSendGrid(emailOptions);
  } else {
    console.warn('No email service configured. Password reset email not sent.');
    console.log('Reset URL:', resetUrl);
  }
}

/**
 * Send email via SendGrid (if configured)
 * Note: Requires @sendgrid/mail to be installed
 */
async function sendViaSendGrid(options: EmailOptions): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured');
  }

  try {
    // Use require() to avoid TypeScript compilation errors
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sgMail = require('@sendgrid/mail');

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    await sgMail.send({
      to: options.to,
      from: process.env.FROM_EMAIL || 'noreply@tetrix.io',
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`✅ Password reset email sent to ${options.to}`);
  } catch (error) {
    console.error('Failed to send email via SendGrid:', error);
    throw error;
  }
}
