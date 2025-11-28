import { initializeAuth } from '@/services/api';
import { useEffect, useState } from 'react';

export const useDatabase = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🔌 Initializing API connection...');
        await initializeAuth();
        console.log('✅ API connection initialized successfully!');
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const lastError = err instanceof Error ? err : new Error('API initialization failed');
        console.error('⚠️ Failed to initialize API connection:', lastError);
        setError(lastError);
        // Still mark as initialized to prevent app from hanging
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  return { isInitialized, error };
};

