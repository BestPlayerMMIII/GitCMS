'use client';

import React, { useState } from 'react';
import { MediaLibrary } from '@/components/media/media-library';
import { AuthenticatedImage } from '@/components/media/authenticated-image';
import { useMediaPicker } from '@/components/media/media-picker-modal';
import { Camera, Upload, Grid3X3, Eye } from 'lucide-react';
import { MediaUploader } from '@/components/media/media-uploader';

export default function MediaManagementDemo() {
  const [activeTab, setActiveTab] = useState<'library' | 'uploader' | 'picker'>('library');
  const [selectedMedia, setSelectedMedia] = useState<any[]>([]);
  const { openPicker, MediaPicker } = useMediaPicker();

  // Demo repository data
  const demoOwner = 'demo-user';
  const demoRepo = 'demo-blog';

  const handleMediaSelect = (media: any) => {
    console.log('Selected media:', media);
    if (Array.isArray(media)) {
      setSelectedMedia(media);
    } else {
      setSelectedMedia([media]);
    }
  };

  const handleUploadComplete = (files: any[]) => {
    console.log('Uploaded files:', files);
    // Switch to library to see uploaded files
    setActiveTab('library');
  };

  const openMediaPicker = (multiple: boolean = false) => {
    openPicker({
      owner: demoOwner,
      repo: demoRepo,
      multiple,
      onSelect: handleMediaSelect,
      title: multiple ? 'Select Multiple Media' : 'Select Media',
    });
  };

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Camera className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Media Management Demo</h1>
              <p className="text-gray-600">
                Complete media management system for GitCMS - Phase 5 Implementation
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Features Implemented</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ File validation and type detection</li>
              <li>✅ Drag-and-drop upload with progress tracking</li>
              <li>✅ Media library with grid/list views</li>
              <li>✅ Search, filtering, and organization</li>
              <li>✅ Media picker modal for content integration</li>
              <li>✅ GitHub-based storage and CDN delivery</li>
              <li>✅ Multiple file format support (images, videos, documents, etc.)</li>
            </ul>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('library')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'library'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Grid3X3 className="w-4 h-4 mr-2 inline" />
                Media Library
              </button>
              <button
                onClick={() => setActiveTab('uploader')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'uploader'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="w-4 h-4 mr-2 inline" />
                File Uploader
              </button>
              <button
                onClick={() => setActiveTab('picker')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'picker'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Eye className="w-4 h-4 mr-2 inline" />
                Media Picker
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'library' && (
            <div>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Media Library</h2>
                <p className="text-gray-600 mt-1">
                  Browse, search, and manage all media files in your repository.
                </p>
              </div>
              <MediaLibrary
                owner={demoOwner}
                repo={demoRepo}
                onSelect={handleMediaSelect}
                mode="library"
              />
            </div>
          )}

          {activeTab === 'uploader' && (
            <div>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">File Uploader</h2>
                <p className="text-gray-600 mt-1">
                  Drag and drop files or click to upload. Supports multiple file types with
                  validation.
                </p>
              </div>
              <div className="p-6">
                <MediaUploader
                  owner={demoOwner}
                  repo={demoRepo}
                  folder="demo-uploads"
                  multiple={true}
                  maxFiles={10}
                  onUploadComplete={handleUploadComplete}
                  onError={(error: string) => {
                    console.error('Upload error:', error);
                    alert('Upload error: ' + error);
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'picker' && (
            <div>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Media Picker</h2>
                <p className="text-gray-600 mt-1">
                  Modal interface for selecting media files in content editors.
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {/* Picker Demo Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => openMediaPicker(false)}
                      className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 transition-colors"
                    >
                      <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">Single Selection</p>
                      <p className="text-sm text-gray-500">Select one media file</p>
                    </button>

                    <button
                      onClick={() => openMediaPicker(true)}
                      className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 transition-colors"
                    >
                      <Grid3X3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-medium text-gray-900">Multiple Selection</p>
                      <p className="text-sm text-gray-500">Select multiple media files</p>
                    </button>
                  </div>

                  {/* Selected Media Display */}
                  {selectedMedia.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Selected Media ({selectedMedia.length})
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {selectedMedia.map((media, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              {media.mediaType === 'image' ? (
                                <AuthenticatedImage
                                  owner={demoOwner}
                                  repo={demoRepo}
                                  path={media.path}
                                  alt={media.filename}
                                  thumbnailUrl={media.thumbnailUrl}
                                  className="w-full h-full object-cover"
                                  useThumbnail={!media.thumbnailUrl}
                                  thumbnailOptions={{
                                    maxWidth: 200,
                                    maxHeight: 200,
                                    quality: 0.7,
                                    format: 'image/jpeg',
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="text-center">
                                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                                    <p className="text-xs text-gray-500 truncate px-1">
                                      {media.filename}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {media.filename}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">{media.mediaType}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Implementation Notes */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase 5 Implementation Notes</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Core Features</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Comprehensive file validation (size, type, format)</li>
                <li>• GitHub-based storage with organized file structure</li>
                <li>• Real-time upload progress tracking</li>
                <li>• Media type detection and categorization</li>
                <li>• Folder organization and tagging system</li>
                <li>• Search and filtering capabilities</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Integration Points</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Media field component for content schemas</li>
                <li>• Rich text editor image insertion</li>
                <li>• Content management workflow integration</li>
                <li>• Repository-specific media management</li>
                <li>• Authentication and permission handling</li>
                <li>• Error handling and user feedback</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Next Steps (Future Enhancements)</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Image optimization and resizing</li>
              <li>• CDN integration for better performance</li>
              <li>• Thumbnail generation</li>
              <li>• Metadata extraction (EXIF, dimensions, etc.)</li>
              <li>• Bulk operations (delete, move, tag)</li>
              <li>• Media analytics and usage tracking</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPicker />
    </div>
  );
}
