import * as SQLite from 'expo-sqlite';


import { HRAccount, ManagerCOOAccount, Position, Procurement, Project, ProjectFolder, Subfolder, User } from './types';
let dbInstance: SQLite.SQLiteDatabase | null = null;
let isDbReady = false;
let initPromise: Promise<void> | null = null;
let dbInstanceLogged = false; // Flag to log only once
let initCompleted = false; // Flag to prevent multiple completion logs

const getDatabase = (): SQLite.SQLiteDatabase => {
  // Use consistent database path - always use 'data'
  const DB_NAME = 'pere';
  
  // If database instance doesn't exist, create it
  if (!dbInstance) {
    try {
      // Wait a bit to ensure native module is ready
      dbInstance = SQLite.openDatabaseSync('database.sqlite');
      
      if (!dbInstance) {
        throw new Error('Database instance is null');
      }
      // Only log once when first created
      if (!dbInstanceLogged) {
        console.log('✅ Database instance created/retrieved');
        dbInstanceLogged = true;
      }
    } catch (error: any) {
      console.error('❌ Failed to open database:', error);
      isDbReady = false;
      dbInstance = null;
      throw new Error('Database connection not available');
    }
  }
  
  // Double check instance is valid
  if (!dbInstance) {
    // Try to recreate if null
    try {
      dbInstance = SQLite.openDatabaseSync('peregrine/peregrine');
      if (!dbInstance) {
        throw new Error('Database instance is null after recreation');
      }
      if (!dbInstanceLogged) {
        console.log('✅ Database instance recreated');
        dbInstanceLogged = true;
      }
    } catch (error) {
      console.error('❌ Failed to recreate database:', error);
      throw new Error('Database connection not available');
    }
  }
  
  return dbInstance;
};

// Helper function to create table with retry mechanism
const createTableWithRetry = async (
  database: SQLite.SQLiteDatabase,
  tableName: string,
  createSQL: string,
  retries: number = 8
): Promise<boolean> => {
  let tableCreated = false;
  let attempts = retries;
  
  while (attempts > 0 && !tableCreated) {
    try {
      // Get fresh database instance on retry
      let currentDb = database;
      if (attempts < retries) {
        // Reset dbInstance and get fresh connection
        dbInstance = null;
        await new Promise(resolve => setTimeout(resolve, 800));
        try {
          currentDb = getDatabase();
        } catch (dbError) {
          // Continue with original database
        }
      }
      
      // Longer wait before each attempt
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if table already exists
      let tableExists = false;
      try {
        await new Promise(resolve => setTimeout(resolve, 400));
        const checkResult = currentDb.getFirstSync(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`
        );
        tableExists = !!checkResult;
      } catch (checkError: any) {
        // If check fails with NullPointerException, reset and retry
        if (checkError?.message?.includes('NullPointerException')) {
          attempts--;
          if (attempts > 0) {
            dbInstance = null;
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
        }
        // Otherwise assume table doesn't exist
      }
      
      if (tableExists) {
        console.log(`ℹ️ Table: ${tableName} (already exists)`);
        return true;
      } else {
        // Wait longer before creating
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Try to create the table
        try {
          currentDb.runSync(createSQL);
          // Verify table was created with longer wait
          await new Promise(resolve => setTimeout(resolve, 500));
          const verifyResult = currentDb.getFirstSync(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`
          );
          if (verifyResult) {
            console.log(`✅ Table created: ${tableName}`);
            return true;
          } else {
            // Verification failed, but table might still exist - check one more time
            await new Promise(resolve => setTimeout(resolve, 500));
            const finalCheck = currentDb.getFirstSync(
              `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`
            );
            if (finalCheck) {
              console.log(`✅ Table created: ${tableName} (verified on second check)`);
              return true;
            }
            throw new Error('Table creation verification failed');
          }
        } catch (createError: any) {
          if (createError?.message?.includes('already exists') || createError?.message?.includes('duplicate')) {
            console.log(`ℹ️ Table: ${tableName} (already exists)`);
            return true;
          }
          throw createError;
        }
      }
    } catch (error: any) {
      attempts--;
      if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
        console.log(`ℹ️ Table: ${tableName} (already exists)`);
        return true;
      } else if (error?.message?.includes('NullPointerException')) {
        if (attempts > 0) {
          console.log(`⏳ Table: ${tableName} (timing issue, retrying... ${attempts} left)`);
          dbInstance = null; // Reset on NullPointerException
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          // Last attempt - try one more time with longer wait and fresh connection
          try {
            dbInstance = null;
            await new Promise(resolve => setTimeout(resolve, 2000));
            const freshDb = getDatabase();
            await new Promise(resolve => setTimeout(resolve, 800));
            freshDb.runSync(createSQL);
            console.log(`✅ Table created: ${tableName} (on final attempt)`);
            return true;
          } catch (finalError: any) {
            if (finalError?.message?.includes('already exists') || finalError?.message?.includes('duplicate')) {
              console.log(`ℹ️ Table: ${tableName} (already exists)`);
              return true;
            }
            console.log(`⚠️ Table: ${tableName} (timing issue after all retries, but continuing)`);
            return false; // Continue anyway
          }
        }
      } else {
        console.log(`⚠️ Table: ${tableName} (error, but continuing):`, error?.message || 'Unknown error');
        return false; // Continue anyway
      }
    }
  }
  return false;
};

