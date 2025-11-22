// OTP Utility Functions
// Generate 5-digit random OTP
export const generateOTP = (): string => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Store OTP temporarily (in-memory for now, can use AsyncStorage for persistence)
const otpStore: Map<string, { otp: string; expiresAt: number; email: string }> = new Map();

// Store OTP with expiration (5 minutes)
export const storeOTP = (email: string, otp: string): void => {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(email, { otp, expiresAt, email });
  console.log(`OTP stored for ${email}: ${otp} (expires in 5 minutes)`);
};

// Verify OTP
export const verifyOTP = (email: string, otp: string): boolean => {
  const stored = otpStore.get(email);
  
  if (!stored) {
    console.log('No OTP found for email:', email);
    return false;
  }
  
  if (Date.now() > stored.expiresAt) {
    console.log('OTP expired for email:', email);
    otpStore.delete(email);
    return false;
  }
  
  if (stored.otp !== otp) {
    console.log('OTP mismatch for email:', email);
    return false;
  }
  
  // OTP verified, remove it
  otpStore.delete(email);
  console.log('OTP verified successfully for email:', email);
  return true;
};

// Get stored OTP (for testing/debugging)
export const getStoredOTP = (email: string): string | null => {
  const stored = otpStore.get(email);
  if (stored && Date.now() <= stored.expiresAt) {
    return stored.otp;
  }
  return null;
};

// Clear expired OTPs
export const clearExpiredOTPs = (): void => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  }
};

