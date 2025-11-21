import { initDatabase } from '@/peregrineDB/database';
import { useEffect, useState } from 'react';

export const useDatabase = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initialize = async () => {
      // Add a delay to ensure native modules are ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let retries = 5; // Increased retries
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          console.log(`Initializing database... (${6 - retries}/5)`);
          await initDatabase();
          console.log('Database initialized successfully!');
          setIsInitialized(true);
          setError(null);
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Database initialization failed');
          console.error(`Database initialization attempt failed. Retries left: ${retries - 1}`, err);
          retries--;
          
          if (retries > 0) {
            // Exponential backoff
            const delay = 500 * (6 - retries);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      console.error('Failed to initialize database after all retries:', lastError);
      setError(lastError);
      setIsInitialized(false);
    };

    initialize();
  }, []);

  return { isInitialized, error };
};

