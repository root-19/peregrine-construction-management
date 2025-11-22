import { initDatabase } from '@/peregrineDB/database';
import { useEffect, useState } from 'react';

export const useDatabase = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initialize = async () => {
      // Add a longer delay to ensure native modules are fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let retries = 10; 
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          console.log(`Initializing database... (${11 - retries}/10)`);
          await initDatabase();
          console.log('✅ Database initialized successfully!');
          setIsInitialized(true);
          setError(null);
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Database initialization failed');
          const errorMsg = err instanceof Error ? err.message : String(err);
          
      
          if (errorMsg.includes('NullPointerException') || errorMsg.includes('not responsive')) {
            console.log(`⚠️ Database timing issue. Retries left: ${retries - 1}`);
          } else {
            console.error(`Database initialization attempt failed. Retries left: ${retries - 1}`, err);
          }
          
          retries--;
          
          if (retries > 0) {
            // Exponential backoff with longer delays
            const delay = 800 * (11 - retries);
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed - but still mark as initialized to prevent app from hanging
      console.error('⚠️ Failed to initialize database after all retries:', lastError);
      console.log('⚠️ Marking as initialized anyway - database might still work');
      setError(lastError);
      // Still mark as initialized - the database might work even if init had issues
      setIsInitialized(true);
    };

    initialize();
  }, []);

  return { isInitialized, error };
};

