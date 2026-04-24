import { Request, Response } from 'express';
import * as passwordResetService from '../services/passwordResetService';
import * as emailService from '../services/emailService';

/**
 * Request a password reset
 * Sends an email with a reset token
 */
export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    // Always return success even if email doesn't exist (security best practice)
    // This prevents email enumeration attacks
    const token = await passwordResetService.createResetToken(email);

    if (token) {
      // Send email with reset token
      await emailService.sendPasswordResetEmail(email, token);
    }

    // Always return success
    res.status(200).json({
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
}

/**
 * Reset password using token
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body;

    // Verify token and update password
    const success = await passwordResetService.consumeResetToken(token, newPassword);

    if (!success) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    res.status(200).json({
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}
