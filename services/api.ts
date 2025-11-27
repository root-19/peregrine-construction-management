import { HRAccount, ManagerCOOAccount, Position, Procurement, Project, ProjectFolder, Subfolder, User } from '@/peregrineDB/types';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';

// Token storage
let authToken: string | null = null;
let accountType: 'user' | 'hr' | 'manager_coo' | null = null;

// Storage keys
const AUTH_TOKEN_KEY = 'auth_token';
const ACCOUNT_TYPE_KEY = 'account_type';

// Helper function to get headers
const getHeaders = (includeAuth: boolean = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (includeAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
};

// Helper function to create a timeout promise
const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
};

// API request helper with timeout and better error handling
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = 30000 // 30 seconds default timeout (increased for physical devices)
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    // Create fetch promise with timeout
    const fetchPromise = fetch(url, {
      ...options,
      headers: {
        ...getHeaders(!endpoint.includes(API_ENDPOINTS.LOGIN)),
        ...(options.headers || {}),
      },
    });

    // Race between fetch and timeout
    const response = await Promise.race([
      fetchPromise,
      createTimeout(timeout),
    ]) as Response;

    // Get response text first to check if it's valid JSON
    const responseText = await response.text();
    
    // Check content type
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    if (!response.ok) {
      // Try to parse as JSON, if fails, show the raw response
      let error;
      if (isJson) {
        try {
          error = JSON.parse(responseText);
        } catch (e) {
          // JSON parse failed even though content-type says JSON
          console.error('❌ Failed to parse JSON error response:');
          console.error('Status:', response.status);
          console.error('Content-Type:', contentType);
          console.error('Response (first 500 chars):', responseText.substring(0, 500));
          throw new Error(`Server returned invalid JSON (${response.status}): ${responseText.substring(0, 200)}`);
        }
      } else {
        // Not JSON - might be HTML error page or PHP error
        console.error('❌ Server returned non-JSON response:');
        console.error('Status:', response.status);
        console.error('Content-Type:', contentType);
        console.error('Response (first 500 chars):', responseText.substring(0, 500));
        
        // Try to extract error message from HTML
        const errorMatch = responseText.match(/<title>(.*?)<\/title>/i) || 
                          responseText.match(/<h1>(.*?)<\/h1>/i) ||
                          responseText.match(/Error: (.*?)(?:\n|<)/i);
        const errorMsg = errorMatch ? errorMatch[1] : responseText.substring(0, 200);
        
        throw new Error(`Server error (${response.status}): ${errorMsg}`);
      }
      throw new Error(error.message || error.error || error.errors || `HTTP error! status: ${response.status}`);
    }

    // Parse JSON response
    if (!isJson) {
      console.warn('⚠️ Response is not JSON but status is OK. Content-Type:', contentType);
      console.warn('Response (first 200 chars):', responseText.substring(0, 200));
    }
    
    try {
      return JSON.parse(responseText);
    } catch (parseError: any) {
      console.error('❌ Failed to parse JSON response:');
      console.error('Content-Type:', contentType);
      console.error('Response text (first 500 chars):', responseText.substring(0, 500));
      console.error('Parse error:', parseError.message);
      throw new Error(`Invalid JSON response from server. Expected JSON but got: ${contentType}. Response: ${responseText.substring(0, 200)}`);
    }
  } catch (error: any) {
    // Handle timeout errors
    if (error.message && error.message.includes('timeout')) {
      const errorMsg = `Connection timeout: Cannot reach server at ${API_BASE_URL}\n\n` +
        `Troubleshooting:\n` +
        `1. Check Windows Firewall - Allow port 8000 (see FIREWALL_FIX.md)\n` +
        `2. Verify phone and computer are on SAME WiFi network\n` +
        `3. Test in phone browser: http://192.168.1.7:8000\n` +
        `4. Make sure Laravel is running: php artisan serve --host=0.0.0.0 --port=8000`;
      console.error('⏱️', errorMsg);
      throw new Error(errorMsg);
    }

    // Handle network connection errors
    if (error.message === 'Network request failed' || 
        error.message.includes('fetch') || 
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError')) {
      
      // Simplified error message
      const errorMsg = `Cannot connect to server at ${API_BASE_URL}\n\nPlease check:\n1. Server is running\n2. Network connection is active\n3. Server URL is correct`;
      console.error('❌ Network Error:', errorMsg);
      
      throw new Error(errorMsg);
    }
    
    // Re-throw other errors
    throw error;
  }
};

