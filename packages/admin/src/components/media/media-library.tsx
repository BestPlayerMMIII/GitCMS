'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { GitCMSMediaFile, MediaType, MediaValidator, MEDIA_TYPES } from '@gitcms/core';
import {
  Camera,
  FolderOpen,
  Search,
  Filter,
  Upload,
  Grid3X3,
  List,
  Trash2,
  Edit3,
  Download,
  Eye,
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  File,
} from 'lucide-react';

interface MediaLibraryProps {
  owner?: string;
  repo?: string;
  onSelect?: (media: GitCMSMediaFile) => void;
  multiple?: boolean;
  acceptedTypes?: MediaType[];
  mode?: 'library' | 'picker';
}

interface MediaFilters {
  mediaType?: MediaType;
  folder?: string;
  search?: string;
  tags?: string[];
}

export function MediaLibrary({
  owner,
  repo,
  onSelect,
  multiple = false,
  acceptedTypes,
  mode = 'library',
}: MediaLibraryProps) {
  const { data: session } = useSession();
  const [media, setMedia] = useState<GitCMSMediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MediaFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<string[]>([]);
  const [showUploader, setShowUploader] = useState(false);

  // Load media files
  const loadMedia = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('action', owner && repo ? 'repository-media' : 'list');

      if (owner) params.set('owner', owner);
      if (repo) params.set('repo', repo);
      if (filters.mediaType) params.set('mediaType', filters.mediaType);
      if (filters.folder) params.set('folder', filters.folder);
      if (filters.search) params.set('search', filters.search);
      if (filters.tags?.length) params.set('tags', filters.tags.join(','));

      // Include image content for thumbnails
      params.set('includeContent', 'true');
      // Request medium-sized thumbnails for good balance of quality and performance
      params.set('thumbnailSize', 'medium');

      const response = await fetch(`/api/media?${params}`);
      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases more gracefully
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. Check your repository permissions.');
        }
        if (response.status === 404 || data.message?.includes('No media directory')) {
          // No media directory exists yet - this is normal
          setMedia([]);
          setError(null);
          return;
        }
        throw new Error(data.error || 'Failed to load media');
      }

      let mediaFiles = data.media || [];

      // If there's a helpful message (like "select a valid repository"), don't treat it as an error
      if (data.message && mediaFiles.length === 0) {
        setError(null);
        setMedia([]);
        return;
      }

      // Filter by accepted types if specified
      if (acceptedTypes && acceptedTypes.length > 0) {
        mediaFiles = mediaFiles.filter((file: GitCMSMediaFile) =>
          acceptedTypes.includes(file.mediaType)
        );
      }

      setMedia(mediaFiles);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error loading media:', err);
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [session, owner, repo, filters, acceptedTypes]);

  // Load folders
  const loadFolders = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/media?action=folders');
      const data = await response.json();

      if (response.ok) {
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error('Error loading folders:', err);
    }
  }, [session]);

  useEffect(() => {
    loadMedia();
    loadFolders();
  }, [loadMedia, loadFolders]);

  // Handle media selection
  const handleMediaSelect = (mediaFile: GitCMSMediaFile) => {
    if (mode === 'picker' && onSelect) {
      if (multiple) {
        const newSelected = new Set(selectedMedia);
        if (newSelected.has(mediaFile.id)) {
          newSelected.delete(mediaFile.id);
        } else {
          newSelected.add(mediaFile.id);
        }
        setSelectedMedia(newSelected);
      } else {
        onSelect(mediaFile);
      }
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof MediaFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
  };

  // Get media type icon
  const getMediaTypeIcon = (mediaType: MediaType) => {
    switch (mediaType) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    return MediaValidator.formatFileSize(bytes);
  };

  // Handle media deletion
  const handleDeleteMedia = async (mediaFile: GitCMSMediaFile) => {
    if (!window.confirm(`Are you sure you want to delete "${mediaFile.filename}"?`)) {
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set('mediaId', mediaFile.id);
      params.set('owner', mediaFile.repository.owner);
      params.set('repo', mediaFile.repository.repo);

      const response = await fetch(`/api/media?${params}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete media');
      }

      // Reload media
      await loadMedia();
    } catch (err) {
      console.error('Error deleting media:', err);
      alert(`Failed to delete media: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading media...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button
          onClick={loadMedia}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Camera className="w-6 h-6 mr-2" />
            Media Library
            {owner && repo && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                {owner}/{repo}
              </span>
            )}
          </h1>
          <div className="flex items-center space-x-2">
            {mode === 'library' && (
              <button
                type="button"
                onClick={() => setShowUploader(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </button>
            )}
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search media files..."
                value={filters.search || ''}
                onChange={e => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Media Type Filter */}
          <select
            value={filters.mediaType || ''}
            onChange={e => handleFilterChange('mediaType', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="document">Documents</option>
            <option value="other">Other</option>
          </select>

          {/* Folder Filter */}
          <select
            value={filters.folder || ''}
            onChange={e => handleFilterChange('folder', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Folders</option>
            {folders.map(folder => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(filters.search || filters.mediaType || filters.folder) && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Media Grid/List */}
      {media.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No media files found</h3>
          <p className="text-gray-500 mb-4">
            {Object.keys(filters).length > 0
              ? 'Try adjusting your filters or upload some media files.'
              : 'Upload some media files to get started.'}
          </p>
          {mode === 'library' && (
            <button
              onClick={() => setShowUploader(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Upload Media
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {media.map(mediaFile => (
                <MediaCard
                  key={mediaFile.id}
                  media={mediaFile}
                  onSelect={() => handleMediaSelect(mediaFile)}
                  onDelete={() => handleDeleteMedia(mediaFile)}
                  isSelected={selectedMedia.has(mediaFile.id)}
                  selectable={mode === 'picker'}
                  showActions={mode === 'library'}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Folder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    {mode === 'library' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {media.map(mediaFile => (
                    <MediaRow
                      key={mediaFile.id}
                      media={mediaFile}
                      onSelect={() => handleMediaSelect(mediaFile)}
                      onDelete={() => handleDeleteMedia(mediaFile)}
                      isSelected={selectedMedia.has(mediaFile.id)}
                      selectable={mode === 'picker'}
                      showActions={mode === 'library'}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Picker Actions */}
      {mode === 'picker' && multiple && selectedMedia.size > 0 && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
          <button
            onClick={() => {
              const selectedFiles = media.filter(file => selectedMedia.has(file.id));
              selectedFiles.forEach(file => onSelect?.(file));
            }}
            className="font-medium"
          >
            Select {selectedMedia.size} file{selectedMedia.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

// Media Card Component
interface MediaCardProps {
  media: GitCMSMediaFile;
  onSelect: () => void;
  onDelete: () => void;
  isSelected: boolean;
  selectable: boolean;
  showActions: boolean;
}

function MediaCard({
  media,
  onSelect,
  onDelete,
  isSelected,
  selectable,
  showActions,
}: MediaCardProps) {
  const getMediaTypeIcon = (mediaType: MediaType) => {
    switch (mediaType) {
      case 'image':
        return <ImageIcon className="w-8 h-8 text-green-500" />;
      case 'video':
        return <Video className="w-8 h-8 text-red-500" />;
      case 'audio':
        return <Music className="w-8 h-8 text-purple-500" />;
      case 'document':
        return <FileText className="w-8 h-8 text-blue-500" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <div
      className={`relative group bg-white border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
      }`}
      onClick={onSelect}
    >
      {/* Media Preview */}
      <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
        {media.mediaType === 'image' ? (
          <img
            src={media.thumbnailUrl || media.url}
            alt={media.metadata.alt || media.filename}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={e => {
              console.error('Failed to load image:', media.thumbnailUrl || media.url);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              // Show fallback icon
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.fallback-icon')) {
                const fallbackDiv = document.createElement('div');
                fallbackDiv.className = 'fallback-icon text-gray-400';
                fallbackDiv.innerHTML = `
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs mt-1">Image not available</p>
                `;
                parent.appendChild(fallbackDiv);
              }
            }}
          />
        ) : (
          getMediaTypeIcon(media.mediaType)
        )}
      </div>

      {/* File Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-900 truncate" title={media.filename}>
          {media.filename}
        </h3>
        <p className="text-xs text-gray-500">{MediaValidator.formatFileSize(media.size)}</p>
        {media.metadata.folder && (
          <p className="text-xs text-gray-400 flex items-center">
            <FolderOpen className="w-3 h-3 mr-1" />
            {media.metadata.folder}
          </p>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex space-x-1">
            <button
              onClick={e => {
                e.stopPropagation();
                window.open(media.url, '_blank');
              }}
              className="p-1 bg-white rounded shadow-sm hover:bg-gray-50"
              title="View"
            >
              <Eye className="w-3 h-3 text-gray-600" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = media.url;
                link.download = media.filename;
                link.click();
              }}
              className="p-1 bg-white rounded shadow-sm hover:bg-gray-50"
              title="Download"
            >
              <Download className="w-3 h-3 text-gray-600" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 bg-white rounded shadow-sm hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
            </button>
          </div>
        </div>
      )}

      {/* Selection Indicator */}
      {selectable && (
        <div className="absolute top-2 left-2">
          <div
            className={`w-4 h-4 rounded border-2 ${
              isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Media Row Component for List View
interface MediaRowProps {
  media: GitCMSMediaFile;
  onSelect: () => void;
  onDelete: () => void;
  isSelected: boolean;
  selectable: boolean;
  showActions: boolean;
}

function MediaRow({
  media,
  onSelect,
  onDelete,
  isSelected,
  selectable,
  showActions,
}: MediaRowProps) {
  const getMediaTypeIcon = (mediaType: MediaType) => {
    switch (mediaType) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-green-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-red-500" />;
      case 'audio':
        return <Music className="w-4 h-4 text-purple-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <tr
      className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
      onClick={onSelect}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {selectable && (
            <div className="mr-3">
              <div
                className={`w-4 h-4 rounded border-2 ${
                  isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                }`}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center">
            {media.mediaType === 'image' ? (
              <img
                src={media.thumbnailUrl || media.url}
                alt={media.metadata.alt || media.filename}
                className="w-10 h-10 rounded object-cover mr-3"
                loading="lazy"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center mr-3">
                {getMediaTypeIcon(media.mediaType)}
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-900">{media.filename}</div>
              {media.metadata.alt && (
                <div className="text-sm text-gray-500">{media.metadata.alt}</div>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
        {media.mediaType}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {MediaValidator.formatFileSize(media.size)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {media.metadata.folder || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(media.uploadedAt).toLocaleDateString()}
      </td>
      {showActions && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <div className="flex space-x-2">
            <button
              onClick={e => {
                e.stopPropagation();
                window.open(media.url, '_blank');
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = media.url;
                link.download = media.filename;
                link.click();
              }}
              className="text-green-600 hover:text-green-800"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
