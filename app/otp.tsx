import { useUser } from '@/contexts/UserContext';
import { sendOTPEmail } from '@/utils/email';
import { generateOTP, getStoredOTP, storeOTP, verifyOTP } from '@/utils/otp';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function OTPScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const params = useLocalSearchParams<{
    email: string;
    userType: string;
    userId: string;
    userName: string;
    userLastName: string;
    userPosition: string;
  }>();
  
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    // Countdown timer for resend OTP
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 4) {
      // Focus next input (you can use refs for this, but for simplicity we'll just update)
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 5) {
      Alert.alert('Error', 'Please enter the complete 5-digit code');
      return;
    }

    if (!params.email) {
      Alert.alert('Error', 'Email not found');
      return;
    }

    setLoading(true);

    try {
      const isValid = verifyOTP(params.email, otpString);
      
      if (!isValid) {
        Alert.alert('Error', 'Invalid or expired verification code. Please try again.');
        setLoading(false);
        return;
      }

      // OTP verified, set user and navigate
      const user = {
        id: parseInt(params.userId || '0'),
        name: params.userName || '',
        last_name: params.userLastName || '',
        email: params.email,
        password: '', // Don't store password in context
        company_position: params.userPosition || '',
      };

      setUser(user);

      // Navigate based on user type
      if (params.userType === 'hr') {
        router.replace('/hr-dashboard');
      } else if (params.userType === 'manager' || params.userType === 'coo') {
        // Manager and COO go to manager dashboard
        router.replace('/manager-dashboard');
      } else {
        // Regular users go to user dashboard
        router.replace('/users/dashboard');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert('Error', 'An error occurred during verification');
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0 || !params.email) {
      return;
    }

    setResending(true);

    try {
      const newOtp = generateOTP();
      storeOTP(params.email, newOtp);
      
      const emailSent = await sendOTPEmail(params.email, newOtp);
      
      if (emailSent) {
        Alert.alert('Success', 'A new verification code has been sent to your email');
        setOtp(['', '', '', '', '']);
        setTimer(60);
      } else {
        Alert.alert('Error', 'Failed to resend verification code. Please try again.');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  // For development: show OTP in console
  useEffect(() => {
    if (params.email) {
      const storedOtp = getStoredOTP(params.email);
      if (storedOtp) {
        console.log('🔐 OTP for', params.email, ':', storedOtp);
      }
    }
  }, [params.email]);

  return (
    <ImageBackground
      source={require('@/assets/images/Background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar style="light" />
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#228B22" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={64} color="#228B22" />
          </View>

          <Text style={styles.title}>Email Verification</Text>
          <Text style={styles.subtitle}>
            We've sent a 5-digit verification code to
          </Text>
          <Text style={styles.email}>{params.email}</Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                style={styles.otpInput}
                value={digit}
                onChangeText={(value) => handleOtpChange(index, value)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            <Text style={styles.verifyButtonText}>
              {loading ? 'Verifying...' : 'Verify'}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={timer > 0 || resending}
            >
              <Text style={[
                styles.resendLink,
                (timer > 0 || resending) && styles.resendLinkDisabled
              ]}>
                {resending ? 'Sending...' : timer > 0 ? `Resend (${timer}s)` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Development helper - show OTP */}
          {__DEV__ && params.email && (
            <View style={styles.devHelper}>
              <Text style={styles.devHelperText}>
                Dev: Check console for OTP
              </Text>
            </View>
          )}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 32,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  otpInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#228B22',
    minWidth: 50,
  },
  verifyButton: {
    backgroundColor: '#228B22',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: 'bold',
  },
  resendLinkDisabled: {
    color: '#999',
  },
  devHelper: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#228B22',
  },
  devHelperText: {
    fontSize: 12,
    color: '#228B22',
    textAlign: 'center',
  },
});

