'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MediaUploader } from '../media/media-uploader';
import { Image as ImageIcon, Video, File, Search, Grid, List, X, Check, Play } from 'lucide-react';
import { MediaValidator, type GitCMSMediaFile, type MediaType } from '@git-cms/core';

interface MediaPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: GitCMSMediaFile) => void;
  owner: string;
  repo: string;
  acceptedTypes?: MediaType[];
  title?: string;
  allowUpload?: boolean;
}

interface MediaItem {
  id: string;
  filename: string;
  path: string;
  url: string;
  size: number;
  mediaType: string;
  mimeType: string;
  metadata?: {
    alt?: string;
    description?: string;
    folder?: string;
  };
  uploadedAt: string;
}

export function MediaPickerDialog({
  isOpen,
  onClose,
  onSelect,
  owner,
  repo,
  acceptedTypes,
  title = 'Select Media',
  allowUpload = true,
}: MediaPickerDialogProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  // Load media items from repository
  const loadMediaItems = useCallback(async () => {
    if (!isOpen) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'repository-media',
        owner,
        repo,
      });

      if (selectedMediaType !== 'all') {
        params.set('mediaType', selectedMediaType);
      }

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/media?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load media: ${response.status}`);
      }

      const data = await response.json();
      setMediaItems(data.media || []);
    } catch (error) {
      console.error('Failed to load media:', error);
      setMediaItems([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, owner, repo, selectedMediaType, searchQuery]);

  // Load media on mount and when filters change
  useEffect(() => {
    loadMediaItems();
  }, [loadMediaItems]);

  // Filter items based on accepted types
  const filteredItems = mediaItems.filter(item => {
    if (!acceptedTypes?.length) return true;
    return acceptedTypes.includes(item.mediaType as MediaType);
  });

  // Handle media upload completion
  const handleUploadComplete = useCallback((uploadedFiles: GitCMSMediaFile[]) => {
    // Add uploaded files to the library
    const newItems: MediaItem[] = uploadedFiles.map(file => ({
      id: file.id,
      filename: file.filename,
      path: file.path,
      url: file.url,
      size: file.size,
      mediaType: file.mediaType,
      mimeType: file.mimeType,
      metadata: file.metadata,
      uploadedAt: file.uploadedAt,
    }));

    setMediaItems(prev => [...newItems, ...prev]);

    // If only one file was uploaded, auto-select it
    if (uploadedFiles.length === 1) {
      setSelectedItem(newItems[0]);
      setActiveTab('library');
    }
  }, []);

  // Handle item selection
  const handleItemSelect = useCallback((item: MediaItem) => {
    setSelectedItem(item);
  }, []);

  // Handle confirm selection
  const handleConfirmSelection = useCallback(() => {
    if (selectedItem) {
      onSelect({
        id: selectedItem.id,
        filename: selectedItem.filename,
        path: selectedItem.path,
        url: selectedItem.url,
        size: selectedItem.size,
        mediaType: selectedItem.mediaType as MediaType,
        mimeType: selectedItem.mimeType,
        metadata: selectedItem.metadata || {},
        uploadedAt: selectedItem.uploadedAt,
        originalName: selectedItem.filename,
        uploadedBy: 'current-user',
        repository: { owner, repo },
      });
      onClose();
      setSelectedItem(null);
    }
  }, [selectedItem, onSelect, onClose, owner, repo]);

  // Get media type filter options
  const mediaTypeOptions = [
    { value: 'all', label: 'All Types', icon: File },
    { value: 'image', label: 'Images', icon: ImageIcon },
    { value: 'video', label: 'Videos', icon: Video },
    { value: 'audio', label: 'Audio', icon: File },
    { value: 'document', label: 'Documents', icon: File },
  ].filter(option => {
    if (!acceptedTypes?.length) return true;
    if (option.value === 'all') return true;
    return acceptedTypes.includes(option.value as MediaType);
  });

  // Render media item thumbnail
  const renderMediaThumbnail = (item: MediaItem) => {
    if (item.mediaType === 'image') {
      return (
        <img
          src={item.url}
          alt={item.metadata?.alt || item.filename}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      );
    }

    if (item.mediaType === 'video') {
      return (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center relative">
          <Video className="w-8 h-8 text-gray-400" />
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
            <Play className="w-6 h-6 text-white" />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <File className="w-8 h-8 text-gray-400" />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 p-6">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab('library')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'library'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Media Library ({filteredItems.length})
                </button>
                {allowUpload && (
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'upload'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Upload New
                  </button>
                )}
              </div>

              {activeTab === 'library' && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Filters and Search */}
                  <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-gray-200">
                    {/* Search */}
                    <div className="flex-1 min-w-64">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search media files..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Media Type Filter */}
                    <div className="flex gap-1">
                      {mediaTypeOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => setSelectedMediaType(option.value as MediaType | 'all')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedMediaType === option.value
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <option.icon className="w-4 h-4" />
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {/* View Mode */}
                    <div className="flex border border-gray-300 rounded-md">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 ${
                          viewMode === 'grid'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Grid View"
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 border-l border-gray-300 ${
                          viewMode === 'list'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="List View"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Media Grid/List */}
                  <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : filteredItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <ImageIcon className="w-12 h-12 mb-4" />
                        <p className="text-lg font-medium mb-2">No media files found</p>
                        <p className="text-sm">
                          {searchQuery
                            ? 'Try adjusting your search terms'
                            : 'Upload some files to get started'}
                        </p>
                      </div>
                    ) : viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredItems.map(item => (
                          <div
                            key={item.id}
                            onClick={() => handleItemSelect(item)}
                            className={`relative aspect-square rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                              selectedItem?.id === item.id
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="w-full h-full rounded-lg overflow-hidden">
                              {renderMediaThumbnail(item)}
                            </div>

                            {/* Selection Indicator */}
                            {selectedItem?.id === item.id && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4" />
                              </div>
                            )}

                            {/* File Info Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2 rounded-b-lg">
                              <p className="text-xs font-medium truncate">{item.filename}</p>
                              <p className="text-xs text-gray-300">
                                {MediaValidator.formatFileSize(item.size)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredItems.map(item => (
                          <div
                            key={item.id}
                            onClick={() => handleItemSelect(item)}
                            className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              selectedItem?.id === item.id
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                              {renderMediaThumbnail(item)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{item.filename}</p>
                              <p className="text-sm text-gray-500">
                                {MediaValidator.formatFileSize(item.size)} • {item.mediaType}
                              </p>
                              {item.metadata?.description && (
                                <p className="text-sm text-gray-600 truncate">
                                  {item.metadata.description}
                                </p>
                              )}
                            </div>

                            {selectedItem?.id === item.id && (
                              <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'upload' && allowUpload && (
                <div className="flex-1">
                  <MediaUploader
                    owner={owner}
                    repo={repo}
                    acceptedTypes={acceptedTypes}
                    multiple={true}
                    maxFiles={10}
                    onUploadComplete={handleUploadComplete}
                    onError={error => console.error('Upload error:', error)}
                    className="h-full"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                <div className="text-sm text-gray-500">
                  {selectedItem ? (
                    <span>
                      Selected: <strong>{selectedItem.filename}</strong> (
                      {MediaValidator.formatFileSize(selectedItem.size)})
                    </span>
                  ) : (
                    'Select a media file to continue'
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSelection}
                    disabled={!selectedItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    Insert Media
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
