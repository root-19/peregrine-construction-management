import * as SQLite from 'expo-sqlite';

import { HRAccount, User } from './types';

// Open or create the database using openDatabaseSync for newer versions
export const db = SQLite.openDatabaseSync('peregrine.db');

// Initialize the database and create tables
export const initDatabase = () => {
  return new Promise<void>((resolve, reject) => {
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS hr_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          company_position TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('HR accounts table created successfully');
      console.log('Users table created successfully');
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
      const result = db.runSync(
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
      const result = db.getAllSync<HRAccount>(
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
      const result = db.getFirstSync<HRAccount>(
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
  password?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      if (password) {
        db.runSync(
          `UPDATE hr_accounts 
           SET name = ?, last_name = ?, email = ?, password = ? 
           WHERE id = ?;`,
          [name, last_name, email, password, id]
        );
      } else {
        db.runSync(
          `UPDATE hr_accounts 
           SET name = ?, last_name = ?, email = ? 
           WHERE id = ?;`,
          [name, last_name, email, id]
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
      db.runSync('DELETE FROM hr_accounts WHERE id = ?;', [id]);
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
  company_position?: string
): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const result = db.runSync(
        `INSERT INTO users (name, last_name, email, password, company_position) 
         VALUES (?, ?, ?, ?, ?);`,
        [name, last_name, email, password, company_position || null]
      );
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
      const result = db.getAllSync<User>(
        'SELECT * FROM users ORDER BY created_at DESC;'
      );
      resolve(result);
    } catch (error) {
      console.error('Error fetching users:', error);
      reject(error);
    }
  });
};

// Get user by email
export const getUserByEmail = (email: string): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    try {
      const result = db.getFirstSync<User>(
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
      if (password) {
        db.runSync(
          `UPDATE users 
           SET name = ?, last_name = ?, email = ?, password = ?, company_position = ? 
           WHERE id = ?;`,
          [name, last_name, email, password, company_position || null, id]
        );
      } else {
        db.runSync(
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
      db.runSync('DELETE FROM users WHERE id = ?;', [id]);
      resolve();
    } catch (error) {
      console.error('Error deleting user:', error);
      reject(error);
    }
  });
};
