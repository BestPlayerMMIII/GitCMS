'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { GitCMSMediaFile, MediaType } from '@gitcms/core';
import { MediaLibrary } from './media-library';
import { MediaUploader } from './media-uploader';
import { X, Upload, Grid3X3 } from 'lucide-react';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: GitCMSMediaFile | GitCMSMediaFile[]) => void;
  owner: string;
  repo: string;
  multiple?: boolean;
  acceptedTypes?: MediaType[];
  title?: string;
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  owner,
  repo,
  multiple = false,
  acceptedTypes,
  title = 'Select Media',
}: MediaPickerModalProps) {
  const [currentTab, setCurrentTab] = useState<'library' | 'upload'>('library');
  const [selectedMedia, setSelectedMedia] = useState<GitCMSMediaFile[]>([]);

  // Prevent form submissions within the modal from affecting parent forms
  useEffect(() => {
    const handleFormSubmit = (e: Event) => {
      // Check if the event target is within our modal
      const target = e.target as Element;
      const modal = document.querySelector('[data-media-picker-modal]');
      if (modal && modal.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add event listener to capture form submissions
    document.addEventListener('submit', handleFormSubmit, true);

    return () => {
      document.removeEventListener('submit', handleFormSubmit, true);
    };
  }, []);

  // Handle media selection from library
  const handleMediaSelect = useCallback(
    (media: GitCMSMediaFile) => {
      if (multiple) {
        setSelectedMedia(prev => {
          const isSelected = prev.some(m => m.id === media.id);
          if (isSelected) {
            return prev.filter(m => m.id !== media.id);
          } else {
            return [...prev, media];
          }
        });
      } else {
        // For single selection, immediately select and close
        onSelect(media);
        onClose();
      }
    },
    [multiple, onSelect, onClose]
  );

  // Handle upload completion
  const handleUploadComplete = useCallback(
    (uploadedFiles: GitCMSMediaFile[]) => {
      if (multiple) {
        setSelectedMedia(prev => [...prev, ...uploadedFiles]);
      } else if (uploadedFiles.length > 0) {
        // For single selection, immediately select first uploaded file and close
        onSelect(uploadedFiles[0]);
        onClose();
      }

      // Switch to library tab to show uploaded files
      setCurrentTab('library');
    },
    [multiple, onSelect, onClose]
  );

  // Handle confirm selection (for multiple selection)
  const handleConfirmSelection = useCallback(() => {
    if (selectedMedia.length > 0) {
      onSelect(multiple ? selectedMedia : selectedMedia[0]);
      onClose();
    }
  }, [selectedMedia, multiple, onSelect, onClose]);

  // Handle modal close
  const handleClose = useCallback(() => {
    setSelectedMedia([]);
    setCurrentTab('library');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col"
          data-media-picker-modal
          onClick={e => {
            // Prevent event propagation to parent forms
            e.stopPropagation();
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              {owner && repo && (
                <span className="text-sm text-gray-500">
                  {owner}/{repo}
                </span>
              )}
            </div>

            {/* Tab Buttons */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentTab('library');
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  currentTab === 'library'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3X3 className="w-4 h-4 mr-1.5 inline" />
                Library
              </button>
              <button
                type="button"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentTab('upload');
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  currentTab === 'upload'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Upload className="w-4 h-4 mr-1.5 inline" />
                Upload
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {currentTab === 'library' ? (
              <MediaLibrary
                owner={owner}
                repo={repo}
                onSelect={handleMediaSelect}
                multiple={multiple}
                acceptedTypes={acceptedTypes}
                mode="picker"
              />
            ) : (
              <div className="p-6">
                <MediaUploader
                  owner={owner}
                  repo={repo}
                  acceptedTypes={acceptedTypes}
                  multiple={multiple}
                  maxFiles={multiple ? 10 : 1}
                  onUploadComplete={handleUploadComplete}
                  onError={error => {
                    console.error('Upload error:', error);
                    // TODO: Show error toast/notification
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer (for multiple selection) */}
          {multiple && selectedMedia.length > 0 && currentTab === 'library' && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {selectedMedia.length} file{selectedMedia.length !== 1 ? 's' : ''} selected
                  </span>

                  {/* Selected files preview */}
                  <div className="flex items-center space-x-2">
                    {selectedMedia.slice(0, 3).map(media => (
                      <div
                        key={media.id}
                        className="w-8 h-8 rounded border border-gray-200 overflow-hidden bg-gray-100"
                      >
                        {media.mediaType === 'image' ? (
                          <img
                            src={media.thumbnailUrl || media.url}
                            alt={media.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-gray-500">
                              {media.filename.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedMedia.length > 3 && (
                      <div className="w-8 h-8 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
                        <span className="text-xs text-gray-500">+{selectedMedia.length - 3}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedMedia([]);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleConfirmSelection();
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Select {selectedMedia.length} File{selectedMedia.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for using media picker
export function useMediaPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerProps, setPickerProps] = useState<Partial<MediaPickerModalProps>>({});

  const openPicker = useCallback((props: Omit<MediaPickerModalProps, 'isOpen' | 'onClose'>) => {
    setPickerProps(props);
    setIsOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    setIsOpen(false);
    setPickerProps({});
  }, []);

  const MediaPickerComponent = useCallback(() => {
    if (!isOpen) return null;

    return (
      <MediaPickerModal
        {...(pickerProps as MediaPickerModalProps)}
        isOpen={isOpen}
        onClose={closePicker}
      />
    );
  }, [isOpen, pickerProps, closePicker]);

  return {
    openPicker,
    closePicker,
    MediaPicker: MediaPickerComponent,
    isOpen,
  };
}
