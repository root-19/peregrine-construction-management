import { useUser } from '@/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ManagerDashboardScreen() {
  const router = useRouter();
  const { user } = useUser();

  const handleBack = () => {
    router.back();
  };

  const handleProjectsPress = () => {
    router.push('/projects?showList=true');
  };

  return (
    <ImageBackground
      source={require('@/assets/images/Background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar style="light" />
      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.messageButton} 
            onPress={() => router.push('/messages')}
          >
            <Ionicons name="mail" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.greeting}>
            Greetings,{'\n'}
            <Text style={styles.position}>
              {user?.company_position || user?.position || 'Manager'}!
            </Text>
          </Text>

          <View style={styles.profileIcon}>
            <Ionicons name="person" size={60} color="white" />
          </View>

          <TouchableOpacity 
            style={styles.projectsButton}
            onPress={handleProjectsPress}
          >
            <Ionicons name="flash" size={20} color="#228B22" style={styles.lightningIcon} />
            <Text style={styles.projectsText}>Projects</Text>
          </TouchableOpacity>
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
    backgroundColor: 'rgba(34, 139, 34, 0.85)',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  messageButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingTop: 120,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  position: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  profileIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#228B22',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 40,
  },
  projectsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#228B22',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 200,
    justifyContent: 'space-between',
  },
  lightningIcon: {
    marginRight: 8,
  },
  projectsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#228B22',
    flex: 1,
  },
});

