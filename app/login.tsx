import { useUser } from '@/contexts/UserContext';
import { getHRAccountByEmail, getUserByEmail } from '@/peregrineDB/database';
import { User } from '@/peregrineDB/types';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPosition, setCompanyPosition] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      if (!companyEmail || !password) {
        alert('Please fill in all required fields');
        return;
      }

      // First check HR accounts
      const hrAccount = await getHRAccountByEmail(companyEmail);
      if (hrAccount && hrAccount.password === password) {
        // Convert HR account to user format for context
        const user: User = {
          id: hrAccount.id,
          name: hrAccount.name,
          last_name: hrAccount.last_name,
          email: hrAccount.email,
          password: hrAccount.password,
          company_position: hrAccount.position || 'HR',
          created_at: hrAccount.created_at,
        };
        setUser(user);
        router.replace('/hr-dashboard');
        return;
      }

      // Check regular users
      const user = await getUserByEmail(companyEmail);
      
      if (user && user.password === password) {
        // Set user in context
        setUser(user);
        
        // Check if user is HR
        const isHR = user.company_position?.toLowerCase().includes('hr') || false;
        
        if (isHR) {
          // Navigate to HR dashboard
          router.replace('/hr-dashboard');
        } else {
          // Navigate to regular user dashboard
          router.replace('/(tabs)');
        }
      } else {
        alert('Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('An error occurred during login');
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
              style={styles.loginButton}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <View style={styles.hrInfoBox}>
              <Text style={styles.hrInfoTitle}>Default HR Account:</Text>
              <Text style={styles.hrInfoText}>Email: hr@peregrine.com</Text>
              <Text style={styles.hrInfoText}>Password: hr123</Text>
              <Text style={styles.hrInfoText}>Company: Peregrine Construction & Management L.L.C INC</Text>
              <Text style={styles.hrInfoText}>Position: HR Manager</Text>
            </View>
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

