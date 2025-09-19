'use client';

import { useState, useEffect, useCallback } from 'react';
import type { VirtualFolder } from '../components/media/virtual-folder-manager';

export function useVirtualFolders() {
  const [folders, setFolders] = useState<VirtualFolder[]>([]);

  // Load folders from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('gitcms-virtual-folders');
    if (stored) {
      try {
        const storedFolders = JSON.parse(stored).map((f: any) => ({
          ...f,
          createdAt: new Date(f.createdAt),
          updatedAt: new Date(f.updatedAt),
        }));
        setFolders(storedFolders);
      } catch {
        setFolders([]);
      }
    }
  }, []);

  const updateFolders = useCallback((newFolders: VirtualFolder[]) => {
    setFolders(newFolders);
    localStorage.setItem('gitcms-virtual-folders', JSON.stringify(newFolders));
  }, []);

  const addMediaToFolder = useCallback((mediaId: string, folderId: string) => {
    setFolders(prev => {
      const updated = prev.map(folder => ({
        ...folder,
        mediaIds:
          folder.id === folderId
            ? [...folder.mediaIds.filter(id => id !== mediaId), mediaId]
            : folder.mediaIds.filter(id => id !== mediaId),
        updatedAt: new Date(),
      }));
      localStorage.setItem('gitcms-virtual-folders', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeMediaFromFolder = useCallback((mediaId: string, folderId: string) => {
    setFolders(prev => {
      const updated = prev.map(folder =>
        folder.id === folderId
          ? {
              ...folder,
              mediaIds: folder.mediaIds.filter(id => id !== mediaId),
              updatedAt: new Date(),
            }
          : folder
      );
      localStorage.setItem('gitcms-virtual-folders', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getMediaFolder = useCallback(
    (mediaId: string): VirtualFolder | null => {
      return folders.find(folder => folder.mediaIds.includes(mediaId)) || null;
    },
    [folders]
  );

  const getFolderMedia = useCallback(
    (folderId: string): string[] => {
      const folder = folders.find(f => f.id === folderId);
      return folder ? folder.mediaIds : [];
    },
    [folders]
  );

  const getUnorganizedMedia = useCallback(
    (allMediaIds: string[]): string[] => {
      const organizedIds = new Set(folders.flatMap(f => f.mediaIds));
      return allMediaIds.filter(id => !organizedIds.has(id));
    },
    [folders]
  );

  return {
    folders,
    updateFolders,
    addMediaToFolder,
    removeMediaFromFolder,
    getMediaFolder,
    getFolderMedia,
    getUnorganizedMedia,
  };
}

export type { VirtualFolder };
