import { initDatabase } from '@/peregrineDB/database';
import { useEffect, useState } from 'react';

export const useDatabase = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Database initialization failed'));
        setIsInitialized(false);
      }
    };

    initialize();
  }, []);

  return { isInitialized, error };
};

