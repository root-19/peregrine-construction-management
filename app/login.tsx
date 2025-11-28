import { useUser } from '@/contexts/UserContext';
import { useDatabase } from '@/hooks/use-database';
import { getHRAccountByEmail, getManagerCOOAccountByEmail, getUserByEmail } from '@/peregrineDB/database';
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
        Alert.alert('Please wait', 'Database is initializing. Please try again in a moment.');
        return;
      }

      setLoading(true);

      // First check HR accounts
      const hrAccount = await getHRAccountByEmail(companyEmail);
      if (hrAccount && hrAccount.password === password) {
        // Generate and store OTP
        const otp = generateOTP();
        storeOTP(companyEmail, otp);
        
        // Log OTP in dev mode for immediate access
        if (__DEV__) {
          console.log('🔐 OTP for', companyEmail, ':', otp);
        }
        
        // Convert HR account to user format for context (temporary, will be set after OTP verification)
        const user: User = {
          id: hrAccount.id,
          name: hrAccount.name,
          last_name: hrAccount.last_name,
          email: hrAccount.email,
          password: hrAccount.password,
          company_position: hrAccount.position || 'HR',
          created_at: hrAccount.created_at,
        };
        
        // Navigate to OTP screen immediately (don't wait for email)
        router.push({
          pathname: '/otp',
          params: {
            email: companyEmail,
            userType: 'hr',
            userId: user.id.toString(),
            userName: user.name,
            userLastName: user.last_name,
            userPosition: user.company_position || 'HR',
          },
        });
        setLoading(false);
        
        // Send email in background (non-blocking)
        sendOTPEmail(companyEmail, otp).catch((error) => {
          console.warn('Email sending failed (non-blocking):', error);
        });
        
        return;
      }

      // Check Manager/COO accounts (separate table)
      const managerCOOAccount = await getManagerCOOAccountByEmail(companyEmail);
      if (managerCOOAccount && managerCOOAccount.password === password) {
        // Generate and store OTP
        const otp = generateOTP();
        storeOTP(companyEmail, otp);
        
        // Log OTP in dev mode for immediate access
        if (__DEV__) {
          console.log('🔐 OTP for', companyEmail, ':', otp);
        }
        
        // Determine user type based on position
        const position = managerCOOAccount.position?.toLowerCase() || '';
        let userType = 'manager';
        if (position.includes('coo')) {
          userType = 'coo';
        }
        
        // Convert Manager/COO account to user format for context
        const user: User = {
          id: managerCOOAccount.id,
          name: managerCOOAccount.name,
          last_name: managerCOOAccount.last_name,
          email: managerCOOAccount.email,
          password: managerCOOAccount.password,
          company_position: managerCOOAccount.position || 'Manager',
          created_at: managerCOOAccount.created_at,
        };
        
        // Navigate to OTP screen immediately (don't wait for email)
        router.push({
          pathname: '/otp',
          params: {
            email: companyEmail,
            userType: userType,
            userId: user.id.toString(),
            userName: user.name,
            userLastName: user.last_name,
            userPosition: user.company_position || 'Manager',
          },
        });
        setLoading(false);
        
        // Send email in background (non-blocking)
        sendOTPEmail(companyEmail, otp).catch((error) => {
          console.warn('Email sending failed (non-blocking):', error);
        });
        
        return;
      }

      // Check regular users
      const user = await getUserByEmail(companyEmail);
      
      if (user && user.password === password) {
        // Generate and store OTP
        const otp = generateOTP();
        storeOTP(companyEmail, otp);
        
        // Log OTP in dev mode for immediate access
        if (__DEV__) {
          console.log('🔐 OTP for', companyEmail, ':', otp);
        }
        
        // Check if user is HR
        const isHR = user.company_position?.toLowerCase().includes('hr') || false;
        
        // Navigate to OTP screen immediately (don't wait for email)
        router.push({
          pathname: '/otp',
          params: {
            email: companyEmail,
            userType: isHR ? 'hr' : 'user',
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
      } else {
        Alert.alert('Error', 'Invalid email or password');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred during login');
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

