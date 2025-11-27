import AddItemModal from '@/components/AddItemModal';
import AssignUserModal from '@/components/AssignUserModal';
import { useUser } from '@/contexts/UserContext';
import { useDatabase } from '@/hooks/use-database';
import { deleteProjectFolder, getProjectFolders, getProjectFoldersForUser, insertProjectFolder, updateProjectFolder } from '@/services/api';
import { ProjectFolder } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { isInitialized } = useDatabase();
  const { user, isHR } = useUser();
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | undefined>(undefined);
  const [folderPath, setFolderPath] = useState<ProjectFolder[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<ProjectFolder | null>(null);
  
  // Check if user is Manager or COO
  const isManagerOrCOO = user?.company_position?.toLowerCase().includes('manager') || 
                         user?.company_position?.toLowerCase().includes('coo') ||
                         user?.position?.toLowerCase().includes('manager') ||
                         user?.position?.toLowerCase().includes('coo');
  
  // Manager/COO can do same as HR for folders
  const canManageFolders = isHR || isManagerOrCOO;

  useEffect(() => {
    // Wait for API to be initialized before loading folders
    if (projectId && isInitialized) {
      // Add a delay to ensure database is fully ready
      const timer = setTimeout(() => {
        loadFolders();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [projectId, currentFolderId, isInitialized]);

  const loadFolders = async () => {
    if (!projectId) return;
    try {
      let projectFolders: ProjectFolder[] = [];
      
      // If user is HR or Manager/COO, show all folders. If regular user, show only assigned folders
      if (canManageFolders) {
        projectFolders = await getProjectFolders(parseInt(projectId), currentFolderId);
        // Hide "Root" folder from Manager and COO (but show it to HR)
        if (isManagerOrCOO && !isHR) {
          projectFolders = projectFolders.filter(f => f.name.toLowerCase() !== 'root');
        }
      } else if (user) {
        // For regular users, get only folders assigned to them
        const allUserFolders = await getProjectFoldersForUser(user.id, parseInt(projectId));
        // Filter by current folder (parent_folder_id)
        if (currentFolderId === undefined) {
          // Show root folders (no parent)
          projectFolders = allUserFolders.filter(f => !f.parent_folder_id);
        } else {
          // Show folders with current folder as parent
          projectFolders = allUserFolders.filter(f => f.parent_folder_id === currentFolderId);
        }
      }
      
      setFolders(projectFolders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
      setFolders([]);
    }
  };

  const handleAddFolder = () => {
    setFolderName('');
    setShowAddModal(true);
  };

  const handleSaveFolder = async () => {
    if (folderName.trim() && projectId) {
      try {
        const newFolderId = await insertProjectFolder(parseInt(projectId), folderName.trim(), currentFolderId);
        const newFolder: ProjectFolder = {
          id: newFolderId,
          project_id: parseInt(projectId),
          name: folderName.trim(),
          parent_folder_id: currentFolderId,
        };
        setFolderName('');
        setShowAddModal(false);
        // Reload folders first, then open assignment modal (for HR and Manager/COO)
        await loadFolders();
        if (canManageFolders) {
          // Small delay to ensure folder is loaded
          setTimeout(() => {
            setSelectedFolder(newFolder);
            setShowAssignModal(true);
          }, 100);
        }
      } catch (error) {
        console.error('Error adding folder:', error);
        Alert.alert('Error', 'Failed to add folder');
      }
    }
  };

  const handleRenameFolder = (folder: ProjectFolder) => {
    setSelectedFolder(folder);
    setFolderName(folder.name);
    setShowRenameModal(true);
  };

  const handleSaveRename = async () => {
    if (folderName.trim() && selectedFolder) {
      try {
        await updateProjectFolder(selectedFolder.id, folderName.trim());
        setFolderName('');
        setShowRenameModal(false);
        setSelectedFolder(null);
        await loadFolders();
        Alert.alert('Success', 'Folder renamed successfully');
      } catch (error) {
        console.error('Error renaming folder:', error);
        Alert.alert('Error', 'Failed to rename folder');
      }
    }
  };

  const handleDeleteFolder = (folder: ProjectFolder) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProjectFolder(folder.id);
              await loadFolders();
              Alert.alert('Success', 'Folder deleted successfully');
            } catch (error) {
              console.error('Error deleting folder:', error);
              Alert.alert('Error', 'Failed to delete folder');
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setFolderName('');
    setShowAddModal(false);
    setShowRenameModal(false);
    setSelectedFolder(null);
  };

  const handleFolderPress = (folder: ProjectFolder) => {
    // Navigate to folder detail screen for all users
    router.push(`/folder-detail?folderId=${folder.id}&folderName=${encodeURIComponent(folder.name)}&projectId=${projectId}&projectName=${encodeURIComponent(projectName || '')}`);
  };

  const handleAssignUsers = (folder: ProjectFolder) => {
    // For HR and Manager/COO: Open assignment modal
    if (canManageFolders) {
      setSelectedFolder(folder);
      setShowAssignModal(true);
    }
  };

  const handleNavigateToFolder = (folder: ProjectFolder) => {
    // Navigate to folder detail screen when clicking ">" icon
    router.push(`/folder-detail?folderId=${folder.id}&folderName=${encodeURIComponent(folder.name)}&projectId=${projectId}&projectName=${encodeURIComponent(projectName || '')}`);
  };

  const handleBackFolder = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : undefined);
    } else {
      router.back();
    }
  };

  const getCurrentPathName = () => {
    if (folderPath.length === 0) return projectName || 'Project';
    return folderPath[folderPath.length - 1].name;
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
          <TouchableOpacity style={styles.backButton} onPress={handleBackFolder}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {getCurrentPathName()}
          </Text>
          {canManageFolders && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddFolder}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          )}
          {!canManageFolders && <View style={styles.addButton} />}
        </View>

        {folderPath.length > 0 && (
          <View style={styles.breadcrumb}>
            <TouchableOpacity
              onPress={() => {
                setFolderPath([]);
                setCurrentFolderId(undefined);
              }}
            >
              <Text style={styles.breadcrumbText}>{projectName}</Text>
            </TouchableOpacity>
            {folderPath.map((folder, index) => (
              <View key={folder.id} style={styles.breadcrumbItem}>
                <Text style={styles.breadcrumbSeparator}> / </Text>
                <TouchableOpacity
                  onPress={() => {
                    const newPath = folderPath.slice(0, index + 1);
                    setFolderPath(newPath);
                    setCurrentFolderId(newPath[newPath.length - 1].id);
                  }}
                >
                  <Text style={styles.breadcrumbText}>{folder.name}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.content}>
          {folders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-outline" size={64} color="#999" />
              <Text style={styles.emptyText}>No folders yet</Text>
              {canManageFolders ? (
                <Text style={styles.emptySubtext}>Tap the + button to add a folder</Text>
              ) : (
                <Text style={styles.emptySubtext}>No folders assigned to you</Text>
              )}
            </View>
          ) : (
            <FlatList
              data={folders}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.folderCard}>
                  <TouchableOpacity
                    style={styles.folderCardContent}
                    onPress={() => handleFolderPress(item)}
                  >
                    <Ionicons name="folder" size={32} color="#228B22" style={styles.folderIcon} />
                    <Text style={styles.folderName}>{item.name}</Text>
                  </TouchableOpacity>
                  <View style={styles.folderActions}>
                    {canManageFolders && (
                      <>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleAssignUsers(item)}
                        >
                          <Ionicons name="people-outline" size={20} color="#228B22" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleRenameFolder(item)}
                        >
                          <Ionicons name="create-outline" size={20} color="#228B22" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteFolder(item)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ff4444" />
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity
                      style={styles.navigateButton}
                      onPress={() => handleNavigateToFolder(item)}
                    >
                      <Ionicons name="eye-outline" size={24} color="#228B22" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>

      {canManageFolders && (
        <>
          <AddItemModal
            visible={showAddModal}
            title="Add New Folder"
            placeholder="Enter folder name"
            value={folderName}
            onChangeText={setFolderName}
            onClose={handleCloseModal}
            onSave={handleSaveFolder}
          />
          <AddItemModal
            visible={showRenameModal}
            title="Rename Folder"
            placeholder="Enter new folder name"
            value={folderName}
            onChangeText={setFolderName}
            onClose={handleCloseModal}
            onSave={handleSaveRename}
            buttonText="Save"
          />
        </>
      )}

      {selectedFolder && canManageFolders && (
        <AssignUserModal
          visible={showAssignModal}
          folderId={selectedFolder.id}
          folderName={selectedFolder.name}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedFolder(null);
          }}
          onSuccess={() => {
            loadFolders();
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
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  addButton: {
    padding: 8,
  },
  breadcrumb: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbSeparator: {
    color: 'white',
    fontSize: 14,
  },
  breadcrumbText: {
    color: 'white',
    fontSize: 14,
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
  folderCard: {
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
  folderCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  assignButton: {
    padding: 8,
  },
  navigateButton: {
    padding: 8,
    marginLeft: 4,
  },
  folderIcon: {
    marginRight: 16,
  },
  folderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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

