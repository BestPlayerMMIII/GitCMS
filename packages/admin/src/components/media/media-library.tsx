'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  GitCMSMediaFile,
  MediaType,
  MediaValidator,
  MEDIA_TYPES,
  type CDNConfig,
} from '@git-cms/core';
import CDNSettings from './cdn-settings';
import AdvancedMediaSearch from './advanced-media-search';
import BulkOperations from './bulk-operations';
import { MediaUploader } from './media-uploader';
import { LFSManagement } from './lfs-management';
import {
  Camera,
  Upload,
  Grid3X3,
  List,
  Trash2,
  Download,
  Eye,
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  File,
  Globe,
  HardDrive,
} from 'lucide-react';
import { PageLoading } from '../ui/loading';
import { fetchData } from '@/lib/api-router';

interface MediaLibraryProps {
  owner?: string;
  repo?: string;
  onSelect?: (media: GitCMSMediaFile) => void;
  multiple?: boolean;
  acceptedTypes?: MediaType[];
  mode?: 'library' | 'picker';
  initialTab?: 'library' | 'upload' | 'lfs';
  showTabs?: boolean;
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
  initialTab = 'library',
  showTabs = true,
}: MediaLibraryProps) {
  const { data: session } = useSession();
  const [media, setMedia] = useState<GitCMSMediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MediaFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [showUploader, setShowUploader] = useState(false);
  const [showCDNSettings, setShowCDNSettings] = useState(false);
  const [searchResults, setSearchResults] = useState<GitCMSMediaFile[]>([]);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [hasActiveSearch, setHasActiveSearch] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [refreshKey, setRefreshKey] = useState(0);

  // Determine what media to display
  const displayedMedia = useMemo(() => {
    let result = hasActiveSearch ? searchResults : media;

    // Filter by media type if specified
    if (filters.mediaType) {
      result = result.filter(item => item.mediaType === filters.mediaType);
    }

    // When not in search mode, filter hidden files based on showHidden state
    if (!showHidden) {
      result = result.filter(item => {
        const filename = item.filename;
        // Only filter out files whose filename starts with .
        // Don't filter based on the folder path (e.g., .gitcms is our media folder)
        const isHidden = filename.startsWith('.');
        return !isHidden;
      });
    }

    return result;
  }, [hasActiveSearch, searchResults, media, showHidden, filters.mediaType]);

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

      // Always load hidden files from API - filtering will be done on frontend
      params.set('showHidden', 'true');

      // Include image content for thumbnails
      params.set('includeContent', 'true');
      // Request medium-sized thumbnails for good balance of quality and performance
      params.set('thumbnailSize', 'medium');

      const response = await fetchData(`/api/media?${params}`);
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

  // Handle search results
  const handleSearchResults = useCallback(
    (results: { media: GitCMSMediaFile[]; hasActiveSearch: boolean; showHidden?: boolean }) => {
      setSearchResults(results.media);
      setHasActiveSearch(results.hasActiveSearch);

      // Update showHidden state if it has changed
      if (results.showHidden !== undefined && results.showHidden !== showHidden) {
        setShowHidden(results.showHidden);
      }
    },
    [showHidden]
  );

  // Handle bulk operation completion - prevent auto-refresh
  const handleBulkOperationComplete = useCallback(
    (result: any) => {
      console.log('Bulk operation completed:', result);
      // Only refresh if the operation actually modified files
      if (result.operation === 'delete' || result.operation === 'move-folder') {
        loadMedia();
      }
    },
    [loadMedia]
  );

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedMedia(new Set());
  }, []);

  // Handle upload completion with tab switching and refresh
  const handleUploadComplete = useCallback(
    (uploadedFiles: any[]) => {
      console.log('Upload completed:', uploadedFiles);
      // Refresh the library
      setRefreshKey(prev => prev + 1);
      // Switch to library tab to see uploaded files
      if (showTabs) {
        setActiveTab('library');
      }
      // Close uploader modal if it was open
      setShowUploader(false);
      // Reload media to show new files
      loadMedia();
    },
    [showTabs, loadMedia]
  );

  // Handle upload error
  const handleUploadError = useCallback((error: string) => {
    console.error('Upload error:', error);
    // Show clean error message without redundant "Upload failed" prefix
    const cleanError = error.toLowerCase().startsWith('upload failed:')
      ? error.substring(14).trim() // Remove "Upload failed: " prefix
      : error;
    alert(`Upload Error: ${cleanError}`);
  }, []);

  // Memoize selected media array to prevent recreating on every render
  const selectedMediaArray = useMemo(
    () =>
      Array.from(selectedMedia)
        .map(id => media.find(m => m.id === id)!)
        .filter(Boolean),
    [selectedMedia, media]
  );

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

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
      }
      onSelect(mediaFile);
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
      // Use the props passed to the component instead of trying to access mediaFile.repository
      params.set('owner', owner || mediaFile.repository?.owner || '');
      params.set('repo', repo || mediaFile.repository?.repo || '');

      const response = await fetchData(`/api/media?${params}`, {
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
    return <PageLoading message="Loading media..." />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button
          type="button"
          onClick={() => loadMedia()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // MediaGrid component
  const MediaGrid = () => {
    return displayedMedia.length === 0 ? (
      <div className="text-center py-12">
        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No media files found</h3>
        <p className="text-gray-500 mb-4">
          {hasActiveSearch
            ? 'No media files match your current filters. Try adjusting your search criteria.'
            : media.length === 0
              ? 'Upload some media files to get started.'
              : 'Try adjusting your filters or upload some media files.'}
        </p>
        {mode === 'library' && !hasActiveSearch && (
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setShowUploader(true);
            }}
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
            {displayedMedia.map(mediaFile => (
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
                {displayedMedia.map(mediaFile => (
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
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Camera className="w-6 h-6 mr-2" />
            {showTabs ? 'Media Manager' : 'Media Library'}
            {owner && repo && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                {owner}/{repo}
              </span>
            )}
          </h1>
          {!showTabs && (
            <div className="flex items-center space-x-2">
              {mode === 'library' && (
                <>
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowCDNSettings(true);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    CDN Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploader(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Media
                  </button>
                </>
              )}
              <div className="flex items-center border border-gray-300 rounded-md">
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setViewMode('grid');
                  }}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setViewMode('list');
                  }}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation (only when showTabs is true) */}
        {showTabs && (
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'library', label: 'Media Library', icon: <Camera className="w-4 h-4" /> },
                { id: 'upload', label: 'Upload Files', icon: <Upload className="w-4 h-4" /> },
                ...(owner && repo
                  ? [{ id: 'lfs', label: 'Git LFS', icon: <HardDrive className="w-4 h-4" /> }]
                  : []),
              ].map(tab => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Tab Content */}
      {showTabs ? (
        <div>
          {activeTab === 'library' && (
            <div>
              {/* Advanced Search + Filters */}
              <div className="mb-6">
                <AdvancedMediaSearch media={media} onSearchResults={handleSearchResults} />
                {/* TODO: Virtual Folder Organization */}
              </div>
              {/* Bulk Operations */}
              {selectedMedia.size > 0 && (
                <div className="mb-6">
                  <BulkOperations
                    selectedMedia={selectedMediaArray}
                    onClearSelection={handleClearSelection}
                    onOperationComplete={handleBulkOperationComplete}
                  />
                </div>
              )}

              {/* Media Stats */}
              {media.length > 0 && (
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="text-2xl font-bold text-gray-900">
                      {displayedMedia.length}
                      {filters.mediaType || hasActiveSearch ? ` / ${media.length}` : ''}
                    </div>
                    <div className="text-sm text-gray-500">
                      {filters.mediaType || hasActiveSearch
                        ? 'Filtered / Total Files'
                        : 'Total Files'}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="text-2xl font-bold text-blue-600">
                      {media.filter(m => m.mediaType === 'image').length}
                    </div>
                    <div className="text-sm text-gray-500">Images</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="text-2xl font-bold text-green-600">
                      {media.filter(m => m.mediaType === 'document').length}
                    </div>
                    <div className="text-sm text-gray-500">Documents</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="text-2xl font-bold text-purple-600">
                      {media.filter(m => m.mediaType === 'video' || m.mediaType === 'audio').length}
                    </div>
                    <div className="text-sm text-gray-500">Media</div>
                  </div>
                </div>
              )}

              {/* Media Grid/List */}
              <MediaGrid />
            </div>
          )}

          {activeTab === 'upload' && (
            <MediaUploader
              key={refreshKey}
              owner={owner || ''}
              repo={repo || ''}
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
            />
          )}

          {activeTab === 'lfs' && owner && repo && <LFSManagement owner={owner} repo={repo} />}
        </div>
      ) : (
        <div>
          {/* Bulk Operations */}
          {selectedMedia.size > 0 && (
            <div className="mb-6">
              <BulkOperations
                selectedMedia={selectedMediaArray}
                onClearSelection={handleClearSelection}
                onOperationComplete={handleBulkOperationComplete}
              />
            </div>
          )}

          {/* Media Stats */}
          {media.length > 0 && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-gray-900">
                  {displayedMedia.length}
                  {filters.mediaType || hasActiveSearch ? ` / ${media.length}` : ''}
                </div>
                <div className="text-sm text-gray-500">
                  {filters.mediaType || hasActiveSearch ? 'Filtered / Total Files' : 'Total Files'}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-blue-600">
                  {media.filter(m => m.mediaType === 'image').length}
                </div>
                <div className="text-sm text-gray-500">Images</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-green-600">
                  {media.filter(m => m.mediaType === 'document').length}
                </div>
                <div className="text-sm text-gray-500">Documents</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-purple-600">
                  {media.filter(m => m.mediaType === 'video' || m.mediaType === 'audio').length}
                </div>
                <div className="text-sm text-gray-500">Media</div>
              </div>
            </div>
          )}

          {/* Media Grid/List */}
          <MediaGrid />
        </div>
      )}

      {/* CDN Settings Modal */}
      {showCDNSettings && owner && repo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">CDN Configuration</h2>
                <button
                  type="button"
                  onClick={() => setShowCDNSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <CDNSettings
                owner={owner}
                repo={repo}
                onConfigChange={(config: CDNConfig) => {
                  console.log('CDN config updated:', config);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Media Uploader Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Upload Media</h2>
                <button
                  type="button"
                  onClick={() => setShowUploader(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <MediaUploader
                owner={owner || ''}
                repo={repo || ''}
                acceptedTypes={acceptedTypes}
                multiple={true}
                maxFiles={10}
                onUploadComplete={(uploadedFiles: any[]) => {
                  console.log('Upload completed:', uploadedFiles);
                  setShowUploader(false);
                  loadMedia(); // Refresh media list
                }}
                onError={(error: string) => {
                  console.error('Upload error:', error);
                  // Show clean error message without redundant "Upload failed" prefix
                  const cleanError = error.toLowerCase().startsWith('upload failed:')
                    ? error.substring(14).trim() // Remove "Upload failed: " prefix
                    : error;
                  alert(`Upload Error: ${cleanError}`);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const getMediaTypeIcon = (mediaType: MediaType) => {
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
            draggable={false}
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
      <div className="space-y-1 select-none">
        <h3
          className="text-sm font-medium text-gray-900 truncate select-none"
          title={media.filename}
        >
          {media.filename}
        </h3>
        <p className="text-xs text-gray-500 select-none">
          {MediaValidator.formatFileSize(media.size)}
        </p>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded shadow-sm">
          <div className="flex space-x-1 p-1">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                window.open(media.url, '_blank');
              }}
              className="p-1 hover:bg-gray-50 rounded"
              title="View"
            >
              <Eye className="w-3 h-3 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = media.url;
                link.download = media.filename;
                link.click();
              }}
              className="p-1 hover:bg-gray-50 rounded"
              title="Download"
            >
              <Download className="w-3 h-3 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 hover:bg-red-50 rounded"
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
              <div className="text-sm font-medium text-gray-900 select-none">{media.filename}</div>
              {media.metadata.alt && (
                <div className="text-sm text-gray-500 select-none">{media.metadata.alt}</div>
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
              type="button"
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
              type="button"
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
              type="button"
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
