import AddItemModal from '@/components/AddItemModal';
import AssignProjectUserModal from '@/components/AssignProjectUserModal';
import { useUser } from '@/contexts/UserContext';
import { useDatabase } from '@/hooks/use-database';
import { getAllProjects, insertProject } from '@/peregrineDB/database';
import { Project } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { isInitialized } = useDatabase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    // Wait for database to be initialized before loading projects
    if (isInitialized) {
      loadProjects();
    }
  }, [isInitialized]);

  const loadProjects = async () => {
    try {
      const allProjects = await getAllProjects();
      setProjects(allProjects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    }
  };

  const handleAddProject = () => {
    setShowAddModal(true);
  };

  const handleSaveProject = async () => {
    if (projectName.trim() && user && isInitialized) {
      try {
        const newProjectId = await insertProject(projectName.trim(), user.id);
        const newProject: Project = {
          id: newProjectId,
          name: projectName.trim(),
          created_by: user.id,
        };
        setProjectName('');
        setShowAddModal(false);
        await loadProjects();
        // Open assignment modal for the newly created project
        setTimeout(() => {
          setSelectedProject(newProject);
          setShowAssignModal(true);
        }, 100);
      } catch (error) {
        console.error('Error adding project:', error);
        Alert.alert('Error', 'Failed to add project. Please make sure the database is initialized.');
      }
    } else if (!isInitialized) {
      Alert.alert('Please wait', 'Database is initializing. Please try again in a moment.');
    }
  };

  const handleCloseModal = () => {
    setProjectName('');
    setShowAddModal(false);
  };

  const handleProjectPress = (project: Project) => {
    // Open assignment modal to show assigned users
    setSelectedProject(project);
    setShowAssignModal(true);
  };

  const handleNavigateToProject = (project: Project) => {
    // Navigate to project detail
    router.push(`/project-detail?projectId=${project.id}&projectName=${encodeURIComponent(project.name)}`);
  };

  return (
    <ImageBackground
      source={require('@/assets/images/Background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar style="light" />
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Projects</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddProject}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {projects.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-outline" size={64} color="#999" />
              <Text style={styles.emptyText}>No projects yet</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add a project</Text>
            </View>
          ) : (
            <FlatList
              data={projects}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.projectCard}>
                  <TouchableOpacity
                    style={styles.projectCardContent}
                    onPress={() => handleProjectPress(item)}
                  >
                    <Ionicons name="folder" size={32} color="#228B22" style={styles.folderIcon} />
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.projectDescription}>{item.description}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.navigateButton}
                    onPress={() => handleNavigateToProject(item)}
                  >
                    <Ionicons name="chevron-forward" size={24} color="#228B22" />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>

      <AddItemModal
        visible={showAddModal}
        title="Add New Project"
        placeholder="Enter project name"
        value={projectName}
        onChangeText={setProjectName}
        onClose={handleCloseModal}
        onSave={handleSaveProject}
      />

      {selectedProject && (
        <AssignProjectUserModal
          visible={showAssignModal}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedProject(null);
          }}
          onSuccess={() => {
            loadProjects();
          }}
        />
      )}
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
    backgroundColor: 'rgba(34, 139, 34, 0.9)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  listContent: {
    padding: 16,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'space-between',
  },
  projectCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navigateButton: {
    padding: 8,
    marginLeft: 8,
  },
  folderIcon: {
    marginRight: 16,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

