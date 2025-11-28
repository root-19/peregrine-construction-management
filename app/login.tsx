import { useUser } from '@/contexts/UserContext';
import { useDatabase } from '@/hooks/use-database';
import { login } from '@/services/api';
import { User } from '@/peregrineDB/types';
import { sendOTPEmail } from '@/utils/email';
import { generateOTP, storeOTP } from '@/utils/otp';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const { isInitialized } = useDatabase();
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPosition, setCompanyPosition] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      if (!companyEmail || !password) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      if (!isInitialized) {
        Alert.alert('Please wait', 'API is initializing. Please try again in a moment.');
        return;
      }

      setLoading(true);

      // Try to login with different account types
      const accountTypes: Array<'hr' | 'manager_coo' | 'user'> = ['hr', 'manager_coo', 'user'];
      let loginSuccess = false;

      for (const accountType of accountTypes) {
        try {
          const response = await login(companyEmail, password, accountType);
          const account = response.account;
          
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
        Alert.alert('Error', 'Invalid email or password. Please check your credentials and try again.');
        setLoading(false);
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
    // TODO: Implement forgot password functionality
    alert('Forgot password functionality coming soon');
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
});