// ========== AUTH FUNCTIONS ==========

export const login = async (
  email: string,
  password: string,
  accountTypeParam: 'user' | 'hr' | 'manager_coo'
): Promise<{ account: User | HRAccount | ManagerCOOAccount; token: string; account_type: string }> => {
  const response = await apiRequest<{ account: any; token: string; account_type: string }>(API_ENDPOINTS.LOGIN, {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      account_type: accountTypeParam,
    }),
  });

  authToken = response.token;
  accountType = accountTypeParam;

  // Store token in SecureStore for persistence
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.token);
    await SecureStore.setItemAsync(ACCOUNT_TYPE_KEY, accountTypeParam);
  } catch (error) {
    console.error('Error storing auth token:', error);
  }

  return response;
};

export const logout = async (): Promise<void> => {
  try {
    await apiRequest(API_ENDPOINTS.LOGOUT, {
      method: 'POST',
    });
  } finally {
    authToken = null;
    accountType = null;
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(ACCOUNT_TYPE_KEY);
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }
};

export const getMe = async (): Promise<any> => {
  return apiRequest(API_ENDPOINTS.ME);
};

// Initialize token from storage
export const initializeAuth = async () => {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    const type = await SecureStore.getItemAsync(ACCOUNT_TYPE_KEY);
    if (token) {
      authToken = token;
      accountType = type as any;
    }
  } catch (error) {
    console.error('Error loading auth token:', error);
  }
};

// ========== USER FUNCTIONS ==========

export const getAllUsers = async (): Promise<User[]> => {
  return apiRequest<User[]>(API_ENDPOINTS.USERS);
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    return await apiRequest<User>(`${API_ENDPOINTS.USER_BY_EMAIL}?email=${encodeURIComponent(email)}`);
  } catch (error: any) {
    if (error.message.includes('404')) {
      return null;
    }
    throw error;
  }
};

export const getUsersByPosition = async (position: string): Promise<User[]> => {
  return apiRequest<User[]>(`${API_ENDPOINTS.USERS_BY_POSITION}?position=${encodeURIComponent(position)}`);
};

export const insertUser = async (
  name: string,
  last_name: string,
  email: string,
  password: string,
  company_name?: string,
  position?: string
): Promise<number> => {
  const user = await apiRequest<User>(API_ENDPOINTS.USERS, {
    method: 'POST',
    body: JSON.stringify({
      name,
      last_name,
      email,
      password,
      company_name,
      position,
    }),
  });
  return user.id;
};

export const updateUser = async (
  id: number,
  name: string,
  last_name: string,
  email: string,
  password?: string,
  position?: string
): Promise<void> => {
  await apiRequest(API_ENDPOINTS.USER_BY_ID(id), {
    method: 'PUT',
    body: JSON.stringify({
      name,
      last_name,
      email,
      password,
      position,
    }),
  });
};

export const deleteUser = async (id: number): Promise<void> => {
  await apiRequest(API_ENDPOINTS.USER_BY_ID(id), {
    method: 'DELETE',
  });
};

// ========== HR ACCOUNT FUNCTIONS ==========

export const getAllHRAccounts = async (): Promise<HRAccount[]> => {
  return apiRequest<HRAccount[]>(API_ENDPOINTS.HR_ACCOUNTS);
};

