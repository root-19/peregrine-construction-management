import AddItemModal from '@/components/AddItemModal';
import AssignUserModal from '@/components/AssignUserModal';
import { useUser } from '@/contexts/UserContext';
import { useDatabase } from '@/hooks/use-database';
import { deleteProjectFolder, getMaterialRequests, getMyMaterialRequests, getProjectFolders, getProjectFoldersForUser, getSubfolders, insertProjectFolder, insertSubfolder, updateMaterialRequestStatus, updateProjectFolder } from '@/services/api';
import { MaterialRequest, ProjectFolder, Subfolder } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, ImageBackground, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function FolderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    folderId: string | string[];
    folderName: string | string[];
    projectId: string | string[];
    projectName: string | string[];
  }>();
  
  // Normalize params to always be strings (handle both string and array cases)
  const folderIdParam = Array.isArray(params.folderId) ? params.folderId[0] : params.folderId;
  const folderNameParam = Array.isArray(params.folderName) ? params.folderName[0] : params.folderName;
  const projectIdParam = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const projectNameParam = Array.isArray(params.projectName) ? params.projectName[0] : params.projectName;
  
  // Store params in state to persist them
  const [folderId, setFolderId] = useState<string | undefined>(folderIdParam);
  const [folderName, setFolderName] = useState<string | undefined>(folderNameParam);
  const [projectId, setProjectId] = useState<string | undefined>(projectIdParam);
  const [projectName, setProjectName] = useState<string | undefined>(projectNameParam);
  
  const { isInitialized } = useDatabase();
  const { user, isHR } = useUser();
  
  // Debug: Log when folderId changes
  useEffect(() => {
    const currentFolderId = folderId || folderIdParam;
    const currentProjectId = projectId || projectIdParam;
    console.log('🔍 Folder Detail Screen State:', {
      folderId,
      folderIdParam,
      currentFolderId,
      projectId,
      projectIdParam,
      currentProjectId,
      isInitialized,
      hasFolderId: !!(folderId || folderIdParam),
    });
  }, [folderId, folderIdParam, projectId, projectIdParam, isInitialized]);
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'MATERIAL REQUEST'>('DOCUMENTS');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState<string>(folderNameParam || '');
  const [loading, setLoading] = useState(true);
  
  // Update state when params change
  useEffect(() => {
    if (folderIdParam) setFolderId(folderIdParam);
    if (folderNameParam) setFolderName(folderNameParam);
    if (projectIdParam) setProjectId(projectIdParam);
    if (projectNameParam) setProjectName(projectNameParam);
  }, [folderIdParam, folderNameParam, projectIdParam, projectNameParam]);
  
  // Track expanded buttons and their subfolders
  const [expandedButton, setExpandedButton] = useState<string | null>(null);
  const [subfolders, setSubfolders] = useState<{ [key: string]: Subfolder[] }>({});
  const [newSubfolderName, setNewSubfolderName] = useState<{ [key: string]: string }>({});
  const [showAddInput, setShowAddInput] = useState<{ [key: string]: boolean }>({});
  
  // State for folders (when showing folders list instead of subfolders)
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  
  // State for subfolder assignment modal
  const [showAssignSubfolderModal, setShowAssignSubfolderModal] = useState(false);
  const [selectedSubfolder, setSelectedSubfolder] = useState<Subfolder | null>(null);

  // Material Request states
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);

  // Check if user is Manager or COO
  const isManagerOrCOO =
    user?.company_position?.toLowerCase().includes('manager') ||
    user?.company_position?.toLowerCase().includes('coo') ||
    user?.position?.toLowerCase().includes('manager') ||
    user?.position?.toLowerCase().includes('coo');

  // HR, Manager, and COO can manage folders
  const canManageFolders = isHR || isManagerOrCOO;

  // Load folders assigned to user (when no folderId is provided)
  const loadFolders = async () => {
    const currentProjectId = projectId || projectIdParam;
    
    if (!currentProjectId) {
      console.warn('⚠️ Cannot load folders - missing projectId:', { projectId, projectIdParam });
      return;
    }
    
    try {
      const projectIdNum = parseInt(currentProjectId);
      let projectFolders: ProjectFolder[] = [];
      
      // If user is HR or Manager/COO, show all folders. If regular user, show only assigned folders
      if (canManageFolders) {
        projectFolders = await getProjectFolders(projectIdNum, undefined);
      } else if (user) {
        // For regular users, get only folders assigned to them
        projectFolders = await getProjectFoldersForUser(user.id, projectIdNum);
        // Show only root folders (no parent)
        projectFolders = projectFolders.filter(f => !f.parent_folder_id);
      }
      
      // If no folders exist, create a default "Root" folder and navigate to it
      if (projectFolders.length === 0) {
        try {
          const newFolderId = await insertProjectFolder(projectIdNum, 'Root', undefined);
          console.log('📁 Created default Root folder:', newFolderId);
          // Set the folder state to show DOCUMENTS/MATERIAL REQUEST tabs
          setFolderId(newFolderId.toString());
          setFolderName('Root');
          // Load subfolders for this new folder
          await loadAllSubfolders();
          return;
        } catch (error) {
          console.error('Error creating default folder:', error);
        }
      }
      
      // If there's exactly one folder (Root), automatically navigate to it to show tabs
      if (projectFolders.length === 1) {
        const rootFolder = projectFolders[0];
        console.log('📁 Auto-navigating to single folder:', rootFolder.name);
        setFolderId(rootFolder.id.toString());
        setFolderName(rootFolder.name);
        // Load subfolders for this folder
        await loadAllSubfolders();
        return;
      }
      
      // Multiple folders exist - show the list (but filter Root for Manager/COO)
      if (isManagerOrCOO && !isHR) {
        projectFolders = projectFolders.filter(f => f.name.toLowerCase() !== 'root');
      }
      
      setFolders(projectFolders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
      setFolders([]);
    }
  };

  // Load all subfolders automatically (not tied to a specific button)
  const loadAllSubfolders = async () => {
    const currentProjectId = projectId || projectIdParam;
    const currentFolderId = folderId || folderIdParam;
    
    if (!currentProjectId) {
      console.warn('⚠️ Cannot load subfolders - missing projectId:', { projectId, projectIdParam });
      return;
    }
    
    try {
      const projectIdNum = parseInt(currentProjectId);
      
      // Get all subfolders from the new subfolders table
      // Query by project_id only - subfolders are project-wide, not folder-specific
      // All subfolders for a project should be visible regardless of which folder you're viewing
      const allSubfolders = await getSubfolders(undefined, projectIdNum);
      
      console.log(`🔍 Query params: project_id=${projectIdNum} (querying all subfolders for project)`);
      console.log(`🔍 API returned ${allSubfolders.length} subfolders:`, allSubfolders.map(sf => ({
        id: sf.id,
        name: sf.name,
        button_name: sf.button_name,
        project_folder_id: sf.project_folder_id,
        project_id: sf.project_id
      })));
      
      // Filter out subfolders if their parent folder is named 'Root' and the user is Manager/COO
      const filteredSubfolders = (isManagerOrCOO && folderNameParam === 'Root')
        ? [] // If current folder is 'Root' and user is Manager/COO, show no subfolders
        : allSubfolders;
      
      console.log(`📁 Loaded ${filteredSubfolders.length} subfolders for ${currentFolderId ? `project_folder_id ${currentFolderId}` : `project ID ${projectIdNum}`}`);
      console.log(`📁 Subfolders:`, filteredSubfolders.map(f => ({ id: f.id, name: f.name, button_name: f.button_name, project_folder_id: f.project_folder_id })));
      
      // Group subfolders by button name
      const subfoldersMap: { [key: string]: Subfolder[] } = {};
      ['Procurement', 'Community Relations', 'Permits and Licenses', 'Admin'].forEach(btn => {
        // Filter subfolders for this button (case-insensitive comparison)
        subfoldersMap[btn] = filteredSubfolders.filter(sf => 
          sf.button_name && sf.button_name.trim().toLowerCase() === btn.toLowerCase()
        );
        console.log(`📁 ${btn}: ${subfoldersMap[btn].length} subfolders`, subfoldersMap[btn].map(sf => sf.name));
      });
      console.log(`📁 Final subfolders map:`, Object.keys(subfoldersMap).map(key => `${key}: ${subfoldersMap[key].length}`));
      setSubfolders(subfoldersMap);
    } catch (error) {
      console.error('Error loading subfolders:', error);
      setSubfolders({});
    }
  };

  // Auto-create Root folder if none exists for HR/Manager/COO
  useEffect(() => {
    const autoCreateRootFolder = async () => {
      const currentFolderId = folderId || folderIdParam;
      const currentProjectId = projectId || projectIdParam;
      
      // Only auto-create if: no folderId, has projectId, is HR/Manager/COO, is initialized, and folders list is empty
      if (!currentFolderId && currentProjectId && canManageFolders && isInitialized && folders.length === 0 && !loading) {
        try {
          const projectIdNum = parseInt(currentProjectId);
          // Check if folders exist first
          const existingFolders = await getProjectFolders(projectIdNum, undefined);
          if (existingFolders.length === 0) {
            const newFolderId = await insertProjectFolder(projectIdNum, 'Root', undefined);
            console.log('📁 Auto-created Root folder:', newFolderId);
            setFolderId(newFolderId.toString());
            setFolderName('Root');
            await loadAllSubfolders();
          }
        } catch (error) {
          console.error('Error auto-creating Root folder:', error);
        }
      }
    };
    
    if (isInitialized) {
      const timer = setTimeout(() => {
        autoCreateRootFolder();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, projectId, projectIdParam, folderId, folderIdParam, canManageFolders, folders.length, loading]);

  // Wait for API initialization and load all subfolders automatically
  useEffect(() => {
    // Always set loading to false after a reasonable delay
    const timer = setTimeout(async () => {
      setLoading(false);
      
      const currentFolderId = folderId || folderIdParam;
      const currentProjectId = projectId || projectIdParam;
      
      // Check if we have at least projectId (folderId is optional - if missing, show root folders)
      if (!currentProjectId) {
        console.error('❌ CRITICAL: Project ID is missing!', { 
          folderId, 
          folderIdParam, 
          projectId, 
          projectIdParam,
          allParams: params 
        });
        Alert.alert(
          'Error',
          'Project ID is missing. Please go back and select a project.',
          [
            {
              text: 'Go Back',
              onPress: () => router.back(),
            },
          ]
        );
        return;
      }
      
      // Automatically load folders or subfolders based on whether folderId exists
      if (currentProjectId && isInitialized) {
        try {
          if (!currentFolderId) {
            // No folderId: show folders assigned to user
            await loadFolders();
          } else {
            // Has folderId: show subfolders within that folder
            await loadAllSubfolders();
          }
        } catch (error) {
          console.error('Error loading data on init:', error);
        }
      } else {
        console.warn('⚠️ Screen initialized but missing params:', { 
          isInitialized, 
          projectId: currentProjectId, 
          folderId: currentFolderId,
          folderIdParam,
          projectIdParam,
          allParams: params
        });
      }
    }, isInitialized ? 300 : 1000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [isInitialized, projectId, folderId, folderIdParam, projectIdParam, params, router]);

  const handleBack = () => {
    router.back();
  };

  const handleRenameFolder = () => {
    setFolderNameInput(folderName || folderNameParam || '');
    setShowRenameModal(true);
  };

  const handleSaveRename = async () => {
    const currentFolderId = folderId || folderIdParam;
    
    if (!folderNameInput.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }
    
    if (!currentFolderId) {
      Alert.alert('Error', 'Folder ID is missing');
      return;
    }
    
    try {
      const folderIdNum = parseInt(currentFolderId);
      if (isNaN(folderIdNum)) {
        Alert.alert('Error', 'Invalid folder ID');
        return;
      }
      
      await updateProjectFolder(folderIdNum, folderNameInput.trim());
      setShowRenameModal(false);
      Alert.alert('Success', 'Folder renamed successfully');
      // Navigate back to refresh
      router.back();
    } catch (error) {
      console.error('Error renaming folder:', error);
      Alert.alert('Error', 'Failed to rename folder');
    }
  };

  const handleDeleteFolder = () => {
    const currentFolderId = folderId || folderIdParam;
    if (!currentFolderId) {
      Alert.alert('Error', 'Folder ID is missing');
      return;
    }
    
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folderName || folderNameParam}"? This action cannot be undone.`,
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
              const folderIdNum = parseInt(currentFolderId);
              if (isNaN(folderIdNum)) {
                Alert.alert('Error', 'Invalid folder ID');
                return;
              }
              await deleteProjectFolder(folderIdNum);
              Alert.alert('Success', 'Folder deleted successfully');
              router.back();
            } catch (error) {
              console.error('Error deleting folder:', error);
              Alert.alert('Error', 'Failed to delete folder');
            }
          },
        },
      ]
    );
  };

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

  const handleButtonPress = async (buttonName: string) => {
    // Toggle expansion
    if (expandedButton === buttonName) {
      setExpandedButton(null);
      setShowAddInput({ ...showAddInput, [buttonName]: false });
    } else {
      setExpandedButton(buttonName);
      // Show input field automatically when button is expanded
      setShowAddInput({ ...showAddInput, [buttonName]: true });
      setNewSubfolderName({ ...newSubfolderName, [buttonName]: '' });
      // Reload all subfolders when button is expanded
      await loadAllSubfolders();
      // Load material requests if Procurement is clicked
      if (buttonName === 'Procurement') {
        loadMaterialRequests();
      }
    }
  };

  const loadSubfolders = async (buttonName: string) => {
    // Just reload all subfolders (same for all buttons)
    await loadAllSubfolders();
  };

  const handleAddSubfolder = async (buttonName: string) => {
    const name = newSubfolderName[buttonName]?.trim();
    
    // Use state values, fallback to params if state is missing
    const currentFolderId = folderId || folderIdParam;
    const currentProjectId = projectId || projectIdParam;
    
    console.log('🔍 Adding subfolder:', {
      buttonName,
      name,
      folderId,
      folderIdParam,
      currentFolderId,
      projectId,
      projectIdParam,
      currentProjectId,
      allParams: params
    });
    
    if (!name) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }
    
    if (!currentProjectId) {
      console.error('❌ Project ID is missing');
      Alert.alert('Error', 'Project ID is missing. Please navigate back and try again.');
      return;
    }

    try {
      const projectIdNum = parseInt(currentProjectId);
      
      if (isNaN(projectIdNum)) {
        console.error('❌ Invalid project ID:', { projectIdNum, currentProjectId });
        Alert.alert('Error', 'Invalid project ID');
        return;
      }
      
      // Get or create project_folder_id from project_folders table
      let projectFolderId: number;
      
      if (currentFolderId) {
        // Use the provided folderId as project_folder_id
        projectFolderId = parseInt(currentFolderId);
        if (isNaN(projectFolderId)) {
          console.error('❌ Invalid folder ID:', { projectFolderId, currentFolderId });
          Alert.alert('Error', 'Invalid folder ID');
          return;
        }
      } else {
        // Get the first root folder (parent_folder_id IS NULL) for this project
        // If none exists, create one
        const rootFolders = await getProjectFolders(projectIdNum, undefined);
        if (rootFolders.length > 0) {
          projectFolderId = rootFolders[0].id;
          console.log(`📁 Using existing root folder ID: ${projectFolderId}`);
        } else {
          // Create a root folder for this project
          projectFolderId = await insertProjectFolder(projectIdNum, 'Root', undefined);
          console.log(`📁 Created new root folder ID: ${projectFolderId}`);
        }
      }
      
      console.log(`💾 Saving subfolder to database:`, {
        project_folder_id: projectFolderId,
        project_id: projectIdNum,
        name: name,
        button_name: buttonName
      });
      
      // Insert subfolder into the new subfolders table using project_folder_id
      const newSubfolderId = await insertSubfolder(
        projectFolderId,
        projectIdNum,
        name,
        buttonName // Store which button category this subfolder belongs to
      );
      
      console.log(`✅ Subfolder saved to database:`, {
        new_subfolder_id: newSubfolderId,
        name: name,
        project_folder_id: projectFolderId,
        project_id: projectIdNum,
        button_name: buttonName,
        table: 'subfolders'
      });
      
      // Clear input (keep form visible)
      setNewSubfolderName({ ...newSubfolderName, [buttonName]: '' });
      
      // Reload all subfolders to show the newly added one
      // Add a small delay to ensure the database has been updated
      setTimeout(async () => {
        await loadAllSubfolders();
      }, 500);
      
      Alert.alert('Success', `Subfolder "${name}" added successfully to database`);
    } catch (error) {
      console.error('❌ Error adding subfolder to database:', error);
      Alert.alert('Error', `Failed to add subfolder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleShowAddInput = (buttonName: string) => {
    if (!canManageFolders) {
      Alert.alert('Permission Denied', 'You do not have permission to add subfolders');
      return;
    }
    setShowAddInput({ ...showAddInput, [buttonName]: true });
    setNewSubfolderName({ ...newSubfolderName, [buttonName]: '' });
  };

  const handleSubfolderPress = (subfolder: Subfolder) => {
    // Navigate to document-system page for all users
    const currentProjectId = projectId || projectIdParam;
    const currentProjectName = projectName || projectNameParam || '';
    router.push({
      pathname: '/document-system',
      params: {
        folderId: subfolder.project_folder_id.toString(),
        subfolderId: subfolder.id.toString(),
        subfolderName: subfolder.name,
        projectId: currentProjectId || '',
        projectName: currentProjectName,
      },
    } as any);
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
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {(() => {
              const displayName = folderName || folderNameParam || projectName || projectNameParam || 'Project Folders';
              // Hide "Root" folder name from Manager/COO (but show it to HR)
              if (isManagerOrCOO && !isHR && displayName.toLowerCase() === 'root') {
                return projectName || projectNameParam || 'Project Folders';
              }
              return displayName;
            })()}
          </Text>
          <View style={styles.headerActions}>
            {/* Edit and Delete icons - only for HR/Manager/COO */}
            {canManageFolders && (
              <>
                <TouchableOpacity style={styles.actionButton} onPress={handleRenameFolder}>
                  <Ionicons name="create-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleDeleteFolder}>
                  <Ionicons name="trash-outline" size={24} color="white" />
                </TouchableOpacity>
              </>
            )}
            {/* Navigate to Documents/Material Request - for ALL accounts */}
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={async () => {
                // If no folderId, create or get Root folder first
                if (!(folderId || folderIdParam)) {
                  const currentProjectId = projectId || projectIdParam;
                  if (currentProjectId) {
                    try {
                      const projectIdNum = parseInt(currentProjectId);
                      const existingFolders = await getProjectFolders(projectIdNum, undefined);
                      
                      if (existingFolders.length > 0) {
                        // Use first existing folder
                        setFolderId(existingFolders[0].id.toString());
                        setFolderName(existingFolders[0].name);
                      } else {
                        // Create Root folder
                        const newFolderId = await insertProjectFolder(projectIdNum, 'Root', undefined);
                        setFolderId(newFolderId.toString());
                        setFolderName('Root');
                      }
                      await loadAllSubfolders();
                    } catch (error) {
                      console.error('Error navigating to documents:', error);
                      Alert.alert('Error', 'Failed to load documents. Please try again.');
                    }
                  }
                }
                // If already has folderId, the tabs are already shown
              }}
            >
              <Ionicons name="chevron-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : !(projectId || projectIdParam) ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Project ID is missing. Please go back and select a project.</Text>
              <TouchableOpacity 
                style={styles.backButtonContainer}
                onPress={handleBack}
              >
                <Text style={styles.backButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          ) : !(folderId || folderIdParam) ? (
            // Show folders list when no folderId is provided (user clicked project from dashboard)
            <>
              {folders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-outline" size={64} color="#999" />
                  <Text style={styles.emptyText}>No folders assigned yet</Text>
                  <Text style={styles.emptySubtext}>
                    {canManageFolders 
                      ? 'Creating Root folder automatically...' 
                      : 'Contact your HR to get assigned to folders'}
                  </Text>
                </View>
              ) : (
                <View style={styles.foldersListContainer}>
                  {folders.map((folder) => (
                    <TouchableOpacity
                      key={folder.id}
                      style={styles.folderCard}
                      onPress={() => {
                        // Navigate to folder-detail with folderId to show subfolders
                        router.push(`/folder-detail?folderId=${folder.id}&folderName=${encodeURIComponent(folder.name)}&projectId=${projectId || projectIdParam}&projectName=${encodeURIComponent(projectName || projectNameParam || '')}`);
                      }}
                    >
                      <View style={styles.folderCardContent}>
                        <Ionicons name="folder" size={32} color="#228B22" style={styles.folderIcon} />
                        <Text style={styles.folderName}>{folder.name}</Text>
                        <Ionicons name="chevron-forward" size={24} color="#999" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            // Show buttons (Procurement, Community Relations, etc.) when folderId exists
            <>
              {/* Tabs */}
              <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'DOCUMENTS' && styles.activeTab]}
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
                    projectName: projectNameParam || projectName || '',
                    projectId: projectIdParam || projectId || '',
                  },
                } as any)}
              >
                <Text style={[styles.tabText, activeTab === 'MATERIAL REQUEST' && styles.activeTabText]}>
                  MATERIAL REQUEST
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {['Procurement', 'Community Relations', 'Permits and Licenses', 'Admin'].map((buttonName) => (
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
                            const currentProjectName = (projectNameParam || projectName)?.trim();
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
                          
                          console.log('📦 Filtered material requests for Procurement (folder-detail):', {
                            currentProject: projectNameParam || projectName,
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
                            <ScrollView style={{ maxHeight: 400 }}>
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
                            </ScrollView>
                          );
                        })()}
                      </>
                    ) : (
                      // Show Subfolders for other buttons
                      <>
                        {/* Subfolders list - shows all folders with this folder as parent */}
                        {subfolders[buttonName] && subfolders[buttonName].length > 0 ? (
                          subfolders[buttonName].map((subfolder) => (
                            <TouchableOpacity
                              key={subfolder.id}
                              style={styles.subfolderItem}
                              onPress={() => handleSubfolderPress(subfolder)}
                              disabled={!canManageFolders}
                            >
                              <Ionicons name="folder" size={20} color="#228B22" style={styles.folderIcon} />
                              <Text style={styles.subfolderText}>{subfolder.name}</Text>
                              {canManageFolders && (
                                <Ionicons name="people-outline" size={18} color="#228B22" style={styles.assignIcon} />
                              )}
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={styles.emptySubfolderContainer}>
                            <Text style={styles.emptySubfolderText}>No subfolders yet</Text>
                          </View>
                        )}
                        
                        {/* Input field to create new folder - shows automatically when button is expanded */}
                        {canManageFolders && (
                          <View style={styles.addSubfolderContainer}>
                            <Text style={styles.inputLabel}>Create New Folder:</Text>
                            <TextInput
                              style={styles.subfolderInput}
                              placeholder="Enter project/folder name"
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
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
            </>
          )}
        </View>
      </View>

      {canManageFolders && (
        <>
          <AddItemModal
            visible={showRenameModal}
            title="Rename Folder"
            placeholder="Enter new folder name"
            value={folderNameInput}
            onChangeText={setFolderNameInput}
            onClose={() => {
              setShowRenameModal(false);
              setFolderNameInput(folderName || '');
            }}
            onSave={handleSaveRename}
            buttonText="Save"
          />
          {selectedSubfolder && (
            <AssignUserModal
              visible={showAssignSubfolderModal}
              folderId={selectedSubfolder.project_folder_id}
              folderName={selectedSubfolder.name}
              onClose={() => {
                setShowAssignSubfolderModal(false);
                setSelectedSubfolder(null);
              }}
              onSuccess={() => {
                // Reload subfolders to refresh any changes
                loadAllSubfolders();
              }}
            />
          )}
        </>
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#000',
    borderBottomWidth: 0,
    alignItems: 'center',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  activeTab: {
    backgroundColor: 'white',
    borderColor: '#000',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textTransform: 'uppercase',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  buttonsContainer: {
    gap: 16,
    marginTop: 20,
  },
  buttonWrapper: {
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  assignIcon: {
    marginLeft: 8,
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
  addSubfolderTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  addSubfolderTriggerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#228B22',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptySubfolderContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptySubfolderText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptySubfolderHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  backButtonContainer: {
    marginTop: 20,
    backgroundColor: '#228B22',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  foldersListContainer: {
    flex: 1,
    paddingTop: 10,
  },
  folderCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  folderCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  folderName: {
    flex: 1,
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
  },
  // Material Request Styles
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

