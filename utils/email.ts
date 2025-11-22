// Email Sending Utility
// Uses backend API to send emails via SMTP

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Backend API URL - Update this with your deployed backend URL
// For local development: 'http://localhost:3000'
// For production: 'https://your-backend-domain.com'
const EMAIL_API_URL = process.env.EXPO_PUBLIC_EMAIL_API_URL || 'http://localhost:3000';

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  // Try to send via backend API first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout (reduced from 5)
    
    const response = await fetch(`${EMAIL_API_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email sent successfully via backend');
      return true;
    } else {
      // API returned error, but don't throw - use fallback
      const errorData = await response.json().catch(() => ({}));
      console.warn('Backend API error, using fallback');
    }
  } catch (error: any) {
    // Backend not available or network error - use silent fallback
    // Don't log errors to avoid cluttering console
  }

  // Silent fallback for development - allows OTP flow to continue
  // Email details are logged in OTP screen console for testing
  if (__DEV__) {
    // In dev mode, return true so OTP flow continues
    // OTP will be shown in console for testing
    return true;
  }
  
  // In production, return false if backend is not available
  return false;
};

// Send OTP email
export const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
  const emailOptions: EmailOptions = {
    to: email,
    subject: 'Peregrine - Email Verification Code',
    text: `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #228B22;">Peregrine - Email Verification</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f0f8f0; border: 2px solid #228B22; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #228B22; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };
  
  return await sendEmail(emailOptions);
};

