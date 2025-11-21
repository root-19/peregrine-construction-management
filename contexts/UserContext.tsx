import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/peregrineDB/types';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isHR: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Check if user is HR based on company_position
  const isHR = user?.company_position?.toLowerCase().includes('hr') || false;

  return (
    <UserContext.Provider value={{ user, setUser, isHR }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

