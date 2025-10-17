'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface UploadFile extends File {
  id: string;
  name: string;
  size: number;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadSpeed?: number;
  estimatedTime?: number;
  simulatedProgress?: number;
  actualProgress?: number;
}

interface UploadContextType {
  files: UploadFile[];
  isUploading: boolean;
  addFiles: (files: UploadFile[]) => void;
  updateFile: (id: string, updates: Partial<UploadFile>) => void;
  removeFile: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  setIsUploading: (uploading: boolean) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((newFiles: UploadFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setIsUploading(false);
  }, []);

  return (
    <UploadContext.Provider
      value={{
        files,
        isUploading,
        addFiles,
        updateFile,
        removeFile,
        clearCompleted,
        clearAll,
        setIsUploading,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadContext() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUploadContext must be used within UploadProvider');
  }
  return context;
}