export const initDatabase = (): Promise<void> => {

  if (initPromise) {
    return initPromise;
  }
  
  initPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // Wait longer for native module to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      let database: SQLite.SQLiteDatabase;
      try {
        database = getDatabase();
      } catch (dbError) {
        reject(new Error('Failed to open database connection'));
        return;
      }
      
      if (!database) {
        reject(new Error('Database connection not available'));
        return;
      }
      
      // Wait for database to be truly ready - retry test query multiple times
      let dbReady = false;
      let readyRetries = 5;
      while (readyRetries > 0 && !dbReady) {
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          database.getAllSync('SELECT 1');
          console.log('✅ Database is responsive and ready');
          dbReady = true;
        } catch (testError: any) {
          readyRetries--;
          if (readyRetries > 0) {
            console.log(`⏳ Waiting for database to be ready... (${readyRetries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            console.log('⚠️ Database test query failed after retries, but proceeding with initialization...');
            // Continue anyway - tables might still be created
          }
        }
      }
      
      // Additional wait before table creation
      await new Promise(resolve => setTimeout(resolve, 800));

      console.log('📁 Database file: peregrine/peregrine');
      console.log('📍 Location: App\'s document directory (managed by Expo SQLite)');
      console.log('💾 Data WILL persist until app is uninstalled');

      // Wrap all DDL in a try/catch sequence (SQLite implicit transaction for each runSync)
      // CREATE TABLE IF NOT EXISTS ensures no crash if tables already exist
      // This is safe for both new and existing databases
      
      // Wait before creating tables
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create hr_accounts table
      await createTableWithRetry(
        database,
        'hr_accounts',
        `CREATE TABLE IF NOT EXISTS hr_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          company_name TEXT,
          position TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create manager_coo_accounts table
      await createTableWithRetry(
        database,
        'manager_coo_accounts',
        `CREATE TABLE IF NOT EXISTS manager_coo_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          company_name TEXT,
          position TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create users table
      await createTableWithRetry(
        database,
        'users',
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          company_name TEXT,
          position TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );
      
      // Add position column if it doesn't exist (for existing databases)
      try {
        await new Promise(resolve => setTimeout(resolve, 400));
        database.runSync('ALTER TABLE users ADD COLUMN position TEXT;');
        console.log('✅ Column added: users.position');
      } catch (alterError: any) {
        if (alterError?.message?.includes('duplicate column') || alterError?.message?.includes('already exists')) {
          console.log('ℹ️ Column: users.position (already exists)');
        } else if (!alterError?.message?.includes('NullPointerException')) {
          console.log('ℹ️ Column: users.position (may already exist)');
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create projects table
      await createTableWithRetry(
        database,
        'projects',
        `CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        );`
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create project_folders table
      await createTableWithRetry(
        database,
        'project_folders',
        `CREATE TABLE IF NOT EXISTS project_folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          parent_folder_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (parent_folder_id) REFERENCES project_folders(id)
        );`
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create subfolders table (must be after project_folders due to foreign key)
      const subfoldersTableCreated = await createTableWithRetry(
        database,
        'subfolders',
        `CREATE TABLE IF NOT EXISTS subfolders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_folder_id INTEGER NOT NULL,
          project_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          button_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_folder_id) REFERENCES project_folders(id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );`
      );
      
      if (subfoldersTableCreated) {
        console.log('✅ Subfolders table created/verified');
      } else {
        console.log('⚠️ Subfolders table creation had issues, but continuing');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create folder_assignments table
      await createTableWithRetry(
        database,
        'folder_assignments',
        `CREATE TABLE IF NOT EXISTS folder_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          folder_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (folder_id) REFERENCES project_folders(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(folder_id, user_id)
        );`
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create project_assignments table
      await createTableWithRetry(
        database,
        'project_assignments',
        `CREATE TABLE IF NOT EXISTS project_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(project_id, user_id)
        );`
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create positions table
      await createTableWithRetry(
        database,
        'positions',
        `CREATE TABLE IF NOT EXISTS positions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          position TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        8 // More retries for positions table
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create procurement table
      await createTableWithRetry(
        database,
        'procurement',
        `CREATE TABLE IF NOT EXISTS procurement (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          folder_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (folder_id) REFERENCES project_folders(id) ON DELETE CASCADE
        );`
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Wait a bit after table creation
      await new Promise(resolve => setTimeout(resolve, 200));

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
          console.log('✅ Account created: HR (hr@peregrine.com / hr123)');
        } else {
          console.log('ℹ️ Account: HR (already exists)');
        }
      } catch (error: any) {
        if (error?.message?.includes('UNIQUE constraint') || error?.message?.includes('already exists')) {
          console.log('ℹ️ Default HR account already exists in database: hr@peregrine.com');
        } else if (!error?.message?.includes('NullPointerException')) {
          console.error('❌ Error creating default HR account:', error?.message || error);
          console.error('Error details:', error);
        }
      }

      // Wait before next account creation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create default Manager account if it doesn't exist (in manager_coo_accounts table)
      try {
        const existingManager = database.getFirstSync<ManagerCOOAccount>(
          'SELECT * FROM manager_coo_accounts WHERE email = ?;',
          ['manager@peregrine.com']
        );
        if (!existingManager) {
          database.runSync(
            `INSERT INTO manager_coo_accounts (name, last_name, email, password, company_name, position) 
             VALUES (?, ?, ?, ?, ?, ?);`,
            ['Manager', 'Account', 'manager@peregrine.com', 'manager123', 'Peregrine', 'Manager']
          );
          console.log('✅ Account created: Manager (manager@peregrine.com / manager123)');
        } else {
          console.log('ℹ️ Account: Manager (already exists)');
        }
      } catch (error: any) {
        if (error?.message?.includes('UNIQUE constraint') || error?.message?.includes('already exists')) {
          console.log('ℹ️ Default Manager account already exists in database: manager@peregrine.com');
        } else if (!error?.message?.includes('NullPointerException')) {
          console.error('❌ Error creating default Manager account:', error?.message || error);
          console.error('Error details:', error);
        }
      }

      // Wait before next account creation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create default COO account if it doesn't exist (in manager_coo_accounts table)
      try {
        const existingCOO = database.getFirstSync<ManagerCOOAccount>(
          'SELECT * FROM manager_coo_accounts WHERE email = ?;',
          ['coo@peregrine.com']
        );
        if (!existingCOO) {
          database.runSync(
            `INSERT INTO manager_coo_accounts (name, last_name, email, password, company_name, position) 
             VALUES (?, ?, ?, ?, ?, ?);`,
            ['COO', 'Account', 'coo@peregrine.com', 'coo123', 'Peregrine', 'COO']
          );
          console.log('✅ Account created: COO (coo@peregrine.com / coo123)');
        } else {
          console.log('ℹ️ Account: COO (already exists)');
        }
      } catch (error: any) {
        if (error?.message?.includes('UNIQUE constraint') || error?.message?.includes('already exists')) {
          console.log('ℹ️ Default COO account already exists in database: coo@peregrine.com');
        } else if (!error?.message?.includes('NullPointerException')) {
          console.error('❌ Error creating default COO account:', error?.message || error);
          console.error('Error details:', error);
        }
      }
      
      // Final wait to ensure everything is committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify tables were created
      const requiredTables = ['hr_accounts', 'manager_coo_accounts', 'users', 'projects', 'project_folders', 'subfolders', 'folder_assignments', 'project_assignments', 'positions'];
      let tablesVerified = 0;
      
      for (const tableName of requiredTables) {
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          const checkResult = database.getFirstSync(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`
          );
          if (checkResult) {
            tablesVerified++;
          }
        } catch (verifyError: any) {
          // Table might still exist even if check fails
        }
      }
      
      // Only log once
      if (!initCompleted) {
        if (tablesVerified >= requiredTables.length - 1) {
          // At least most tables exist
          console.log(`✅ Database initialized successfully (${tablesVerified}/${requiredTables.length} tables verified)`);
        } else {
          console.log(`⚠️ Database initialized (${tablesVerified}/${requiredTables.length} tables verified, but continuing)`);
        }
        initCompleted = true;
      }
      
      isDbReady = true;
      resolve();
    } catch (error: any) {
      console.error('Error initializing database:', error);
      // Don't reject immediately - check if tables were actually created
      // If it's just a test query failure, we can still mark as ready
      if (error?.message?.includes('not responsive') || error?.message?.includes('NullPointerException')) {
        if (!initCompleted) {
          console.log('⚠️ Database initialization had timing issues, but tables may have been created');
          console.log('⚠️ Marking as ready - database operations may still work');
          initCompleted = true;
        }
        isDbReady = true;
        // Don't reset initPromise on success - keep it so multiple calls return the same promise
        resolve(); // Resolve instead of reject - allow app to continue
      } else {
        isDbReady = false;
        initPromise = null; // Reset promise so it can be retried on actual errors
        initCompleted = false; // Reset completion flag on error
        reject(error);
      }
    }
  });
  return initPromise;
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
  return new Promise(async (resolve, reject) => {
    let retries = 10;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized - wait for initPromise if it exists
        if (initPromise) {
          try {
            await initPromise;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (initError) {
            // If init failed, try to initialize again
            try {
              await initDatabase();
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (retryInitError) {
              lastError = new Error('Database initialization failed');
              retries--;
              if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1500 * (11 - retries)));
              continue;
            }
          }
        } else if (!isDbReady) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1500 * (11 - retries)));
            continue;
          }
        } else {
          // Database is ready, but wait a bit anyway
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Reset database instance to ensure fresh connection
        dbInstance = null;
        await new Promise(resolve => setTimeout(resolve, 500));

        // Wait longer to ensure native module is fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
        } catch (dbError: any) {
          lastError = dbError;
          dbInstance = null;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1500 * (11 - retries)));
          continue;
        }

        // Wait before query
        await new Promise(resolve => setTimeout(resolve, 800));

        // Try the actual query directly - simpler approach
        try {
          const result = database.getFirstSync<HRAccount>(
            'SELECT * FROM hr_accounts WHERE email = ?;',
            [email]
          );
          resolve(result || null);
          return; // Exit loop on success
        } catch (queryError: any) {
          // If NullPointerException, reset instance and wait longer
          if (queryError?.message?.includes('NullPointerException')) {
            dbInstance = null;
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Try once more with fresh instance
            try {
              database = getDatabase();
              await new Promise(resolve => setTimeout(resolve, 1000));
              const result = database.getFirstSync<HRAccount>(
                'SELECT * FROM hr_accounts WHERE email = ?;',
                [email]
              );
              resolve(result || null);
              return;
            } catch (retryError) {
              // Still failing, continue to outer retry
              lastError = retryError;
            }
          } else {
            lastError = queryError;
          }
        }
      } catch (error: any) {
        lastError = error;
        // Reset instance on NullPointerException
        if (error?.message?.includes('NullPointerException')) {
          dbInstance = null;
        }
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 800 * (11 - retries)));
        }
      }
    }
    // Return null instead of rejecting to prevent crashes
    if (lastError && !lastError?.message?.includes('NullPointerException')) {
      console.error('Error fetching HR account after retries:', lastError);
    }
    resolve(null);
  });
};

// Get Manager/COO account by email
export const getManagerCOOAccountByEmail = (email: string): Promise<ManagerCOOAccount | null> => {
  return new Promise(async (resolve, reject) => {
    let retries = 10;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized - wait for initPromise if it exists
        if (initPromise) {
          try {
            await initPromise;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (initError) {
            // If init failed, try to initialize again
            try {
              await initDatabase();
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (retryInitError) {
              lastError = new Error('Database initialization failed');
              retries--;
              if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1500 * (11 - retries)));
              continue;
            }
          }
        } else if (!isDbReady) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1500 * (11 - retries)));
            continue;
          }
        } else {
          // Database is ready, but wait a bit anyway
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Reset database instance to ensure fresh connection
        dbInstance = null;
        await new Promise(resolve => setTimeout(resolve, 500));

        // Wait longer to ensure native module is fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
        } catch (dbError: any) {
          lastError = dbError;
          dbInstance = null;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1500 * (11 - retries)));
          continue;
        }

        // Wait before query
        await new Promise(resolve => setTimeout(resolve, 800));

        // Try the actual query directly - simpler approach
        try {
          const result = database.getFirstSync<ManagerCOOAccount>(
            'SELECT * FROM manager_coo_accounts WHERE email = ?;',
            [email]
          );
          resolve(result || null);
          return; // Exit loop on success
        } catch (queryError: any) {
          // If NullPointerException, reset instance and wait longer
          if (queryError?.message?.includes('NullPointerException')) {
            dbInstance = null;
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Try once more with fresh instance
            try {
              database = getDatabase();
              await new Promise(resolve => setTimeout(resolve, 1000));
              const result = database.getFirstSync<ManagerCOOAccount>(
                'SELECT * FROM manager_coo_accounts WHERE email = ?;',
                [email]
              );
              resolve(result || null);
              return;
            } catch (retryError) {
              // Still failing, continue to outer retry
              lastError = retryError;
            }
          } else {
            lastError = queryError;
          }
        }
      } catch (error: any) {
        lastError = error;
        // Reset instance on NullPointerException
        if (error?.message?.includes('NullPointerException')) {
          dbInstance = null;
        }
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 800 * (11 - retries)));
        }
      }
    }
    // Return null instead of rejecting to prevent crashes
    if (lastError && !lastError?.message?.includes('NullPointerException')) {
      console.error('Error fetching Manager/COO account after retries:', lastError);
    }
    resolve(null);
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

// Get all unique positions from positions table
export const getAllPositions = (): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const query = 'SELECT position FROM positions ORDER BY position ASC;';
      const result = database.getAllSync<Position>(query);
      
      if (result) {
        const positions = result.map(p => p.position).filter(p => p);
        console.log('Found positions from positions table:', positions);
        resolve(positions);
      } else {
        console.log('No positions found in positions table');
        resolve([]);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
      // Return empty array instead of rejecting to prevent crashes
      resolve([]);
    }
  });
};

// Get users by position
export const getUsersByPosition = (position: string): Promise<User[]> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          // Test query to verify database is responsive
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        // Query users where position matches (case-insensitive)
        // The users table only has 'position' column, not 'company_position'
        const query = `SELECT * FROM users 
          WHERE LOWER(TRIM(position)) = LOWER(TRIM(?))
          AND position IS NOT NULL
          ORDER BY name ASC;`;
        const trimmedPosition = position.trim();
        const result = database.getAllSync<User>(query, [trimmedPosition]);
        
        console.log(`Found ${result?.length || 0} users for position: ${position}`);
        resolve(result || []);
        return; // Exit loop on success
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    // Return empty array instead of rejecting to prevent crashes
    console.error('Error fetching users by position after retries:', lastError);
    resolve([]);
  });
};

// Get user by email
export const getUserByEmail = (email: string): Promise<User | null> => {
  return new Promise(async (resolve, reject) => {
    let retries = 10;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized - wait for initPromise if it exists
        if (initPromise) {
          try {
            await initPromise;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (initError) {
            // If init failed, try to initialize again
            try {
              await initDatabase();
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (retryInitError) {
              lastError = new Error('Database initialization failed');
              retries--;
              if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1500 * (11 - retries)));
              continue;
            }
          }
        } else if (!isDbReady) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1500 * (11 - retries)));
            continue;
          }
        } else {
          // Database is ready, but wait a bit anyway
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Reset database instance to ensure fresh connection
        dbInstance = null;
        await new Promise(resolve => setTimeout(resolve, 500));

        // Wait longer to ensure native module is fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
        } catch (dbError: any) {
          lastError = dbError;
          dbInstance = null;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1500 * (11 - retries)));
          continue;
        }

        // Wait before query
        await new Promise(resolve => setTimeout(resolve, 800));

        // Try the actual query directly - simpler approach
        try {
          const result = database.getFirstSync<User>(
            'SELECT * FROM users WHERE email = ?;',
            [email]
          );
          resolve(result || null);
          return; // Exit loop on success
        } catch (queryError: any) {
          // If NullPointerException, reset instance and wait longer
          if (queryError?.message?.includes('NullPointerException')) {
            dbInstance = null;
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Try once more with fresh instance
            try {
              database = getDatabase();
              await new Promise(resolve => setTimeout(resolve, 1000));
              const result = database.getFirstSync<User>(
                'SELECT * FROM users WHERE email = ?;',
                [email]
              );
              resolve(result || null);
              return;
            } catch (retryError) {
              // Still failing, continue to outer retry
              lastError = retryError;
            }
          } else {
            lastError = queryError;
          }
        }
      } catch (error: any) {
        lastError = error;
        // Reset instance on NullPointerException
        if (error?.message?.includes('NullPointerException')) {
          dbInstance = null;
        }
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 800 * (11 - retries)));
        }
      }
    }
    // Return null instead of rejecting to prevent crashes
    if (lastError && !lastError?.message?.includes('NullPointerException')) {
      console.error('Error fetching user after retries:', lastError);
    }
    resolve(null);
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
           SET name = ?, last_name = ?, email = ?, password = ?, position = ? 
           WHERE id = ?;`,
          [name, last_name, email, password, company_position || null, id]
        );
      } else {
        database.runSync(
          `UPDATE users 
           SET name = ?, last_name = ?, email = ?, position = ? 
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
  return new Promise(async (resolve, reject) => {
    let retries = 8;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 800));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1000 * (9 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Wait before getting database
        await new Promise(resolve => setTimeout(resolve, 400));

        let database: SQLite.SQLiteDatabase;
        try {
          // Reset dbInstance if we had NullPointerException before
          if (lastError?.message?.includes('NullPointerException')) {
            dbInstance = null;
            await new Promise(resolve => setTimeout(resolve, 600));
          }
          database = getDatabase();
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) {
            dbInstance = null; // Reset on error
            await new Promise(resolve => setTimeout(resolve, 1000 * (9 - retries)));
          }
          continue;
        }

        // Wait before executing query
        await new Promise(resolve => setTimeout(resolve, 300));

        const query = `INSERT INTO projects (name, description, created_by) 
           VALUES (?, ?, ?);`;
        const params = [name, description || null, created_by];
        
        const result = database.runSync(query, params);
        resolve(result.lastInsertRowId);
        return;
      } catch (error: any) {
        lastError = error;
        if (error?.message?.includes('NullPointerException')) {
          // Reset dbInstance on NullPointerException
          dbInstance = null;
          if (retries > 1) {
            console.log(`⚠️ NullPointerException on insertProject, retrying... (${retries - 1} left)`);
          }
        } else {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (9 - retries)));
        }
      }
    }
    console.error('Error inserting project after retries:', lastError);
    reject(lastError || new Error('Failed to insert project'));
  });
};

// Get all projects
export const getAllProjects = (): Promise<Project[]> => {
  return new Promise(async (resolve, reject) => {
    let retries = 8;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 600 * (9 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          // Test query to verify database is responsive
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 600 * (9 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        const query = 'SELECT * FROM projects ORDER BY created_at DESC;';
        const result = database.getAllSync<Project>(query);
        resolve(result || []);
        return; // Exit loop on success
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 600 * (9 - retries)));
        }
      }
    }
    // Return empty array instead of rejecting to prevent crashes
    if (lastError && !lastError?.message?.includes('NullPointerException')) {
      console.error('Error fetching projects after retries:', lastError);
    }
    resolve([]);
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
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        database.runSync(
          `UPDATE projects 
           SET name = ?, description = ? 
           WHERE id = ?;`,
          [name, description || null, id]
        );
        resolve();
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error updating project after retries:', lastError);
    reject(lastError || new Error('Failed to update project'));
  });
};

// Delete project
export const deleteProject = (id: number): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        database.runSync('DELETE FROM projects WHERE id = ?;', [id]);
        resolve();
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error deleting project after retries:', lastError);
    reject(lastError || new Error('Failed to delete project'));
  });
};

// ========== PROJECT FOLDER FUNCTIONS ==========

// Insert a new project folder
export const insertProjectFolder = (
  project_id: number,
  name: string,
  parent_folder_id?: number
): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          // Test query to ensure database is ready
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const result = database.runSync(
          `INSERT INTO project_folders (project_id, name, parent_folder_id) 
           VALUES (?, ?, ?);`,
          [project_id, name, parent_folder_id || null]
        );
        resolve(result.lastInsertRowId);
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error inserting project folder after retries:', lastError);
    reject(lastError || new Error('Failed to insert project folder'));
  });
};

// Get folders by project ID
export const getProjectFolders = (project_id: number, parent_folder_id?: number): Promise<ProjectFolder[]> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          // Test query to verify database is responsive
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

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
        return; // Exit loop on success
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    // Return empty array instead of rejecting to prevent crashes
    if (lastError && !lastError?.message?.includes('NullPointerException')) {
      console.error('Error fetching project folders after retries:', lastError);
    }
    resolve([]);
  });
};

// Delete project folder
// Update project folder name
export const updateProjectFolder = (id: number, name: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        database.runSync('UPDATE project_folders SET name = ? WHERE id = ?;', [name, id]);
        resolve();
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error updating project folder after retries:', lastError);
    reject(lastError || new Error('Failed to update project folder'));
  });
};

export const deleteProjectFolder = (id: number): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        database.runSync('DELETE FROM project_folders WHERE id = ?;', [id]);
        resolve();
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error deleting project folder after retries:', lastError);
    reject(lastError || new Error('Failed to delete project folder'));
  });
};

// ========== SUBFOLDER FUNCTIONS ==========

// Insert a new subfolder (uses project_folder_id from project_folders table)
export const insertSubfolder = (
  project_folder_id: number,
  project_id: number,
  name: string,
  button_name: string
): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const result = database.runSync(
          `INSERT INTO subfolders (project_folder_id, project_id, name, button_name) 
           VALUES (?, ?, ?, ?);`,
          [project_folder_id, project_id, name, button_name]
        );
        const insertedId = result.lastInsertRowId;
        console.log(`✅ Subfolder inserted successfully:`, {
          id: insertedId,
          project_folder_id: project_folder_id,
          project_id: project_id,
          name: name,
          button_name: button_name
        });
        resolve(insertedId);
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error inserting subfolder after retries:', lastError);
    reject(lastError || new Error('Failed to insert subfolder'));
  });
};

// Get subfolders by project_folder_id or project_id and button name (optional)
export const getSubfolders = (project_folder_id?: number, project_id?: number, button_name?: string): Promise<Subfolder[]> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        let query: string;
        let result: Subfolder[];
        
        // Query by project_folder_id if provided, otherwise by project_id
        if (project_folder_id !== undefined) {
          // Query by specific project_folder_id
          if (button_name) {
            query = 'SELECT * FROM subfolders WHERE project_folder_id = ? AND button_name = ? ORDER BY name ASC;';
            result = database.getAllSync<Subfolder>(query, [project_folder_id, button_name]);
          } else {
            query = 'SELECT * FROM subfolders WHERE project_folder_id = ? ORDER BY name ASC;';
            result = database.getAllSync<Subfolder>(query, [project_folder_id]);
          }
        } else if (project_id !== undefined) {
          // Query by project_id
          if (button_name) {
            query = 'SELECT * FROM subfolders WHERE project_id = ? AND button_name = ? ORDER BY name ASC;';
            result = database.getAllSync<Subfolder>(query, [project_id, button_name]);
            console.log(`🔍 Query: SELECT * FROM subfolders WHERE project_id = ${project_id} AND button_name = '${button_name}'`);
          } else {
            query = 'SELECT * FROM subfolders WHERE project_id = ? ORDER BY name ASC;';
            result = database.getAllSync<Subfolder>(query, [project_id]);
            console.log(`🔍 Query: SELECT * FROM subfolders WHERE project_id = ${project_id}`);
          }
          console.log(`📊 Found ${result?.length || 0} subfolders for project_id ${project_id}`);
        } else {
          // No filters - return empty array
          result = [];
        }
        
        resolve(result || []);
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    if (lastError && !lastError?.message?.includes('NullPointerException')) {
      console.error('Error fetching subfolders after retries:', lastError);
    }
    resolve([]);
  });
};

// Delete subfolder
export const deleteSubfolder = (id: number): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        database.runSync('DELETE FROM subfolders WHERE id = ?;', [id]);
        resolve();
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error deleting subfolder after retries:', lastError);
    reject(lastError || new Error('Failed to delete subfolder'));
  });
};

// Update subfolder name
export const updateSubfolder = (id: number, name: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        database.runSync('UPDATE subfolders SET name = ? WHERE id = ?;', [name, id]);
        resolve();
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error updating subfolder after retries:', lastError);
    reject(lastError || new Error('Failed to update subfolder'));
  });
};

// ========== PROCUREMENT FUNCTIONS ==========

// Insert a new procurement item
export const insertProcurement = (
  project_id: number,
  folder_id: number,
  name: string,
  description?: string
): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const result = database.runSync(
          `INSERT INTO procurement (project_id, folder_id, name, description) 
           VALUES (?, ?, ?, ?);`,
          [project_id, folder_id, name, description || null]
        );
        resolve(result.lastInsertRowId);
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error inserting procurement after retries:', lastError);
    reject(lastError || new Error('Failed to insert procurement'));
  });
};

// Get procurement items by folder ID
export const getProcurementByFolder = (folder_id: number): Promise<Procurement[]> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const query = 'SELECT * FROM procurement WHERE folder_id = ? ORDER BY name ASC;';
        const result = database.getAllSync<Procurement>(query, [folder_id]);
        resolve(result || []);
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error getting procurement after retries:', lastError);
    reject(lastError || new Error('Failed to get procurement'));
  });
};

// Get procurement items by project ID
export const getProcurementByProject = (project_id: number): Promise<Procurement[]> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const query = 'SELECT * FROM procurement WHERE project_id = ? ORDER BY name ASC;';
        const result = database.getAllSync<Procurement>(query, [project_id]);
        resolve(result || []);
        return;
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    console.error('Error getting procurement after retries:', lastError);
    reject(lastError || new Error('Failed to get procurement'));
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
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized (guard against early prepareSync NPE)
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(r => setTimeout(r, 250));
          } catch (initErr) {
            lastError = initErr;
            retries--;
            if (retries > 0) await new Promise(r => setTimeout(r, 400 * (6 - retries)));
            continue;
          }
        } else {
          // small stabilization delay
          await new Promise(r => setTimeout(r, 150));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          // Lightweight responsiveness check
          database.getFirstSync('SELECT name FROM sqlite_master LIMIT 1;');
        } catch (dbErr: any) {
          lastError = dbErr;
          retries--;
          if (retries > 0) await new Promise(r => setTimeout(r, 400 * (6 - retries)));
          continue;
        }

        // Query assigned users
        const query = `SELECT u.* FROM users u
           INNER JOIN project_assignments pa ON u.id = pa.user_id
           WHERE pa.project_id = ?
           ORDER BY u.name ASC;`;
        const result = database.getAllSync<User>(query, [project_id]);
        resolve(result || []);
        return; // success
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed (assigned users). Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 400 * (6 - retries)));
        }
      }
    }

    console.error('Error fetching assigned users for project after retries:', lastError);
    // Fail gracefully with empty array
    resolve([]);
  });
};

// ========== USER ASSIGNMENT QUERIES ==========

// Get all projects assigned to a user
export const getProjectsForUser = (user_id: number): Promise<Project[]> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          // Test query to verify database is responsive
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const query = `SELECT p.* FROM projects p
           INNER JOIN project_assignments pa ON p.id = pa.project_id
           WHERE pa.user_id = ?
           ORDER BY p.name ASC;`;
        const result = database.getAllSync<Project>(query, [user_id]);
        resolve(result || []);
        return; // Exit loop on success
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    // Return empty array instead of rejecting to prevent crashes
    console.error('Error fetching projects for user after retries:', lastError);
    resolve([]);
  });
};

// Get all folders assigned to a user (across all projects)
export const getFoldersForUser = (user_id: number): Promise<ProjectFolder[]> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          // Test query to verify database is responsive
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const query = `SELECT pf.* FROM project_folders pf
           INNER JOIN folder_assignments fa ON pf.id = fa.folder_id
           WHERE fa.user_id = ?
           ORDER BY pf.name ASC;`;
        const result = database.getAllSync<ProjectFolder>(query, [user_id]);
        resolve(result || []);
        return; // Exit loop on success
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    // Return empty array instead of rejecting to prevent crashes
    console.error('Error fetching folders for user after retries:', lastError);
    resolve([]);
  });
};

// Get folders for a user within a specific project
export const getProjectFoldersForUser = (user_id: number, project_id: number): Promise<ProjectFolder[]> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Ensure database is initialized
        if (!isDbReady || !initPromise) {
          try {
            await initDatabase();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (initError) {
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
            continue;
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          // Test query to verify database is responsive
          database.getFirstSync('SELECT 1 FROM sqlite_master LIMIT 1;');
        } catch (dbError: any) {
          lastError = dbError;
          retries--;
          if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const query = `SELECT pf.* FROM project_folders pf
           INNER JOIN folder_assignments fa ON pf.id = fa.folder_id
           WHERE fa.user_id = ? AND pf.project_id = ?
           ORDER BY pf.name ASC;`;
        const result = database.getAllSync<ProjectFolder>(query, [user_id, project_id]);
        resolve(result || []);
        return; // Exit loop on success
      } catch (error: any) {
        lastError = error;
        if (!error?.message?.includes('NullPointerException')) {
          console.error(`Attempt failed. Retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * (6 - retries)));
        }
      }
    }
    // Return empty array instead of rejecting to prevent crashes
    // Only log if it's not a NullPointerException (which is usually a timing issue)
    if (lastError && !lastError?.message?.includes('NullPointerException')) {
      console.error('Error fetching project folders for user after retries:', lastError);
    }
    resolve([]);
  });
};

