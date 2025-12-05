import AddItemModal from '@/components/AddItemModal';
import { useUser } from '@/contexts/UserContext';
import { createDocumentFolder, deleteDocumentFolder, getDocumentFolders, getMaterialRequests, getMyMaterialRequests, getProjectFolders, getSubfolders, insertProjectFolder, insertSubfolder, updateDocumentFolder, updateMaterialRequestStatus } from '@/services/api';
import { DocumentFolder, MaterialRequest, Subfolder } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, FlatList, ImageBackground, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  
  // Material Request states
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'MATERIAL REQUEST') {
      loadMaterialRequests();
    }
  }, [activeTab]);

  const loadMaterialRequests = async () => {
    try {
      setMaterialLoading(true);
      if (!user) {
        console.warn('⚠️ User not loaded yet, skipping material requests load');
        setMaterialRequests([]);
        return;
      }
      
      console.log('📦 Loading material requests for user:', { userId: user.id, canManageFolders, isHR, isManagerOrCOO });
      
      if (canManageFolders) {
        const requests = await getMaterialRequests();
        console.log('📦 Loaded all material requests:', requests?.length || 0);
        setMaterialRequests(requests || []);
      } else {
        const requests = await getMyMaterialRequests();
        console.log('📦 Loaded my material requests:', requests?.length || 0, requests);
        setMaterialRequests(requests || []);
      }
    } catch (error) {
      console.error('❌ Error loading material requests:', error);
      Alert.alert('Error', 'Failed to load material requests. Please try again.');
      setMaterialRequests([]);
    } finally {
      setMaterialLoading(false);
    }
  };

  const onRefreshMaterials = async () => {
    setRefreshing(true);
    await loadMaterialRequests();
    setRefreshing(false);
  };

  const handleCreateMaterialRequest = () => {
    router.push({
      pathname: '/material-request-form',
      params: {
        projectName: projectNameParam || '',
        projectId: projectIdParam || '',
      },
    } as any);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#f44336';
      case 'processing': return '#2196F3';
      case 'completed': return '#228B22';
      default: return '#666';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#f44336';
      case 'urgent': return '#9C27B0';
      default: return '#666';
    }
  };

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
      if (buttonName === 'Procurement') {
        loadMaterialRequests();
      }
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
              style={[styles.tab, activeTab === 'DOCUMENTS' && styles.activeTab, !canManageFolders && { borderRightWidth: 1, borderRightColor: '#000' }]}
              onPress={() => setActiveTab('DOCUMENTS')}
            >
              <Text style={[styles.tabText, activeTab === 'DOCUMENTS' && styles.activeTabText]}>
                DOCUMENTS
              </Text>
            </TouchableOpacity>
            {/* Only show MATERIAL REQUEST tab for regular users */}
            {!canManageFolders && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'MATERIAL REQUEST' && styles.activeTab]}
                onPress={() => router.push({
                  pathname: '/material-request-form',
                  params: {
                    projectName: projectNameParam || '',
                    projectId: projectIdParam || '',
                  },
                } as any)}
              >
                <Text style={[styles.tabText, activeTab === 'MATERIAL REQUEST' && styles.activeTabText]}>
                  MATERIAL REQUEST
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {activeTab === 'DOCUMENTS' ? (
            // ========== DOCUMENTS TAB ==========
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
                      
                      {expandedButton === buttonName && (
                        <View style={styles.subfoldersContainer}>
                          {buttonName === 'Procurement' ? (
                            // Show Material Requests for Procurement (no subfolders for users)
                            <>
                              {materialLoading ? (
                                <View style={styles.emptySubfolderContainer}>
                                  <Text style={styles.emptySubfolderText}>Loading material requests...</Text>
                                </View>
                              ) : (() => {
                                // Filter requests based on user type and project
                                const filteredRequests = materialRequests.filter(req => {
                                  // First filter by project - only show requests for current project
                                  const currentProjectName = projectNameParam?.trim();
                                  const requestProjectName = req.project_name?.trim();
                                  
                                  if (currentProjectName) {
                                    // If current project has a name, only show requests that match (case-insensitive)
                                    if (requestProjectName) {
                                      if (requestProjectName.toLowerCase() !== currentProjectName.toLowerCase()) {
                                        return false; // Not for this project
                                      }
                                    } else {
                                      // Request doesn't have project name but current project does - exclude
                                      return false;
                                    }
                                  }
                                  
                                  // For regular users, only show their own requests
                                  if (!canManageFolders && user) {
                                    return req.requested_by_id === user.id;
                                  }
                                  // For HR/Manager/COO, show all requests for this project
                                  return true;
                                });
                                
                                console.log('📦 Filtered material requests for Procurement:', {
                                  currentProject: projectNameParam,
                                  totalRequests: materialRequests.length,
                                  filteredCount: filteredRequests.length,
                                  filteredRequests: filteredRequests.map(r => ({ id: r.id, project: r.project_name, requested_by: r.requested_by_name }))
                                });
                                
                                if (filteredRequests.length === 0) {
                                  return (
                                    <View style={styles.emptySubfolderContainer}>
                                      <Text style={styles.emptySubfolderText}>
                                        {!canManageFolders ? 'You have no material requests yet' : 'No material requests yet'}
                                      </Text>
                                    </View>
                                  );
                                }
                                
                                return (
                                  <>
                                    {filteredRequests.map((req) => (
                                    <View key={req.id} style={styles.requestCard}>
                                      <View style={styles.requestHeader}>
                                        <View style={styles.requestInfo}>
                                          <Text style={styles.requestTitle}>Request #{req.id}</Text>
                                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) }]}>
                                            <Text style={styles.statusText}>{req.status.toUpperCase()}</Text>
                                          </View>
                                        </View>
                                        <View style={styles.headerRight}>
                                          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(req.priority) }]}>
                                            <Text style={styles.priorityText}>{req.priority.toUpperCase()}</Text>
                                          </View>
                                          <Text style={styles.requestDate}>
                                            {new Date(req.created_at).toLocaleDateString()}
                                          </Text>
                                        </View>
                                      </View>
                                      
                                      <View style={styles.requestDetails}>
                                        <View style={styles.detailRow}>
                                          <Text style={styles.detailLabel}>Requested by:</Text>
                                          <Text style={styles.detailValue}>{req.requested_by_name} {req.requested_by_position ? `(${req.requested_by_position})` : ''}</Text>
                                        </View>
                                        {req.project_name && (
                                          <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Project:</Text>
                                            <Text style={styles.detailValue}>{req.project_name}</Text>
                                          </View>
                                        )}
                                        <View style={styles.detailRow}>
                                          <Text style={styles.detailLabel}>Date Needed:</Text>
                                          <Text style={styles.detailValue}>
                                            {new Date(req.date_needed).toLocaleDateString()}
                                          </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                          <Text style={styles.detailLabel}>Items:</Text>
                                          <Text style={styles.detailValue}>{req.materials?.length || 0} item(s)</Text>
                                        </View>
                                      </View>
                                      
                                      <Text style={styles.purposeLabel}>Purpose:</Text>
                                      <Text style={styles.purposeText} numberOfLines={2}>
                                        {req.purpose}
                                      </Text>

                                      <View style={styles.materialsList}>
                                        <Text style={styles.materialsTitle}>Materials:</Text>
                                        {req.materials?.slice(0, 3).map((material, index) => (
                                          <Text key={index} style={styles.materialItem}>
                                            • {material.quantity} {material.unit} - {material.item_name}
                                          </Text>
                                        ))}
                                        {req.materials && req.materials.length > 3 && (
                                          <Text style={styles.moreItems}>+{req.materials.length - 3} more items...</Text>
                                        )}
                                      </View>

                                      {/* HR/Manager/COO approve/decline buttons */}
                                      {canManageFolders && req.status === 'pending' && (
                                        <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                                          <TouchableOpacity
                                            style={{ flex: 1, backgroundColor: '#4CAF50', padding: 10, borderRadius: 5, alignItems: 'center' }}
                                            onPress={async () => {
                                              try {
                                                await updateMaterialRequestStatus(req.id, 'approved', isHR ? 'hr' : 'manager_coo', 'Approved');
                                                Alert.alert('Success', 'Request approved.');
                                                loadMaterialRequests();
                                              } catch (err) {
                                                Alert.alert('Error', 'Could not approve the request.');
                                              }
                                            }}
                                          >
                                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Approve</Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            style={{ flex: 1, backgroundColor: '#f44336', padding: 10, borderRadius: 5, alignItems: 'center' }}
                                            onPress={() => {
                                              Alert.prompt(
                                                'Decline Request',
                                                'Enter reason for declining this request:',
                                                [
                                                  { text: 'Cancel', style: 'cancel' },
                                                  {
                                                    text: 'Decline',
                                                    style: 'destructive',
                                                    onPress: (rejectionReason?: string) => {
                                                      (async () => {
                                                        try {
                                                          await updateMaterialRequestStatus(req.id, 'rejected', isHR ? 'hr' : 'manager_coo', rejectionReason || 'No reason provided');
                                                          Alert.alert('Success', 'Request declined.');
                                                          loadMaterialRequests();
                                                        } catch (err) {
                                                          Alert.alert('Error', 'Could not decline the request.');
                                                        }
                                                      })();
                                                    },
                                                  },
                                                ],
                                                'plain-text'
                                              );
                                            }}
                                          >
                                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Decline</Text>
                                          </TouchableOpacity>
                                        </View>
                                      )}
                                    </View>
                                  ))}
                                  </>
                                );
                              })()}
                            </>
                          ) : (
                            // Show Subfolders for other buttons
                            <>
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
                              
                              <View style={styles.addSubfolderContainer}>
                                <Text style={styles.inputLabel}>Create New Folder:</Text>
                                <TextInput
                                  style={styles.subfolderInput}
                                  placeholder="Enter folder name"
                                  value={newSubfolderName[buttonName] || ''}
                                  onChangeText={(text) => setNewSubfolderName({ ...newSubfolderName, [buttonName]: text })}
                                  onSubmitEditing={() => handleAddSubfolder(buttonName)}
                                  returnKeyType="done"
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
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          ) : (
            // ========== MATERIAL REQUEST TAB ==========
            <View style={{ flex: 1 }}>
              {/* Create button - only for regular users */}
              {!canManageFolders && (
                <TouchableOpacity
                  style={styles.createRequestButton}
                  onPress={handleCreateMaterialRequest}
                >
                  <Ionicons name="add-circle" size={24} color="white" />
                  <Text style={styles.createRequestButtonText}>Create New Material Request</Text>
                </TouchableOpacity>
              )}

              {/* Header with title */}
              <View style={styles.materialListHeader}>
                <Text style={styles.materialListTitle}>
                  {canManageFolders ? 'All Material Requests' : 'My Material Requests'}
                </Text>
                <TouchableOpacity onPress={onRefreshMaterials}>
                  <Ionicons name="refresh" size={20} color="#228B22" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              {materialLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading material requests...</Text>
                </View>
              ) : (() => {
                // Filter requests by project and user type
                const filteredRequests = materialRequests.filter(req => {
                  // First filter by project - only show requests for current project
                  const currentProjectName = projectNameParam?.trim();
                  const requestProjectName = req.project_name?.trim();
                  
                  if (currentProjectName) {
                    // If current project has a name, only show requests that match (case-insensitive)
                    if (requestProjectName) {
                      if (requestProjectName.toLowerCase() !== currentProjectName.toLowerCase()) {
                        return false; // Not for this project
                      }
                    } else {
                      // Request doesn't have project name but current project does - exclude
                      return false;
                    }
                  }
                  
                  // For regular users, only show their own requests
                  if (!canManageFolders && user) {
                    return req.requested_by_id === user.id;
                  }
                  // For HR/Manager/COO, show all requests for this project
                  return true;
                });
                
                return filteredRequests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="cube-outline" size={64} color="#999" />
                    <Text style={styles.emptyText}>No material requests</Text>
                    <Text style={styles.emptySubtext}>
                      {canManageFolders 
                        ? 'No material requests have been submitted yet for this project' 
                        : 'Tap the button above to create a new request'
                      }
                    </Text>
                  </View>
                ) : (
                  <ScrollView 
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                      <RefreshControl refreshing={refreshing} onRefresh={onRefreshMaterials} colors={['#228B22']} />
                    }
                  >
                    {filteredRequests.map((item) => (
                    <View key={item.id} style={styles.requestCard}>
                      <View style={styles.requestHeader}>
                        <View style={styles.requestInfo}>
                          <Text style={styles.requestTitle}>Request #{item.id}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                          </View>
                        </View>
                        <View style={styles.headerRight}>
                          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                            <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.requestDate}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.requestDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Requested by:</Text>
                          <Text style={styles.detailValue}>{item.requested_by_name} {item.requested_by_position ? `(${item.requested_by_position})` : ''}</Text>
                        </View>
                        {item.project_name && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Project:</Text>
                            <Text style={styles.detailValue}>{item.project_name}</Text>
                          </View>
                        )}
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Date Needed:</Text>
                          <Text style={styles.detailValue}>
                            {new Date(item.date_needed).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Items:</Text>
                          <Text style={styles.detailValue}>{item.materials?.length || 0} item(s)</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.purposeLabel}>Purpose:</Text>
                      <Text style={styles.purposeText} numberOfLines={2}>
                        {item.purpose}
                      </Text>

                      <View style={styles.materialsList}>
                        <Text style={styles.materialsTitle}>Materials:</Text>
                        {item.materials?.slice(0, 3).map((material, index) => (
                          <Text key={index} style={styles.materialItem}>
                            • {material.quantity} {material.unit} - {material.item_name}
                          </Text>
                        ))}
                        {item.materials && item.materials.length > 3 && (
                          <Text style={styles.moreItems}>+{item.materials.length - 3} more items...</Text>
                        )}
                      </View>

                      {/* HR/Manager/COO approve/decline buttons */}
                      {canManageFolders && item.status === 'pending' && (
                        <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                          <TouchableOpacity
                            style={{ backgroundColor: '#4CAF50', padding: 8, borderRadius: 5 }}
                            onPress={async () => {
                              try {
                                await updateMaterialRequestStatus(item.id, 'approved', isHR ? 'hr' : 'manager_coo', 'Approved');
                                Alert.alert('Success', 'Request approved.');
                                loadMaterialRequests();
                              } catch (err) {
                                Alert.alert('Error', 'Could not approve the request.');
                              }
                            }}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ backgroundColor: '#f44336', padding: 8, borderRadius: 5 }}
                            onPress={() => {
                              Alert.prompt(
                                'Decline Request',
                                'Enter reason for declining this request:',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Decline',
                                    style: 'destructive',
                                    onPress: (rejectionReason?: string) => {
                                      (async () => {
                                        try {
                                          await updateMaterialRequestStatus(item.id, 'rejected', isHR ? 'hr' : 'manager_coo', rejectionReason || 'No reason provided');
                                          Alert.alert('Success', 'Request declined.');
                                          loadMaterialRequests();
                                        } catch (err) {
                                          Alert.alert('Error', 'Could not decline the request.');
                                        }
                                      })();
                                    },
                                  },
                                ],
                                'plain-text'
                              );
                            }}
                          >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                    <View style={{ height: 40 }} />
                  </ScrollView>
                );
              })()}
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
    backgroundColor: 'white',
  },
  activeTab: {
    backgroundColor: '#228B22',
  },
  materialTab: {
    backgroundColor: 'white',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
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
  // Material Request Styles
  materialRequestContent: {
    flex: 1,
    paddingHorizontal: 4,
  },
  createRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#228B22',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  createRequestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  materialListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  materialListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
  },
  requestDate: {
    fontSize: 11,
    color: '#666',
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 100,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  purposeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  purposeText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
    marginBottom: 12,
  },
  materialsList: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
  },
  materialsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 6,
  },
  materialItem: {
    fontSize: 11,
    color: '#333',
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
