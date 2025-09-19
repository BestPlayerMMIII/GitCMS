'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  FolderPlus,
  Edit2,
  Trash2,
  FolderOpen,
  Tag,
  X,
  Check,
  Plus,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

export interface VirtualFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  parent?: string; // For nested folders
  mediaIds: string[];
  createdAt: Date;
  updatedAt: Date;
  isSystem?: boolean;
}

interface VirtualFolderManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onFoldersChange: (folders: VirtualFolder[]) => void;
  mediaFiles?: { id: string; filename: string; mediaType: string }[];
}

const DEFAULT_FOLDERS: VirtualFolder[] = [
  {
    id: 'images',
    name: 'Images',
    description: 'Image files and graphics',
    color: '#3b82f6',
    mediaIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isSystem: true,
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'PDF files and documents',
    color: '#10b981',
    mediaIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isSystem: true,
  },
  {
    id: 'media',
    name: 'Media',
    description: 'Video and audio files',
    color: '#f59e0b',
    mediaIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isSystem: true,
  },
  {
    id: 'archived',
    name: 'Archived',
    description: 'Archived files',
    color: '#6b7280',
    mediaIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isSystem: true,
  },
];

const FOLDER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6b7280', // gray
];

export function VirtualFolderManager({
  isOpen,
  onClose,
  onFoldersChange,
  mediaFiles = [],
}: VirtualFolderManagerProps) {
  const [folders, setFolders] = useState<VirtualFolder[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState({
    name: '',
    description: '',
    color: FOLDER_COLORS[0],
    parent: '',
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Load folders from localStorage on mount
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
        setFolders(DEFAULT_FOLDERS);
      }
    } else {
      setFolders(DEFAULT_FOLDERS);
    }
  }, []);

  // Save folders to localStorage and notify parent
  useEffect(() => {
    if (folders.length > 0) {
      localStorage.setItem('gitcms-virtual-folders', JSON.stringify(folders));
      onFoldersChange(folders);
    }
  }, [folders, onFoldersChange]);

  const addFolder = () => {
    if (!newFolder.name) return;

    const folder: VirtualFolder = {
      id: newFolder.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
      name: newFolder.name,
      description: newFolder.description,
      color: newFolder.color,
      parent: newFolder.parent || undefined,
      mediaIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isSystem: false,
    };

    setFolders(prev => [...prev, folder]);
    setNewFolder({ name: '', description: '', color: FOLDER_COLORS[0], parent: '' });
    setIsAddingNew(false);
  };

  const updateFolder = (id: string, updates: Partial<VirtualFolder>) => {
    setFolders(prev =>
      prev.map(folder =>
        folder.id === id ? { ...folder, ...updates, updatedAt: new Date() } : folder
      )
    );
    setEditingId(null);
  };

  const deleteFolder = (id: string) => {
    const folderToDelete = folders.find(f => f.id === id);
    if (!folderToDelete || folderToDelete.isSystem) return;

    // Move child folders to root level
    setFolders(prev =>
      prev
        .map(folder =>
          folder.parent === id ? { ...folder, parent: undefined, updatedAt: new Date() } : folder
        )
        .filter(folder => folder.id !== id)
    );
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const moveMediaToFolder = (mediaId: string, folderId: string) => {
    setFolders(prev =>
      prev.map(folder => ({
        ...folder,
        mediaIds:
          folder.id === folderId
            ? [...folder.mediaIds.filter(id => id !== mediaId), mediaId]
            : folder.mediaIds.filter(id => id !== mediaId),
        updatedAt: new Date(),
      }))
    );
  };

  const removeMediaFromFolder = (mediaId: string, folderId: string) => {
    setFolders(prev =>
      prev.map(folder =>
        folder.id === folderId
          ? {
              ...folder,
              mediaIds: folder.mediaIds.filter(id => id !== mediaId),
              updatedAt: new Date(),
            }
          : folder
      )
    );
  };

  const getRootFolders = () => folders.filter(f => !f.parent);
  const getChildFolders = (parentId: string) => folders.filter(f => f.parent === parentId);

  const renderFolder = (folder: VirtualFolder, level = 0) => {
    const hasChildren = getChildFolders(folder.id).length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const mediaCount = folder.mediaIds.length;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-50 ${
            selectedFolder === folder.id ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ marginLeft: `${level * 16}px` }}
          onClick={() => setSelectedFolder(folder.id)}
        >
          {hasChildren && (
            <button
              onClick={e => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}

          {!hasChildren && <div className="w-4" />}

          <div className="w-4 h-4 rounded" style={{ backgroundColor: folder.color }} />

          {editingId === folder.id ? (
            <input
              type="text"
              defaultValue={folder.name}
              onBlur={e => updateFolder(folder.id, { name: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  updateFolder(folder.id, { name: e.currentTarget.value });
                } else if (e.key === 'Escape') {
                  setEditingId(null);
                }
              }}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <>
              <span className="flex-1 text-sm font-medium text-gray-900">{folder.name}</span>
              <span className="text-xs text-gray-500">({mediaCount})</span>
            </>
          )}

          {!folder.isSystem && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={e => {
                  e.stopPropagation();
                  setEditingId(folder.id);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  deleteFolder(folder.id);
                }}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>{getChildFolders(folder.id).map(child => renderFolder(child, level + 1))}</div>
        )}
      </div>
    );
  };

  const resetToDefaults = () => {
    setFolders(DEFAULT_FOLDERS);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Virtual Folder Organization</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[60vh]">
          {/* Folder Tree */}
          <div className="w-1/2 p-4 border-r border-gray-200 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Folders</h3>
              <button
                onClick={() => setIsAddingNew(true)}
                disabled={isAddingNew}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-1"
              >
                <FolderPlus className="w-3 h-3" />
                Add
              </button>
            </div>

            <div className="space-y-1 group">
              {getRootFolders().map(folder => renderFolder(folder))}
            </div>

            {isAddingNew && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newFolder.name}
                    onChange={e => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Folder name"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newFolder.description}
                    onChange={e => setNewFolder(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description (optional)"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Color:</span>
                    <div className="flex gap-1">
                      {FOLDER_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewFolder(prev => ({ ...prev, color }))}
                          className={`w-6 h-6 rounded border-2 ${
                            newFolder.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addFolder}
                      disabled={!newFolder.name}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewFolder({
                          name: '',
                          description: '',
                          color: FOLDER_COLORS[0],
                          parent: '',
                        });
                      }}
                      className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Media Management */}
          <div className="w-1/2 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Folder Contents
              {selectedFolder && (
                <span className="ml-2 text-gray-500">
                  ({folders.find(f => f.id === selectedFolder)?.name})
                </span>
              )}
            </h3>

            {selectedFolder ? (
              <div className="space-y-2">
                {folders
                  .find(f => f.id === selectedFolder)
                  ?.mediaIds.map(mediaId => {
                    const media = mediaFiles.find(m => m.id === mediaId);
                    if (!media) return null;

                    return (
                      <div
                        key={mediaId}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{media.filename}</span>
                          <span className="text-xs text-gray-500 capitalize">
                            ({media.mediaType})
                          </span>
                        </div>
                        <button
                          onClick={() => removeMediaFromFolder(mediaId, selectedFolder)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }) || (
                  <p className="text-sm text-gray-500 italic">No media files in this folder</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Select a folder to manage its contents</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