// ========== POSITION FUNCTIONS ==========

// Insert a new position
export const insertPosition = (position: string): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    let retries = 5; // Increased retries
    let lastError: any = null;

    while (retries > 0) {
      try {
        // First, ensure database is initialized - wait for it to complete
        if (!isDbReady || !initPromise) {
          try {
            console.log('Waiting for database initialization...');
            await initDatabase();
            // Wait longer for native module to be fully ready (React Native Expo needs more time)
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (initError) {
            console.error('Database initialization error:', initError);
            lastError = new Error('Database initialization failed');
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 800));
              continue;
            }
            reject(lastError);
            return;
          }
        } else {
          // If already initialized, wait a bit longer to ensure native module is ready
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Verify database is ready
        if (!isDbReady) {
          console.log('Database not ready, waiting...');
          await new Promise(resolve => setTimeout(resolve, 300));
          if (!isDbReady) {
            lastError = new Error('Database is not ready');
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }
            reject(lastError);
            return;
          }
        }
        
        // Get database instance
        let database: SQLite.SQLiteDatabase;
        try {
          database = getDatabase();
          
          // Verify database is actually usable with a test query
          try {
            database.getAllSync('SELECT 1');
          } catch (testError: any) {
            if (testError?.message?.includes('NullPointerException') || testError?.message?.includes('prepareSync')) {
              throw new Error('Database not ready for operations');
            }
          }
        } catch (dbError: any) {
          console.error('Error getting database:', dbError);
          lastError = dbError;
          retries--;
          if (retries > 0) {
            console.log(`Retrying database connection... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 600));
            continue;
          }
          reject(new Error('Database is not available'));
          return;
        }
        
        if (!database) {
          lastError = new Error('Database not available');
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          reject(lastError);
          return;
        }
        
        // Ensure positions table exists (this should already exist from initDatabase, but just in case)
        try {
          database.runSync(`
            CREATE TABLE IF NOT EXISTS positions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              position TEXT NOT NULL UNIQUE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);
          // Wait after table creation
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (tableError: any) {
          // Table might already exist, continue
          if (!tableError?.message?.includes('already exists') && !tableError?.message?.includes('NullPointerException')) {
            console.log('Positions table check:', tableError);
          }
          // Wait even if table creation had an error
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        // Final delay before insert operation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const query = `INSERT INTO positions (position) VALUES (?);`;
        const result = database.runSync(query, [position.trim()]);
        console.log('Position inserted successfully:', position);
        resolve(result.lastInsertRowId);
        return; // Success, exit retry loop
      } catch (error: any) {
        console.error(`Error inserting position (attempt ${6 - retries}/5):`, error);
        lastError = error;
        
        // Check if it's a unique constraint error (don't retry)
        if (error?.message?.includes('UNIQUE constraint') || error?.message?.includes('unique') || error?.message?.includes('already exists')) {
          reject(new Error('This position already exists'));
          return;
        }
        
        // Check if it's a NullPointerException or prepareSync error (retry)
        if (error?.message?.includes('NullPointerException') || error?.message?.includes('prepareSync') || error?.message?.includes('not ready')) {
          retries--;
          if (retries > 0) {
            const delay = 600 * (6 - retries); // Exponential backoff
            console.log(`Retrying position insert in ${delay}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          // Other errors, don't retry
          reject(error);
          return;
        }
      }
    }
    
    // All retries failed
    console.error('All retry attempts failed for position insert');
    reject(lastError || new Error('Database is not ready. Please try again.'));
  });
};

// Get all positions
export const getAllPositionsFromTable = (): Promise<Position[]> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      const query = 'SELECT * FROM positions ORDER BY position ASC;';
      const result = database.getAllSync<Position>(query);
      resolve(result || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
      resolve([]);
    }
  });
};

// Delete position
export const deletePosition = (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const database = getDatabase();
      database.runSync('DELETE FROM positions WHERE id = ?;', [id]);
      resolve();
    } catch (error) {
      console.error('Error deleting position:', error);
      reject(error);
    }
  });
};
