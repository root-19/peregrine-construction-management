import AddItemModal from '@/components/AddItemModal';
import { useUser } from '@/contexts/UserContext';
import { createDocumentFolder, deleteDocumentFolder, getDocumentFolders, getProjectFolders, getSubfolders, insertProjectFolder, insertSubfolder, updateDocumentFolder } from '@/services/api';
import { DocumentFolder, Subfolder } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function DocumentSystemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    folderId: string | string[];
    subfolderId: string | string[];
    subfolderName: string | string[];
    projectId: string | string[];
    projectName: string | string[];
  }>();

  const folderIdParam = Array.isArray(params.folderId) ? params.folderId[0] : params.folderId;
  const subfolderIdParam = Array.isArray(params.subfolderId) ? params.subfolderId[0] : params.subfolderId;
  const subfolderNameParam = Array.isArray(params.subfolderName) ? params.subfolderName[0] : params.subfolderName;
  const projectIdParam = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const projectNameParam = Array.isArray(params.projectName) ? params.projectName[0] : params.projectName;

  const { user, isHR } = useUser();
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'Procurement' | 'Community' | null>(null);
  const [folderName, setFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<DocumentFolder | null>(null);
  
  // For expandable buttons and subfolders
  const [expandedButton, setExpandedButton] = useState<string | null>(null);
  const [subfolders, setSubfolders] = useState<{ [key: string]: Subfolder[] }>({});
  const [newSubfolderName, setNewSubfolderName] = useState<{ [key: string]: string }>({});
  const [procurementFolders, setProcurementFolders] = useState<DocumentFolder[]>([]);
  const [communityFolders, setCommunityFolders] = useState<DocumentFolder[]>([]);
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'MATERIAL REQUEST'>('DOCUMENTS');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(folderIdParam || null);

  // Check if user is Manager or COO
  const isManagerOrCOO = user?.company_position?.toLowerCase().includes('manager') || 
                         user?.company_position?.toLowerCase().includes('coo') ||
                         user?.position?.toLowerCase().includes('manager') ||
                         user?.position?.toLowerCase().includes('coo');
  const canManageFolders = isHR || isManagerOrCOO;

  // Determine account type
  const getAccountType = (): 'user' | 'hr' | 'manager_coo' => {
    if (isHR) return 'hr';
    if (isManagerOrCOO) return 'manager_coo';
    return 'user';
  };

  useEffect(() => {
    if (projectIdParam) {
      initializeAndLoad();
    }
  }, [projectIdParam, folderIdParam]);

  // Initialize - just load data, don't auto-create folders
  const initializeAndLoad = async () => {
    if (!projectIdParam) return;
    
    try {
      setLoading(true);
      const projectIdNum = parseInt(projectIdParam);
      
      // If folderId is provided, use it
      if (folderIdParam) {
        setCurrentFolderId(folderIdParam);
      } else {
        // Check if Root folder exists (don't create automatically)
        const existingFolders = await getProjectFolders(projectIdNum, undefined);
        
        if (existingFolders.length > 0) {
          // Use the first folder (Root folder)
          const rootFolder = existingFolders.find(f => f.name === 'Root') || existingFolders[0];
          setCurrentFolderId(rootFolder.id.toString());
          console.log('📁 Using existing folder:', rootFolder.id, rootFolder.name);
        }
        // If no folder exists, currentFolderId stays null - will be created when user clicks Create
      }
      
      await loadDocumentFolders();
      await loadAllSubfolders();
    } catch (error) {
      console.error('Error initializing:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create Root folder only when needed (called from handleAddSubfolder)
  const ensureRootFolderExists = async (): Promise<string | null> => {
    if (!projectIdParam) return null;
    
    // If we already have a folder ID, return it
    if (currentFolderId) return currentFolderId;
    
    try {
      const projectIdNum = parseInt(projectIdParam);
      
      // Check again if folder exists
      const existingFolders = await getProjectFolders(projectIdNum, undefined);
      
      if (existingFolders.length > 0) {
        const rootFolder = existingFolders.find(f => f.name === 'Root') || existingFolders[0];
        setCurrentFolderId(rootFolder.id.toString());
        return rootFolder.id.toString();
      }
      
      // Create Root folder now (user clicked Create button)
      const newFolderId = await insertProjectFolder(projectIdNum, 'Root', undefined);
      setCurrentFolderId(newFolderId.toString());
      console.log('📁 Created Root folder on demand:', newFolderId);
      return newFolderId.toString();
    } catch (error) {
      console.error('Error creating Root folder:', error);
      return null;
    }
  };

  const loadDocumentFolders = async () => {
    if (!projectIdParam || !user) return;
    
    try {
      setLoading(true);
      const projectIdNum = parseInt(projectIdParam);
      const allFolders = await getDocumentFolders(projectIdNum);
      
      setProcurementFolders(allFolders.filter(f => f.category === 'Procurement'));
      setCommunityFolders(allFolders.filter(f => f.category === 'Community'));
    } catch (error) {
      console.error('Error loading document folders:', error);
      // Don't show alert if route doesn't exist yet - it's expected during development
      if (error instanceof Error && !error.message.includes('could not be found')) {
        Alert.alert('Error', 'Failed to load document folders');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAllSubfolders = async () => {
    if (!projectIdParam) return;
    
    try {
      const projectIdNum = parseInt(projectIdParam);
      const allSubfolders = await getSubfolders(undefined, projectIdNum);
      
      // Group subfolders by button name
      const subfoldersMap: { [key: string]: Subfolder[] } = {};
      ['Procurement', 'Community', 'Relations', 'Permits and Licenses', 'Admin'].forEach(btn => {
        subfoldersMap[btn] = allSubfolders.filter(sf => 
          sf.button_name && sf.button_name.trim().toLowerCase() === btn.toLowerCase()
        );
      });
      setSubfolders(subfoldersMap);
    } catch (error) {
      console.error('Error loading subfolders:', error);
      setSubfolders({});
    }
  };

  const handleButtonPress = (buttonName: string) => {
    if (expandedButton === buttonName) {
      setExpandedButton(null);
    } else {
      setExpandedButton(buttonName);
    }
  };

  const handleAddSubfolder = async (buttonName: string) => {
    const name = newSubfolderName[buttonName]?.trim();
    
    if (!name) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }
    
    if (!projectIdParam) {
      Alert.alert('Error', 'Project ID is missing');
      return;
    }

    try {
      // Ensure Root folder exists (create only when user clicks Create button)
      const folderId = await ensureRootFolderExists();
      
      if (!folderId) {
        Alert.alert('Error', 'Failed to initialize folder. Please try again.');
        return;
      }

      const projectIdNum = parseInt(projectIdParam);
      const projectFolderId = parseInt(folderId);
      
      if (isNaN(projectIdNum) || isNaN(projectFolderId)) {
        Alert.alert('Error', 'Invalid project or folder ID');
        return;
      }
      
      console.log('📁 Creating subfolder:', { projectFolderId, projectIdNum, name, buttonName });
      
      const newSubfolderId = await insertSubfolder(
        projectFolderId,
        projectIdNum,
        name,
        buttonName
      );
      
      setNewSubfolderName({ ...newSubfolderName, [buttonName]: '' });
      
      setTimeout(async () => {
        await loadAllSubfolders();
      }, 500);
      
      Alert.alert('Success', `Subfolder "${name}" added successfully`);
    } catch (error) {
      console.error('Error adding subfolder:', error);
      Alert.alert('Error', `Failed to add subfolder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddFolder = (category: 'Procurement' | 'Community') => {
    setSelectedCategory(category);
    setFolderName('');
    setEditingFolder(null);
    setShowAddModal(true);
  };

  const handleEditFolder = (folder: DocumentFolder) => {
    setEditingFolder(folder);
    setSelectedCategory(folder.category);
    setFolderName(folder.folder_name);
    setShowAddModal(true);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim() || !selectedCategory || !projectIdParam || !projectNameParam || !user) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const projectIdNum = parseInt(projectIdParam);
      const accountType = getAccountType();

      if (editingFolder) {
        await updateDocumentFolder(editingFolder.id, folderName.trim(), selectedCategory);
        Alert.alert('Success', 'Folder updated successfully');
      } else {
        await createDocumentFolder(
          projectIdNum,
          projectNameParam,
          user.id,
          accountType,
          folderName.trim(),
          selectedCategory
        );
        Alert.alert('Success', 'Folder created successfully');
      }

      setShowAddModal(false);
      setFolderName('');
      setEditingFolder(null);
      setSelectedCategory(null);
      await loadDocumentFolders();
    } catch (error) {
      console.error('Error saving folder:', error);
      Alert.alert('Error', 'Failed to save folder');
    }
  };

  const handleDeleteFolder = (folder: DocumentFolder) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.folder_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocumentFolder(folder.id);
              Alert.alert('Success', 'Folder deleted successfully');
              await loadDocumentFolders();
            } catch (error) {
              console.error('Error deleting folder:', error);
              Alert.alert('Error', 'Failed to delete folder');
            }
          },
        },
      ]
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>DOCUMENTS</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tabs Container - Below header in green area */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsBox}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'DOCUMENTS' && styles.activeTab, { borderRightWidth: 1, borderRightColor: '#000' }]}
              onPress={() => setActiveTab('DOCUMENTS')}
            >
              <Text style={[styles.tabText, activeTab === 'DOCUMENTS' && styles.activeTabText]}>
                DOCUMENTS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'MATERIAL REQUEST' && styles.activeTab]}
              onPress={() => setActiveTab('MATERIAL REQUEST')}
            >
              <Text style={[styles.tabText, activeTab === 'MATERIAL REQUEST' && styles.activeTabText]}>
                MATERIAL REQUEST
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.buttonsContainer}>
              {['Procurement', 'Community', 'Relations', 'Permits and Licenses', 'Admin'].map((buttonName) => (
                <View key={buttonName} style={styles.buttonWrapper}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => handleButtonPress(buttonName)}
                  >
                    <Text style={styles.buttonText}>{buttonName}</Text>
                    <Ionicons 
                      name={expandedButton === buttonName ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#000" 
                      style={styles.chevronIcon}
                    />
                  </TouchableOpacity>
                  
                  {/* Expanded subfolders */}
                  {expandedButton === buttonName && (
                    <View style={styles.subfoldersContainer}>
                      {/* Subfolders list */}
                      {subfolders[buttonName] && subfolders[buttonName].length > 0 ? (
                        subfolders[buttonName].map((subfolder) => (
                          <TouchableOpacity
                            key={subfolder.id}
                            style={styles.subfolderItem}
                          >
                            <Ionicons name="folder" size={20} color="#228B22" style={styles.folderIcon} />
                            <Text style={styles.subfolderText}>{subfolder.name}</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.emptySubfolderContainer}>
                          <Text style={styles.emptySubfolderText}>No subfolders yet</Text>
                        </View>
                      )}
                      
                      {/* Input field to create new subfolder */}
                      <View style={styles.addSubfolderContainer}>
                        <Text style={styles.inputLabel}>Create New Folder:</Text>
                        <TextInput
                          style={styles.subfolderInput}
                          placeholder="Enter folder name"
                          value={newSubfolderName[buttonName] || ''}
                          onChangeText={(text) => setNewSubfolderName({ ...newSubfolderName, [buttonName]: text })}
                          onSubmitEditing={() => handleAddSubfolder(buttonName)}
                          returnKeyType="done"
                          autoFocus
                        />
                        <View style={styles.addSubfolderActions}>
                          <TouchableOpacity
                            style={styles.addSubfolderButton}
                            onPress={() => handleAddSubfolder(buttonName)}
                          >
                            <Text style={styles.addSubfolderButtonText}>Create</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.addSubfolderButton, styles.cancelButton]}
                            onPress={() => {
                              setNewSubfolderName({ ...newSubfolderName, [buttonName]: '' });
                            }}
                          >
                            <Text style={styles.addSubfolderButtonText}>Clear</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <AddItemModal
          visible={showAddModal}
          title={editingFolder ? 'Edit Folder' : `Add ${selectedCategory} Folder`}
          placeholder="Enter folder name"
          value={folderName}
          onChangeText={setFolderName}
          onClose={() => {
            setShowAddModal(false);
            setFolderName('');
            setEditingFolder(null);
            setSelectedCategory(null);
          }}
          onSave={handleSaveFolder}
          buttonText={editingFolder ? 'Update' : 'Create'}
        />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  tabsBox: {
    flexDirection: 'row',
    // backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#228B22',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  buttonsContainer: {
    paddingVertical: 8,
  },
  buttonWrapper: {
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  subfoldersContainer: {
    marginTop: 8,
    marginLeft: 20,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#228B22',
  },
  subfolderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  folderIcon: {
    marginRight: 8,
  },
  subfolderText: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  emptySubfolderContainer: {
    padding: 12,
    alignItems: 'center',
  },
  emptySubfolderText: {
    fontSize: 14,
    color: '#999',
  },
  addSubfolderContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#228B22',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  subfolderInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  addSubfolderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addSubfolderButton: {
    flex: 1,
    backgroundColor: '#228B22',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  addSubfolderButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