export const getHRAccountByEmail = async (email: string): Promise<HRAccount | null> => {
  try {
    return await apiRequest<HRAccount>(`${API_ENDPOINTS.HR_ACCOUNT_BY_EMAIL}?email=${encodeURIComponent(email)}`);
  } catch (error: any) {
    if (error.message.includes('404')) {
      return null;
    }
    throw error;
  }
};

export const insertHRAccount = async (
  name: string,
  last_name: string,
  email: string,
  password: string
): Promise<number> => {
  const account = await apiRequest<HRAccount>(API_ENDPOINTS.HR_ACCOUNTS, {
    method: 'POST',
    body: JSON.stringify({
      name,
      last_name,
      email,
      password,
    }),
  });
  return account.id;
};

export const updateHRAccount = async (
  id: number,
  name: string,
  last_name: string,
  email: string,
  password?: string,
  company_name?: string,
  position?: string
): Promise<void> => {
  await apiRequest(API_ENDPOINTS.HR_ACCOUNT_BY_ID(id), {
    method: 'PUT',
    body: JSON.stringify({
      name,
      last_name,
      email,
      password,
      company_name,
      position,
    }),
  });
};

export const deleteHRAccount = async (id: number): Promise<void> => {
  await apiRequest(API_ENDPOINTS.HR_ACCOUNT_BY_ID(id), {
    method: 'DELETE',
  });
};

// ========== MANAGER/COO ACCOUNT FUNCTIONS ==========

export const getAllManagerCOOAccounts = async (): Promise<ManagerCOOAccount[]> => {
  return apiRequest<ManagerCOOAccount[]>(API_ENDPOINTS.MANAGER_COO_ACCOUNTS);
};

export const getManagerCOOAccountByEmail = async (email: string): Promise<ManagerCOOAccount | null> => {
  try {
    return await apiRequest<ManagerCOOAccount>(`${API_ENDPOINTS.MANAGER_COO_ACCOUNT_BY_EMAIL}?email=${encodeURIComponent(email)}`);
  } catch (error: any) {
    if (error.message.includes('404')) {
      return null;
    }
    throw error;
  }
};

// ========== PROJECT FUNCTIONS ==========

export const getAllProjects = async (): Promise<Project[]> => {
  return apiRequest<Project[]>(API_ENDPOINTS.PROJECTS);
};

export const getProjectById = async (id: number): Promise<Project | null> => {
  try {
    return await apiRequest<Project>(API_ENDPOINTS.PROJECT_BY_ID(id));
  } catch (error: any) {
    if (error.message.includes('404')) {
      return null;
    }
    throw error;
  }
};

export const insertProject = async (
  name: string,
  created_by: number,
  description?: string
): Promise<number> => {
  const project = await apiRequest<Project>(API_ENDPOINTS.PROJECTS, {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      created_by,
    }),
  });
  return project.id;
};

export const updateProject = async (
  id: number,
  name: string,
  description?: string
): Promise<void> => {
  await apiRequest(API_ENDPOINTS.PROJECT_BY_ID(id), {
    method: 'PUT',
    body: JSON.stringify({
      name,
      description,
    }),
  });
};

export const deleteProject = async (id: number): Promise<void> => {
  await apiRequest(API_ENDPOINTS.PROJECT_BY_ID(id), {
    method: 'DELETE',
  });
};

// ========== PROJECT FOLDER FUNCTIONS ==========

export const getProjectFolders = async (
  project_id: number,
  parent_folder_id?: number
): Promise<ProjectFolder[]> => {
  const params = new URLSearchParams({ project_id: project_id.toString() });
  if (parent_folder_id !== undefined) {
    params.append('parent_folder_id', parent_folder_id.toString());
  }
  return apiRequest<ProjectFolder[]>(`${API_ENDPOINTS.PROJECT_FOLDERS}?${params.toString()}`);
};

