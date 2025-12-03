import { useUser } from '@/contexts/UserContext';
import { useDatabase } from '@/hooks/use-database';
import { login, checkEmailExists, resetPassword } from '@/services/api';
import { User } from '@/peregrineDB/types';
import { sendOTPEmail } from '@/utils/email';
import { generateOTP, storeOTP } from '@/utils/otp';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, ImageBackground, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const { isInitialized } = useDatabase();
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPosition, setCompanyPosition] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedAccountName, setVerifiedAccountName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    try {
      if (!companyEmail || !password) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      if (!companyPosition) {
        Alert.alert('Error', 'Please enter your company position');
        return;
      }

      if (!isInitialized) {
        Alert.alert('Please wait', 'API is initializing. Please try again in a moment.');
        return;
      }

      setLoading(true);

      // Determine account type based on position input
      const positionLower = companyPosition.toLowerCase().trim();
      let accountTypesToTry: Array<'hr' | 'manager_coo' | 'user'> = [];
      
      // Map position input to account types
      if (positionLower === 'hr' || positionLower.includes('human resource')) {
        accountTypesToTry = ['hr'];
      } else if (positionLower === 'manager' || positionLower === 'coo' || positionLower.includes('manager') || positionLower.includes('chief')) {
        accountTypesToTry = ['manager_coo'];
      } else if (positionLower === 'user' || positionLower === 'employee' || positionLower.includes('staff')) {
        accountTypesToTry = ['user'];
      } else {
        // Try all if position doesn't match known types
        accountTypesToTry = ['hr', 'manager_coo', 'user'];
      }

      let loginSuccess = false;
      let positionMismatch = false;

      for (const accountType of accountTypesToTry) {
        try {
          const response = await login(companyEmail, password, accountType);
          const account = response.account;
          
          // Verify if the position matches
          const accountPosition = account.position || (accountType === 'hr' ? 'HR' : accountType === 'manager_coo' ? 'Manager' : 'Employee');
          const accountPositionLower = accountPosition.toLowerCase();
          
          // Check if entered position matches the account position
          if (accountTypesToTry.length === 1) {
            // User specified a specific position, verify it matches
            const isPositionMatch = 
              accountPositionLower.includes(positionLower) || 
              positionLower.includes(accountPositionLower) ||
              (positionLower === 'hr' && accountType === 'hr') ||
              (positionLower.includes('manager') && accountType === 'manager_coo') ||
              (positionLower === 'coo' && accountType === 'manager_coo') ||
              ((positionLower === 'user' || positionLower === 'employee') && accountType === 'user');
            
            if (!isPositionMatch) {
              positionMismatch = true;
              continue;
            }
          }
          
          // Display login information in terminal
          const accountName = `${account.name} ${account.last_name || ''}`.trim();
          const loginTime = new Date().toLocaleString();
          console.log('\n========================================');
          console.log('🔐 LOGIN SUCCESSFUL');
          console.log('========================================');
          console.log(`👤 Account Name: ${accountName}`);
          console.log(`📧 Email: ${companyEmail}`);
          console.log(`🔑 Account Type: ${accountType.toUpperCase()}`);
          console.log(`⏰ Login Time: ${loginTime}`);
          console.log(`🆔 User ID: ${account.id}`);
          console.log('========================================\n');
          
          // Generate and store OTP
          const otp = generateOTP();
          storeOTP(companyEmail, otp);
          
          // Log OTP in dev mode for immediate access
          if (__DEV__) {
            console.log('🔐 OTP for', companyEmail, ':', otp);
          }
          
          // Convert account to user format for context
          const user: User = {
            id: account.id,
            name: account.name,
            last_name: account.last_name || '',
            email: account.email,
            password: '', // Don't store password
            company_position: account.position || (accountType === 'hr' ? 'HR' : accountType === 'manager_coo' ? 'Manager' : ''),
            created_at: account.created_at,
          };
          
          // Determine user type
          let userType = accountType === 'hr' ? 'hr' : accountType === 'manager_coo' ? 'manager' : 'user';
          if (accountType === 'manager_coo' && account.position?.toLowerCase().includes('coo')) {
            userType = 'coo';
          }
          
          // Navigate to OTP screen immediately (don't wait for email)
          router.push({
            pathname: '/otp',
            params: {
              email: companyEmail,
              userType: userType,
              userId: user.id.toString(),
              userName: user.name,
              userLastName: user.last_name,
              userPosition: user.company_position || '',
            },
          });
          setLoading(false);
          
          // Send email in background (non-blocking)
          sendOTPEmail(companyEmail, otp).catch((error) => {
            console.warn('Email sending failed (non-blocking):', error);
          });
          
          loginSuccess = true;
          break;
        } catch (error: any) {
          // Check if it's a network/connection error
          const isNetworkError = error.message && (
            error.message.includes('Cannot connect') ||
            error.message.includes('Network') ||
            error.message.includes('timeout') ||
            error.message.includes('fetch')
          );

          if (isNetworkError) {
            // Show network error immediately, don't try other account types
            setLoading(false);
            Alert.alert(
              'Connection Error',
              'Cannot connect to the server. Please check:\n\n' +
              '1. Your internet connection\n' +
              '2. Server is running and accessible\n' +
              '3. Try again in a moment',
              [{ text: 'OK' }]
            );
            return;
          }

          // Continue to next account type if this one fails (credentials error)
          if (error.message && !error.message.includes('credentials')) {
            console.error(`Login attempt for ${accountType} failed:`, error);
          }
        }
      }

      if (!loginSuccess) {
        setLoading(false);
        if (positionMismatch) {
          Alert.alert(
            'Wrong Position',
            'The position you entered does not match your account. Please check your company position and try again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Login Failed',
            'Invalid email, password, or position. Please check your credentials and try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check if it's a network error
      const isNetworkError = error.message && (
        error.message.includes('Cannot connect') ||
        error.message.includes('Network') ||
        error.message.includes('timeout')
      );

      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to the server. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'An error occurred during login. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setForgotEmail('');
    setEmailVerified(false);
    setVerifiedAccountName('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleCheckEmail = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setForgotLoading(true);
    try {
      const result = await checkEmailExists(forgotEmail.trim());
      
      if (result.exists) {
        setEmailVerified(true);
        setVerifiedAccountName(result.name || 'User');
        Alert.alert('Email Found', `Account found for ${result.name}. Please enter your new password.`);
      } else {
        Alert.alert('Email Not Found', 'No account found with this email address. Please check and try again.');
      }
    } catch (error: any) {
      console.error('Error checking email:', error);
      Alert.alert('Error', 'Failed to verify email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setForgotLoading(true);
    try {
      const result = await resetPassword(forgotEmail.trim(), newPassword);
      
      if (result.success) {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been updated. You can now login with your new password.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowForgotPassword(false);
                setForgotEmail('');
                setEmailVerified(false);
                setNewPassword('');
                setConfirmPassword('');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      Alert.alert('Error', 'Failed to reset password. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setEmailVerified(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <ImageBackground
      source={require('@/assets/images/Background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar style="light" />
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Login</Text>
          <View style={styles.titleUnderline} />
          
          <Text style={styles.subtitle}>
            Login in with your company position
          </Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Company Email"
              placeholderTextColor="#999"
              value={companyEmail}
              onChangeText={setCompanyEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Company Position"
              placeholderTextColor="#999"
              value={companyPosition}
              onChangeText={setCompanyPosition}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Sending OTP...' : 'Login'}
              </Text>
            </TouchableOpacity>

           
          </View>
        </View>
      </View>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        transparent
        animationType="slide"
        onRequestClose={closeForgotPassword}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {emailVerified ? 'Reset Password' : 'Forgot Password'}
              </Text>
              <TouchableOpacity onPress={closeForgotPassword} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {!emailVerified ? (
              // Step 1: Enter Email
              <>
                <Text style={styles.modalSubtitle}>
                  Enter your email address to reset your password
                </Text>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[styles.modalButton, forgotLoading && styles.modalButtonDisabled]}
                  onPress={handleCheckEmail}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonText}>Verify Email</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              // Step 2: Enter New Password
              <>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#228B22" />
                  <Text style={styles.verifiedText}>
                    Email verified for: {verifiedAccountName}
                  </Text>
                </View>

                <Text style={styles.modalSubtitle}>
                  Enter your new password
                </Text>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="New Password"
                  placeholderTextColor="#999"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />

                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[styles.modalButton, forgotLoading && styles.modalButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backToEmailButton}
                  onPress={() => {
                    setEmailVerified(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Ionicons name="arrow-back" size={16} color="#228B22" />
                  <Text style={styles.backToEmailText}>Back to Email</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    // backgroundColor: 'rgba(34, 139, 34, 0.9)',
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleUnderline: {
    height: 2,
    // backgroundColor: '#228B22',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#999',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#228B22',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  hrInfoBox: {
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#228B22',
  },
  hrInfoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 4,
  },
  hrInfoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // Forgot Password Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#228B22',
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#228B22',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  verifiedText: {
    color: '#228B22',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  backToEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 4,
  },
  backToEmailText: {
    color: '#228B22',
    fontSize: 14,
    fontWeight: '600',
  },
});

