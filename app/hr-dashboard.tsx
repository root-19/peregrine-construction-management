import CreatePositionModal from '@/components/CreatePositionModal';
import CreateUserModal from '@/components/CreateUserModal';
import { useUser } from '@/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HRDashboardScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreatePositionModal, setShowCreatePositionModal] = useState(false);

  const handleProjectsPress = () => {
    router.push('/projects');
  };

  const handleBack = () => {
    router.back();
  };

  const handleCreateUser = () => {
    setShowCreateUserModal(true);
  };

  const handleCreatePosition = () => {
    setShowCreatePositionModal(true);
  };

  const handleUserCreated = () => {
    // Refresh or show success message
    console.log('User created successfully');
  };

  const handlePositionCreated = () => {
    // Refresh or show success message
    console.log('Position created successfully');
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
          <View style={styles.topBarIcons}>
            <TouchableOpacity 
              style={styles.createAccountButton} 
              onPress={() => router.push('/messages')}
            >
              <Ionicons name="mail" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.createAccountButton} onPress={handleCreatePosition}>
              <Ionicons name="briefcase-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.createAccountButton} onPress={handleCreateUser}>
              <Ionicons name="person-add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.greeting}>
            Greetings,{'\n'}
            <Text style={styles.position}>
              {user?.company_position || 'HR'}!
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
            {/* <Text style={styles.seeAllText}>See All</Text> */}
          </TouchableOpacity>
        </View>
      </View>

      <CreateUserModal
        visible={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={handleUserCreated}
      />
      <CreatePositionModal
        visible={showCreatePositionModal}
        onClose={() => setShowCreatePositionModal(false)}
        onSuccess={handlePositionCreated}
      />
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
  topBarIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  createAccountButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
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
  seeAllText: {
    fontSize: 14,
    color: '#999',
  },
});

