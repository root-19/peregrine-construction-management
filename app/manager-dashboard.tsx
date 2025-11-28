import { useUser } from '@/contexts/UserContext';
import { useDatabase } from '@/hooks/use-database';
import { getAllProjects } from '@/services/api';
import { Project } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ManagerDashboardScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { isInitialized } = useDatabase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isInitialized) {
      // Add delay to ensure database is fully ready
      const timer = setTimeout(() => {
        loadProjects();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await getAllProjects();
      setProjects(allProjects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleProjectPress = (project: Project) => {
    router.push(`/project-detail?projectId=${project.id}&projectName=${encodeURIComponent(project.name)}`);
  };

  const handleProjectsPress = () => {
    router.push('/projects');
  };

  const renderProjectItem = ({ item }: { item: Project }) => {
    return (
      <TouchableOpacity
        style={styles.projectCard}
        onPress={() => handleProjectPress(item)}
      >
        <View style={styles.projectCardContent}>
          <Ionicons name="folder" size={24} color="#228B22" style={styles.folderIcon} />
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.projectDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </View>
      </TouchableOpacity>
    );
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

          <View style={styles.projectsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Projects</Text>
              <TouchableOpacity onPress={handleProjectsPress}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <Text style={styles.loadingText}>Loading projects...</Text>
            ) : projects.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-outline" size={48} color="#999" />
                <Text style={styles.emptyText}>No projects yet</Text>
                <Text style={styles.emptySubtext}>
                  Create a new project to get started
                </Text>
              </View>
            ) : (
              <FlatList
                data={projects}
                renderItem={renderProjectItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.projectsList}
                showsVerticalScrollIndicator={false}
              />
            )}
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
    marginBottom: 30,
  },
  projectsSection: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#228B22',
  },
  seeAllText: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: '600',
  },
  projectsList: {
    paddingBottom: 10,
  },
  projectCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  projectCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  folderIcon: {
    marginRight: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

