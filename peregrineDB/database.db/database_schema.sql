-- Peregrine Database Schema
-- Run this file in SQLite to create all tables

-- ============================================
-- HR Accounts Table
-- ============================================
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

-- ============================================
-- Users Table
-- ============================================
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

-- ============================================
-- Positions Table
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Projects Table
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- Project Folders Table
-- ============================================
-- Project Folders Table
-- ============================================
CREATE TABLE IF NOT EXISTS project_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  parent_folder_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (parent_folder_id) REFERENCES project_folders(id)
);

-- ============================================
-- Subfolders Table
-- ============================================
CREATE TABLE IF NOT EXISTS subfolders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_folder_id INTEGER NOT NULL,cd
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  button_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_folder_id) REFERENCES project_folders(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================
-- Folder Assignments Table
-- ============================================
CREATE TABLE IF NOT EXISTS folder_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES project_folders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(folder_id, user_id)
);

-- ============================================
-- Project Assignments Table
-- ============================================
CREATE TABLE IF NOT EXISTS project_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

-- ============================================
-- Default HR Account (Optional)
-- ============================================
-- Uncomment the line below to insert default HR account
-- INSERT OR IGNORE INTO hr_accounts (name, last_name, email, password, company_name, position) 
-- VALUES ('HR', 'Admin', 'hr@peregrine.com', 'hr123', 'Peregrine', 'HR Manager');