export const insertProjectFolder = async (
  project_id: number,
  name: string,
  parent_folder_id?: number
): Promise<number> => {
  const folder = await apiRequest<ProjectFolder>(API_ENDPOINTS.PROJECT_FOLDERS, {
    method: 'POST',
    body: JSON.stringify({
      project_id,
      name,
      parent_folder_id,
    }),
  });
  return folder.id;
};

export const updateProjectFolder = async (id: number, name: string): Promise<void> => {
  await apiRequest(API_ENDPOINTS.PROJECT_FOLDER_BY_ID(id), {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
};

export const deleteProjectFolder = async (id: number): Promise<void> => {
  await apiRequest(API_ENDPOINTS.PROJECT_FOLDER_BY_ID(id), {
    method: 'DELETE',
  });
};

// ========== SUBFOLDER FUNCTIONS ==========

export const getSubfolders = async (
  project_folder_id?: number,
  project_id?: number,
  button_name?: string
): Promise<Subfolder[]> => {
  const params = new URLSearchParams();
  if (project_folder_id !== undefined) {
    params.append('project_folder_id', project_folder_id.toString());
  }
  if (project_id !== undefined) {
    params.append('project_id', project_id.toString());
  }
  if (button_name) {
    params.append('button_name', button_name);
  }
  return apiRequest<Subfolder[]>(`${API_ENDPOINTS.SUBFOLDERS}?${params.toString()}`);
};

export const insertSubfolder = async (
  project_folder_id: number,
  project_id: number,
  name: string,
  button_name: string
): Promise<number> => {
  const subfolder = await apiRequest<Subfolder>(API_ENDPOINTS.SUBFOLDERS, {
    method: 'POST',
    body: JSON.stringify({
      project_folder_id,
      project_id,
      name,
      button_name,
    }),
  });
  return subfolder.id;
};

export const updateSubfolder = async (id: number, name: string): Promise<void> => {
  await apiRequest(API_ENDPOINTS.SUBFOLDER_BY_ID(id), {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
};

export const deleteSubfolder = async (id: number): Promise<void> => {
  await apiRequest(API_ENDPOINTS.SUBFOLDER_BY_ID(id), {
    method: 'DELETE',
  });
};

// ========== POSITION FUNCTIONS ==========

export const getAllPositions = async (): Promise<string[]> => {
  const positions = await apiRequest<Position[]>(API_ENDPOINTS.POSITIONS);
  return positions.map(p => p.position).filter(p => p);
};

export const getAllPositionsFromTable = async (): Promise<Position[]> => {
  return apiRequest<Position[]>(API_ENDPOINTS.POSITIONS);
};

export const insertPosition = async (position: string): Promise<number> => {
  const pos = await apiRequest<Position>(API_ENDPOINTS.POSITIONS, {
    method: 'POST',
    body: JSON.stringify({ position }),
  });
  return pos.id;
};

export const deletePosition = async (id: number): Promise<void> => {
  await apiRequest(API_ENDPOINTS.POSITION_BY_ID(id), {
    method: 'DELETE',
  });
};

// ========== PROCUREMENT FUNCTIONS ==========

export const getProcurementByFolder = async (folder_id: number): Promise<Procurement[]> => {
  return apiRequest<Procurement[]>(`${API_ENDPOINTS.PROCUREMENT}?folder_id=${folder_id}`);
};

export const getProcurementByProject = async (project_id: number): Promise<Procurement[]> => {
  return apiRequest<Procurement[]>(`${API_ENDPOINTS.PROCUREMENT}?project_id=${project_id}`);
};

export const insertProcurement = async (
  project_id: number,
  folder_id: number,
  name: string,
  description?: string
): Promise<number> => {
  const procurement = await apiRequest<Procurement>(API_ENDPOINTS.PROCUREMENT, {
    method: 'POST',
    body: JSON.stringify({
      project_id,
      folder_id,
      name,
      description,
    }),
  });
  return procurement.id;
};

// ========== ASSIGNMENT FUNCTIONS ==========

export const assignUserToProject = async (project_id: number, user_id: number): Promise<number> => {
  const assignment = await apiRequest<any>(API_ENDPOINTS.ASSIGN_USER_TO_PROJECT, {
    method: 'POST',
    body: JSON.stringify({
      project_id,
      user_id,
    }),
  });
  return assignment.id;
};

export const unassignUserFromProject = async (project_id: number, user_id: number): Promise<void> => {
  await apiRequest(API_ENDPOINTS.UNASSIGN_USER_FROM_PROJECT, {
    method: 'DELETE',
    body: JSON.stringify({
      project_id,
      user_id,
    }),
  });
};

export const getAssignedUsersForProject = async (project_id: number): Promise<User[]> => {
  return apiRequest<User[]>(API_ENDPOINTS.ASSIGNED_USERS_FOR_PROJECT(project_id));
};

export const getProjectsForUser = async (user_id: number): Promise<Project[]> => {
  return apiRequest<Project[]>(API_ENDPOINTS.PROJECTS_FOR_USER(user_id));
};

export const assignUserToFolder = async (folder_id: number, user_id: number): Promise<number> => {
  const assignment = await apiRequest<any>(API_ENDPOINTS.ASSIGN_USER_TO_FOLDER, {
    method: 'POST',
    body: JSON.stringify({
      folder_id,
      user_id,
    }),
  });
  return assignment.id;
};

export const unassignUserFromFolder = async (folder_id: number, user_id: number): Promise<void> => {
  await apiRequest(API_ENDPOINTS.UNASSIGN_USER_FROM_FOLDER, {
    method: 'DELETE',
    body: JSON.stringify({
      folder_id,
      user_id,
    }),
  });
};

export const getAssignedUsersForFolder = async (folder_id: number): Promise<User[]> => {
  return apiRequest<User[]>(API_ENDPOINTS.ASSIGNED_USERS_FOR_FOLDER(folder_id));
};

export const getFoldersForUser = async (user_id: number): Promise<ProjectFolder[]> => {
  return apiRequest<ProjectFolder[]>(API_ENDPOINTS.FOLDERS_FOR_USER(user_id));
};

export const getProjectFoldersForUser = async (
  user_id: number,
  project_id: number
): Promise<ProjectFolder[]> => {
  return apiRequest<ProjectFolder[]>(`${API_ENDPOINTS.PROJECT_FOLDERS_FOR_USER(user_id)}?project_id=${project_id}`);
};

// ========== MESSAGE FUNCTIONS ==========

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender?: {
    id: number;
    name: string;
    last_name: string;
    email: string;
  };
  receiver?: {
    id: number;
    name: string;
    last_name: string;
    email: string;
  };
}

export const getMessages = async (userId: number, userType: 'user' | 'hr' | 'manager_coo' = 'user'): Promise<Message[]> => {
  return apiRequest<Message[]>(`${API_ENDPOINTS.MESSAGES_WITH_USER(userId)}?userType=${userType}`);
};

export const sendMessage = async (receiverId: number, receiverType: 'user' | 'hr' | 'manager_coo', message: string): Promise<Message> => {
  return apiRequest<Message>(API_ENDPOINTS.MESSAGES, {
    method: 'POST',
    body: JSON.stringify({
      receiver_id: receiverId,
      receiver_type: receiverType,
      message,
    }),
  });
};

export const getConversations = async (): Promise<any[]> => {
  return apiRequest<any[]>(API_ENDPOINTS.MESSAGES_CONVERSATIONS);
};

export const getUnreadCount = async (): Promise<{ unread_count: number }> => {
  return apiRequest<{ unread_count: number }>(API_ENDPOINTS.MESSAGES_UNREAD_COUNT);
};

export const markMessagesAsRead = async (userId: number): Promise<void> => {
  return apiRequest<void>(API_ENDPOINTS.MESSAGES_MARK_READ(userId), {
    method: 'PUT',
  });
};

