import * as SQLite from 'expo-sqlite';

import { HRAccount, Project, ProjectFolder, User } from './types';

// Database instance - will be initialized lazily
let dbInstance: SQLite.SQLiteDatabase | null = null;

// Get or create database instance
const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    try {
      dbInstance = SQLite.openDatabaseSync('peregrine.db');
    } catch (error) {
      console.error('Failed to open database:', error);
      throw new Error('Database connection not available');
    }
  }
  return dbInstance;
};

// Export db for backward compatibility
export const db = getDatabase();

// Initialize the database and create tables
export const initDatabase = () => {
  return new Promise<void>((resolve, reject) => {
    try {
      // Get database instance
      const database = getDatabase();
      
      // Check if database is available
      if (!database) {
        reject(new Error('Database connection not available'));
        return;
      }

      // Create tables one by one to avoid issues with execSync
      try {
        database.runSync(`
          CREATE TABLE IF NOT EXISTS hr_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            company_name TEXT,
            position TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('HR accounts table created successfully');
      } catch (error) {
        console.error('Error creating hr_accounts table:', error);
      }

      try {
        database.runSync(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            company_name TEXT,
            position TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('Users table created successfully');
      } catch (error) {
        console.error('Error creating users table:', error);
      }

      try {
        database.runSync(`
          CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
          );
        `);
        console.log('Projects table created successfully');
      } catch (error) {
        console.error('Error creating projects table:', error);
      }

      try {
        database.runSync(`
          CREATE TABLE IF NOT EXISTS project_folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            parent_folder_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (parent_folder_id) REFERENCES project_folders(id)
          );
        `);
        console.log('Project folders table created successfully');
      } catch (error) {
        console.error('Error creating project_folders table:', error);
      }

      try {
        database.runSync(`
          CREATE TABLE IF NOT EXISTS folder_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (folder_id) REFERENCES project_folders(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(folder_id, user_id)
          );
        `);
        console.log('Folder assignments table created successfully');
      } catch (error) {
        console.error('Error creating folder_assignments table:', error);
      }

      try {
        database.runSync(`
          CREATE TABLE IF NOT EXISTS project_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(project_id, user_id)
          );
        `);
        console.log('Project assignments table created successfully');
      } catch (error) {
        console.error('Error creating project_assignments table:', error);
      }
      
      // Create default HR account if it doesn't exist
      try {
        const existingHR = database.getFirstSync<HRAccount>(
          'SELECT * FROM hr_accounts WHERE email = ?;',
          ['hr@peregrine.com']
        );
        if (!existingHR) {
          database.runSync(
            `INSERT INTO hr_accounts (name, last_name, email, password, company_name, position) 
             VALUES (?, ?, ?, ?, ?, ?);`,
            ['HR', 'Admin', 'hr@peregrine.com', 'hr123', 'Peregrine', 'HR Manager']
          );
          console.log('Default HR account created: hr@peregrine.com / hr123');
        }
      } catch (error) {
        console.log('Default HR account already exists or error creating it:', error);
      }
      
      console.log('Database initialized successfully');
      resolve();
    } catch (error) {
      console.error('Error initializing database:', error);
      reject(error);
    }
  });
};

// Insert a new HR account
export const insertHRAccount = (
  name: string,
  last_name: string,
  email: string,
  password: string
): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const result = database.runSync(
        `INSERT INTO hr_accounts (name, last_name, email, password) 
         VALUES (?, ?, ?, ?);`,
        [name, last_name, email, password]
      );
      resolve(result.lastInsertRowId);
    } catch (error) {
      console.error('Error inserting HR account:', error);
      reject(error);
    }
  });
};

// Get all HR accounts
export const getAllHRAccounts = (): Promise<HRAccount[]> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const result = database.getAllSync<HRAccount>(
        'SELECT * FROM hr_accounts ORDER BY created_at DESC;'
      );
      resolve(result);
    } catch (error) {
      console.error('Error fetching HR accounts:', error);
      reject(error);
    }
  });
};

// Get HR account by email
export const getHRAccountByEmail = (email: string): Promise<HRAccount | null> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const result = database.getFirstSync<HRAccount>(
        'SELECT * FROM hr_accounts WHERE email = ?;',
        [email]
      );
      resolve(result || null);
    } catch (error) {
      console.error('Error fetching HR account:', error);
      reject(error);
    }
  });
};

// Update HR account
export const updateHRAccount = (
  id: number,
  name: string,
  last_name: string,
  email: string,
  password?: string,
  company_name?: string,
  position?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      if (password) {
        database.runSync(
          `UPDATE hr_accounts 
           SET name = ?, last_name = ?, email = ?, password = ?, company_name = ?, position = ? 
           WHERE id = ?;`,
          [name, last_name, email, password, company_name || null, position || null, id]
        );
      } else {
        database.runSync(
          `UPDATE hr_accounts 
           SET name = ?, last_name = ?, email = ?, company_name = ?, position = ? 
           WHERE id = ?;`,
          [name, last_name, email, company_name || null, position || null, id]
        );
      }
      resolve();
    } catch (error) {
      console.error('Error updating HR account:', error);
      reject(error);
    }
  });
};

// Delete HR account
export const deleteHRAccount = (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.runSync('DELETE FROM hr_accounts WHERE id = ?;', [id]);
      resolve();
    } catch (error) {
      console.error('Error deleting HR account:', error);
      reject(error);
    }
  });
};

// ========== USER FUNCTIONS ==========

// Insert a new user
export const insertUser = (
  name: string,
  last_name: string,
  email: string,
  password: string,
  company_position?: string,
  company_name?: string
): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      // Ensure database is initialized
      const database = getDatabase();
      if (!database) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const query = `INSERT INTO users (name, last_name, email, password, position, company_name) 
         VALUES (?, ?, ?, ?, ?, ?);`;
      const params = [name, last_name, email, password, company_position || null, company_name || null];
      
      const result = database.runSync(query, params);
      resolve(result.lastInsertRowId);
    } catch (error) {
      console.error('Error inserting user:', error);
      reject(error);
    }
  });
};

// Get all users
export const getAllUsers = (): Promise<User[]> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const query = 'SELECT * FROM users ORDER BY created_at DESC;';
      const result = database.getAllSync<User>(query);
      resolve(result || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Return empty array instead of rejecting to prevent crashes
      resolve([]);
    }
  });
};

// Get user by email
export const getUserByEmail = (email: string): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const result = database.getFirstSync<User>(
        'SELECT * FROM users WHERE email = ?;',
        [email]
      );
      resolve(result || null);
    } catch (error) {
      console.error('Error fetching user:', error);
      reject(error);
    }
  });
};

// Update user
export const updateUser = (
  id: number,
  name: string,
  last_name: string,
  email: string,
  password?: string,
  company_position?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      if (password) {
        database.runSync(
          `UPDATE users 
           SET name = ?, last_name = ?, email = ?, password = ?, company_position = ? 
           WHERE id = ?;`,
          [name, last_name, email, password, company_position || null, id]
        );
      } else {
        database.runSync(
          `UPDATE users 
           SET name = ?, last_name = ?, email = ?, company_position = ? 
           WHERE id = ?;`,
          [name, last_name, email, company_position || null, id]
        );
      }
      resolve();
    } catch (error) {
      console.error('Error updating user:', error);
      reject(error);
    }
  });
};

// Delete user
export const deleteUser = (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.runSync('DELETE FROM users WHERE id = ?;', [id]);
      resolve();
    } catch (error) {
      console.error('Error deleting user:', error);
      reject(error);
    }
  });
};

// ========== PROJECT FUNCTIONS ==========

// Insert a new project
export const insertProject = (
  name: string,
  created_by: number,
  description?: string
): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      // Ensure database is initialized
      const database = getDatabase();
      if (!database) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const query = `INSERT INTO projects (name, description, created_by) 
         VALUES (?, ?, ?);`;
      const params = [name, description || null, created_by];
      
      const result = database.runSync(query, params);
      resolve(result.lastInsertRowId);
    } catch (error) {
      console.error('Error inserting project:', error);
      reject(error);
    }
  });
};

// Get all projects
export const getAllProjects = (): Promise<Project[]> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const query = 'SELECT * FROM projects ORDER BY created_at DESC;';
      const result = database.getAllSync<Project>(query);
      resolve(result || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Return empty array instead of rejecting to prevent crashes
      resolve([]);
    }
  });
};

// Get project by ID
export const getProjectById = (id: number): Promise<Project | null> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const result = database.getFirstSync<Project>(
        'SELECT * FROM projects WHERE id = ?;',
        [id]
      );
      resolve(result || null);
    } catch (error) {
      console.error('Error fetching project:', error);
      reject(error);
    }
  });
};

// Update project
export const updateProject = (
  id: number,
  name: string,
  description?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.runSync(
        `UPDATE projects 
         SET name = ?, description = ? 
         WHERE id = ?;`,
        [name, description || null, id]
      );
      resolve();
    } catch (error) {
      console.error('Error updating project:', error);
      reject(error);
    }
  });
};

// Delete project
export const deleteProject = (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.runSync('DELETE FROM projects WHERE id = ?;', [id]);
      resolve();
    } catch (error) {
      console.error('Error deleting project:', error);
      reject(error);
    }
  });
};

// ========== PROJECT FOLDER FUNCTIONS ==========

// Insert a new project folder
export const insertProjectFolder = (
  project_id: number,
  name: string,
  parent_folder_id?: number
): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const result = database.runSync(
        `INSERT INTO project_folders (project_id, name, parent_folder_id) 
         VALUES (?, ?, ?);`,
        [project_id, name, parent_folder_id || null]
      );
      resolve(result.lastInsertRowId);
    } catch (error) {
      console.error('Error inserting project folder:', error);
      reject(error);
    }
  });
};

// Get folders by project ID
export const getProjectFolders = (project_id: number, parent_folder_id?: number): Promise<ProjectFolder[]> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      let query: string;
      let result: ProjectFolder[];
      
      if (parent_folder_id !== undefined) {
        query = 'SELECT * FROM project_folders WHERE project_id = ? AND parent_folder_id = ? ORDER BY name ASC;';
        result = database.getAllSync<ProjectFolder>(query, [project_id, parent_folder_id]);
      } else {
        query = 'SELECT * FROM project_folders WHERE project_id = ? AND parent_folder_id IS NULL ORDER BY name ASC;';
        result = database.getAllSync<ProjectFolder>(query, [project_id]);
      }
      
      resolve(result || []);
    } catch (error) {
      console.error('Error fetching project folders:', error);
      // Return empty array instead of rejecting to prevent crashes
      resolve([]);
    }
  });
};

// Delete project folder
export const deleteProjectFolder = (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.runSync('DELETE FROM project_folders WHERE id = ?;', [id]);
      resolve();
    } catch (error) {
      console.error('Error deleting project folder:', error);
      reject(error);
    }
  });
};

// ========== FOLDER ASSIGNMENT FUNCTIONS ==========

// Assign user to folder
export const assignUserToFolder = (folder_id: number, user_id: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const result = database.runSync(
        `INSERT OR IGNORE INTO folder_assignments (folder_id, user_id) 
         VALUES (?, ?);`,
        [folder_id, user_id]
      );
      resolve(result.lastInsertRowId);
    } catch (error) {
      console.error('Error assigning user to folder:', error);
      reject(error);
    }
  });
};

// Unassign user from folder
export const unassignUserFromFolder = (folder_id: number, user_id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.runSync(
        'DELETE FROM folder_assignments WHERE folder_id = ? AND user_id = ?;',
        [folder_id, user_id]
      );
      resolve();
    } catch (error) {
      console.error('Error unassigning user from folder:', error);
      reject(error);
    }
  });
};

// Get assigned users for a folder
export const getAssignedUsersForFolder = (folder_id: number): Promise<User[]> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const query = `SELECT u.* FROM users u
         INNER JOIN folder_assignments fa ON u.id = fa.user_id
         WHERE fa.folder_id = ?
         ORDER BY u.name ASC;`;
      const result = database.getAllSync<User>(query, [folder_id]);
      resolve(result || []);
    } catch (error) {
      console.error('Error fetching assigned users:', error);
      // Return empty array instead of rejecting to prevent crashes
      resolve([]);
    }
  });
};

// Check if user is assigned to folder
export const isUserAssignedToFolder = (folder_id: number, user_id: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const query = 'SELECT COUNT(*) as count FROM folder_assignments WHERE folder_id = ? AND user_id = ?;';
      const result = database.getFirstSync<{ count: number }>(query, [folder_id, user_id]);
      resolve((result?.count || 0) > 0);
    } catch (error) {
      console.error('Error checking user assignment:', error);
      resolve(false);
    }
  });
};

// ========== PROJECT ASSIGNMENT FUNCTIONS ==========

// Assign user to project
export const assignUserToProject = (project_id: number, user_id: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const result = database.runSync(
        `INSERT OR IGNORE INTO project_assignments (project_id, user_id) 
         VALUES (?, ?);`,
        [project_id, user_id]
      );
      resolve(result.lastInsertRowId);
    } catch (error) {
      console.error('Error assigning user to project:', error);
      reject(error);
    }
  });
};

// Unassign user from project
export const unassignUserFromProject = (project_id: number, user_id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.runSync(
        'DELETE FROM project_assignments WHERE project_id = ? AND user_id = ?;',
        [project_id, user_id]
      );
      resolve();
    } catch (error) {
      console.error('Error unassigning user from project:', error);
      reject(error);
    }
  });
};

// Get assigned users for a project
export const getAssignedUsersForProject = (project_id: number): Promise<User[]> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const query = `SELECT u.* FROM users u
         INNER JOIN project_assignments pa ON u.id = pa.user_id
         WHERE pa.project_id = ?
         ORDER BY u.name ASC;`;
      const result = database.getAllSync<User>(query, [project_id]);
      resolve(result || []);
    } catch (error) {
      console.error('Error fetching assigned users for project:', error);
      // Return empty array instead of rejecting to prevent crashes
      resolve([]);
    }
  });
};
