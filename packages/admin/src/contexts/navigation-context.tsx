'use client';

import { NavigationItem } from '@/components/navigation';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface NavigationContextType {
  headers: Record<NavigationItem, ReactNode>;
  setHeader: (id: NavigationItem, header: ReactNode) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [headers, setHeaders] = useState<Record<NavigationItem, ReactNode>>({} as any);
  const setHeader = useCallback((id: NavigationItem, header: ReactNode) => {
    setHeaders(prev => ({ ...prev, [id]: header }));
  }, []);

  return (
    <NavigationContext.Provider value={{ headers, setHeader }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationHeader() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigationHeader must be used within NavigationProvider');
  return context;
}
