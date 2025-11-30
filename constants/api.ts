import { Platform } from 'react-native';
import Constants from 'expo-constants';

// API Configuration
// Using Expo API Routes which proxy to Laravel backend
// This solves network connection issues on mobile devices

const getBaseURL = () => {
  // Production API URL (only use if you have a production server running)
  const PRODUCTION_URL = 'https://backend-peregrine.online/api';
  
  // Set to true to use production server, false for local development
  // IMPORTANT: 
  // - For LOCAL DEVELOPMENT: Set to false (uses your computer's Laravel backend)
  // - For PRODUCTION: Set to true (uses the production server IP)
  // 
  // LOCAL DEVELOPMENT URLs:
  // - Android Emulator: http://10.0.2.2:8000/api (automatic - already configured)
  // - Android Physical Device: http://192.168.1.7:8000/api (your local IP - update if needed)
  // - iOS Simulator: http://localhost:8000/api (automatic - already configured)
  // - Web: http://localhost:8000/api (automatic - already configured)
  //
  // IMPORTANT: Make sure your Laravel backend is running:
  //   cd backend
  //   php artisan serve --host=0.0.0.0 --port=8000
  //
  // For physical Android devices, you may need to manually set the IP:
  //   Change line 44 to: return 'http://192.168.1.7:8000/api';
  const USE_PRODUCTION_API = false; // Set to false for local development

  // Use production only if explicitly enabled AND not in dev mode
  if (!__DEV__ && USE_PRODUCTION_API) {
    return PRODUCTION_URL; // Production URL
  }

  // LOCAL DEVELOPMENT - Auto-detect platform
  // This connects to your LOCAL Laravel backend running on your computer

  // For web, directly connect to Laravel backend
  // Web can access localhost:8000 directly
  if (Platform.OS === 'web') {
    return 'https://backend-peregrine.online/api';
  }

  // For Android (physical device or emulator)
  // - Physical device (Expo Go): Use your computer's local network IP (e.g., 192.168.1.7)
  // - Emulator: Use 10.0.2.2 (special IP for Android emulator)
  // IMPORTANT: 
  //   - localhost/127.0.0.1 won't work from physical devices
  //   - Make sure your phone and computer are on the SAME WiFi network
  if (Platform.OS === 'android') {
    // For physical device using Expo Go, use your computer's local IP
    // Update this IP if your network IP changes (check with: ipconfig on Windows)
    return 'http://192.168.1.7:8000/api'; // Your computer's local IP
    // https://backend-peregrine.online/api
  }

  // For iOS simulator, can use localhost
  if (Platform.OS === 'ios') {
    return 'http://localhost:8000/api';
  }

  // Default fallback
  return 'http://localhost:8000/api';
};

export const API_BASE_URL = getBaseURL();

// Log API configuration (for debugging)
console.log('🌐 API Configuration:');
console.log('   Base URL:', API_BASE_URL);
console.log('   Platform:', Platform.OS);
console.log('   Dev Mode:', __DEV__);

// Note: If you're getting connection errors:
// 1. For production server: Make sure the server at 112.204.104.126:8000 is running
// 2. For local development: Set USE_PRODUCTION_API = false and ensure Laravel server is running
// 3. For Android emulator: Use 'http://10.0.2.2:8000/api' for local development
// 4. For Android physical device: Use your computer's local IP (e.g., 'http://192.168.1.100:8000/api')

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/login',
  LOGOUT: '/logout',
  ME: '/me',

  // User endpoints
  USERS: '/users',
  USER_BY_ID: (id: string | number) => `/users/${id}`,
  USER_BY_EMAIL: '/users/email',
  USERS_BY_POSITION: '/users/position',

  // HR Account endpoints
  HR_ACCOUNTS: '/hr-accounts',
  HR_ACCOUNT_BY_ID: (id: string | number) => `/hr-accounts/${id}`,
  HR_ACCOUNT_BY_EMAIL: '/hr-accounts/email',

  // Manager/COO Account endpoints
  MANAGER_COO_ACCOUNTS: '/manager-coo-accounts',
  MANAGER_COO_ACCOUNT_BY_ID: (id: string | number) => `/manager-coo-accounts/${id}`,
  MANAGER_COO_ACCOUNT_BY_EMAIL: '/manager-coo-accounts/email',

  // Project endpoints
  PROJECTS: '/projects',
  PROJECT_BY_ID: (id: string | number) => `/projects/${id}`,

  // Project Folder endpoints
  PROJECT_FOLDERS: '/project-folders',
  PROJECT_FOLDER_BY_ID: (id: string | number) => `/project-folders/${id}`,

  // Subfolder endpoints
  SUBFOLDERS: '/subfolders',
  SUBFOLDER_BY_ID: (id: string | number) => `/subfolders/${id}`,

  // Position endpoints
  POSITIONS: '/positions',
  POSITION_BY_ID: (id: string | number) => `/positions/${id}`,

  // Procurement endpoints
  PROCUREMENT: '/procurement',
  PROCUREMENT_BY_ID: (id: string | number) => `/procurement/${id}`,

  // Assignment endpoints
  ASSIGN_USER_TO_PROJECT: '/assignments/project',
  UNASSIGN_USER_FROM_PROJECT: '/assignments/project',
  ASSIGNED_USERS_FOR_PROJECT: (projectId: string | number) => `/assignments/project/${projectId}/users`,
  PROJECTS_FOR_USER: (userId: string | number) => `/assignments/user/${userId}/projects`,

  ASSIGN_USER_TO_FOLDER: '/assignments/folder',
  UNASSIGN_USER_FROM_FOLDER: '/assignments/folder',
  ASSIGNED_USERS_FOR_FOLDER: (folderId: string | number) => `/assignments/folder/${folderId}/users`,
        FOLDERS_FOR_USER: (userId: string | number) => `/assignments/user/${userId}/folders`,
        PROJECT_FOLDERS_FOR_USER: (userId: string | number) => `/assignments/user/${userId}/project-folders`,

        // Message endpoints
        MESSAGES: '/messages',
        MESSAGES_CONVERSATIONS: '/messages/conversations',
        MESSAGES_UNREAD_COUNT: '/messages/unread-count',
        MESSAGES_WITH_USER: (userId: string | number) => `/messages/${userId}`,
        MESSAGES_MARK_READ: (userId: string | number) => `/messages/${userId}/read`,
      };

