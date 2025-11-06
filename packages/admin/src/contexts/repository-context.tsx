'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { globalCache } from '@/lib/api-cache';

interface RepositoryInfo {
  owner: string;
  repo: string;
}

interface RepositoryContextType {
  repositoryInfo: RepositoryInfo | null;
  setRepositoryInfo: (info: RepositoryInfo | null) => void;
  isConnected: boolean;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

interface RepositoryProviderProps {
  children: ReactNode;
}

export function RepositoryProvider({ children }: RepositoryProviderProps) {
  const [repositoryInfo, setRepositoryInfoState] = useState<RepositoryInfo | null>(null);

  // Load repository info from localStorage on mount
  useEffect(() => {
    const connectedRepo = localStorage.getItem('gitcms-connected-repo');
    if (connectedRepo) {
      try {
        const repoData = JSON.parse(connectedRepo);
        setRepositoryInfoState({
          owner: repoData.owner,
          repo: repoData.name,
        });
      } catch (error) {
        console.error('Failed to parse connected repository:', error);
        localStorage.removeItem('gitcms-connected-repo');
      }
    }
  }, []);

  // Update localStorage when repository info changes
  const setRepositoryInfo = (info: RepositoryInfo | null) => {
    // Clear all API caches when switching repositories
    if (
      info &&
      repositoryInfo &&
      (info.owner !== repositoryInfo.owner || info.repo !== repositoryInfo.repo)
    ) {
      console.log('Switching repository - clearing all caches and reloading');
      globalCache.clear();

      // Update localStorage before reload
      localStorage.setItem(
        'gitcms-connected-repo',
        JSON.stringify({
          owner: info.owner,
          name: info.repo,
        })
      );

      // Force a hard reload to ensure all data is refreshed
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return;
    }

    setRepositoryInfoState(info);
    if (info) {
      localStorage.setItem(
        'gitcms-connected-repo',
        JSON.stringify({
          owner: info.owner,
          name: info.repo,
        })
      );
    } else {
      localStorage.removeItem('gitcms-connected-repo');
      globalCache.clear();
    }
  };

  const isConnected = repositoryInfo !== null;

  return (
    <RepositoryContext.Provider
      value={{
        repositoryInfo,
        setRepositoryInfo,
        isConnected,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository() {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
}
