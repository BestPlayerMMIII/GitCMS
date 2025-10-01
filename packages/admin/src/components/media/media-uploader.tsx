'use client';

import React, { useState, useRef, useCallback } from 'react';
import { MediaType, MediaValidator, MEDIA_TYPES } from '@git-cms/core';
import ImageOptimizer from './image-optimizer';
import {
  Upload,
  X,
  Check,
  AlertCircle,
  File,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Loader2,
  Settings,
  Zap,
} from 'lucide-react';

// Direct upload configuration - no chunking needed

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  preview?: string;
}

interface MediaUploaderProps {
  owner: string;
  repo: string;
  folder?: string;
  acceptedTypes?: MediaType[];
  multiple?: boolean;
  maxFiles?: number;
  onUploadComplete?: (files: any[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function MediaUploader({
  owner,
  repo,
  folder,
  acceptedTypes,
  multiple = true,
  maxFiles = 10,
  onUploadComplete,
  onError,
  className = '',
}: MediaUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [optimizedFiles, setOptimizedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID for upload file
  const generateId = () => `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Create file preview
  const createFilePreview = useCallback((file: File): Promise<string | undefined> => {
    return new Promise(resolve => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  }, []);

  // Add files to upload queue
  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const newFiles: UploadFile[] = [];
      const filesArray = Array.from(fileList);

      // Check file count limit
      if (files.length + filesArray.length > maxFiles) {
        onError?.(`Cannot upload more than ${maxFiles} files at once`);
        return;
      }

      for (const file of filesArray) {
        // Validate file
        const validation = MediaValidator.validateFile(file, acceptedTypes);
        if (!validation.valid) {
          onError?.(`${file.name}: ${validation.error}`);
          continue;
        }

        // Create preview
        const preview = await createFilePreview(file);

        newFiles.push({
          file,
          id: generateId(),
          status: 'pending',
          progress: 0,
          preview,
        });
      }

      setFiles(prev => [...prev, ...newFiles]);
    },
    [files.length, maxFiles, acceptedTypes, onError, createFilePreview]
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles) {
        addFiles(selectedFiles);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addFiles]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles) {
        addFiles(droppedFiles);
      }
    },
    [addFiles]
  );

  // Remove file from queue
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Upload single file directly to GitHub
  const uploadFile = useCallback(
    async (uploadFile: UploadFile): Promise<void> => {
      return uploadFileDirect(uploadFile);
    },
    [owner, repo, folder]
  );

  // Direct upload to GitHub
  const uploadFileDirect = useCallback(
    async (uploadFile: UploadFile): Promise<void> => {
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('owner', owner);
      formData.append('repo', repo);
      if (folder) formData.append('folder', folder);

      // Update status to uploading
      setFiles(prev =>
        prev.map(f => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f))
      );

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/media?action=upload');

        xhr.upload.onprogress = event => {
          if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            setFiles(prev =>
              prev.map(f => (f.id === uploadFile.id ? { ...f, progress: percent } : f))
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            let result;
            try {
              result = JSON.parse(xhr.responseText);
            } catch (e) {
              result = {};
            }
            setFiles(prev =>
              prev.map(f =>
                f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
              )
            );
            resolve(result.media);
          } else {
            let errorMessage = 'Upload failed';
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.error || errorMessage;
            } catch (e) {
              // already in error state
            }
            setFiles(prev =>
              prev.map(f =>
                f.id === uploadFile.id
                  ? { ...f, status: 'error', progress: 0, error: errorMessage }
                  : f
              )
            );
            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = () => {
          setFiles(prev =>
            prev.map(f =>
              f.id === uploadFile.id
                ? { ...f, status: 'error', progress: 0, error: 'Upload failed' }
                : f
            )
          );
          reject(new Error('Upload failed'));
        };

        xhr.send(formData);
      });
    },
    [owner, repo, folder]
  );

  // Upload all files
  const uploadAllFiles = useCallback(async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    const uploadedFiles: any[] = [];
    const errors: string[] = [];

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of pendingFiles) {
        try {
          const result = await uploadFile(file);
          uploadedFiles.push(result);
        } catch (error) {
          errors.push(
            `${file.file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`
          );
        }
      }

      if (uploadedFiles.length > 0) {
        onUploadComplete?.(uploadedFiles);
      }

      if (errors.length > 0) {
        onError?.(errors.join('\n'));
      }
    } finally {
      setIsUploading(false);
    }
  }, [files, uploadFile, onUploadComplete, onError]);

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([]);
    setOptimizedFiles([]);
  }, []);

  // Handle optimized images
  const handleOptimizedImages = useCallback((results: any[]) => {
    // Replace original files with optimized versions
    const optimizedFileMap = new Map(results.map(r => [r.originalFile.name, r.optimizedFile]));

    setFiles(prev =>
      prev.map(uploadFile => {
        const optimizedFile = optimizedFileMap.get(uploadFile.file.name);
        if (optimizedFile) {
          return {
            ...uploadFile,
            file: optimizedFile,
          };
        }
        return uploadFile;
      })
    );

    // Store optimized files for reference
    setOptimizedFiles(results.map(r => r.optimizedFile));

    // Hide optimizer after optimization
    setShowOptimizer(false);
  }, []);

  // Handle optimization progress
  const handleOptimizationProgress = useCallback((completed: number, total: number) => {
    // Could show progress if needed
    console.log(`Optimization progress: ${completed}/${total}`);
  }, []);

  // Get file type icon
  const getFileIcon = (file: File) => {
    const mediaType = MediaValidator.getMediaType(file);
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

  // Get status icon
  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Get phase label
  const getPhaseLabel = (uploadFile: UploadFile) => {
    if (uploadFile.status === 'pending') return '';
    if (uploadFile.status === 'error') return 'Failed';
    if (uploadFile.status === 'success') return 'Complete';
    if (uploadFile.status === 'uploading') return 'Uploading...';
    return '';
  };

  const hasFiles = files.length > 0;
  const pendingFiles = files.filter(f => f.status === 'pending');
  const completedFiles = files.filter(f => f.status === 'success');
  const errorFiles = files.filter(f => f.status === 'error');

  // Generate accepted file types text
  const acceptedTypesText = acceptedTypes
    ? acceptedTypes
        .map(type => {
          const config = MEDIA_TYPES[type];
          return config.extensions.join(', ');
        })
        .join(', ')
    : 'All file types';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Drop files here or click to upload
        </h3>
        <p className="text-gray-500 mb-4">
          {multiple ? `Upload up to ${maxFiles} files` : 'Upload a single file'}
        </p>
        <p className="text-sm text-gray-400 mb-4">Supported formats: {acceptedTypesText}</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Choose Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes?.map(type => MEDIA_TYPES[type].extensions.join(',')).join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Files ({files.length})</h4>
            <div className="flex space-x-2">
              {/* Image Optimization Button */}
              {pendingFiles.some(f => f.file.type.startsWith('image/')) && (
                <button
                  type="button"
                  onClick={() => setShowOptimizer(!showOptimizer)}
                  disabled={isUploading}
                  className={`px-4 py-2 border rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${
                    showOptimizer
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Optimize Images
                </button>
              )}
              {pendingFiles.length > 0 && (
                <button
                  type="button"
                  onClick={uploadAllFiles}
                  disabled={isUploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload All
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={clearFiles}
                disabled={isUploading}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Image Optimizer */}
          {showOptimizer && (
            <div className="mb-6">
              <ImageOptimizer
                files={files.map(f => f.file)}
                onOptimized={handleOptimizedImages}
                onProgress={handleOptimizationProgress}
                className="border-t border-gray-200 pt-6"
              />
            </div>
          )}

          {/* File Items */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {files.map(uploadFile => (
              <div
                key={uploadFile.id}
                className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
              >
                {/* File Preview/Icon */}
                <div className="flex-shrink-0">
                  {uploadFile.preview ? (
                    <img
                      src={uploadFile.preview}
                      alt={uploadFile.file.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    getFileIcon(uploadFile.file)
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {MediaValidator.formatFileSize(uploadFile.file.size)}
                  </p>
                  {/* Progress Bar */}
                  {uploadFile.status === 'uploading' && (
                    <div className="w-full mt-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-2 transition-all duration-200 bg-blue-500"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                        <span>{getPhaseLabel(uploadFile)}</span>
                        <span>{Math.round(uploadFile.progress)}%</span>
                      </div>
                    </div>
                  )}
                  {uploadFile.error && (
                    <p className="text-sm text-red-600 mt-1">{uploadFile.error}</p>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  {getStatusIcon(uploadFile.status)}
                  <button
                    type="button"
                    onClick={() => removeFile(uploadFile.id)}
                    disabled={uploadFile.status === 'uploading'}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Summary */}
          {(completedFiles.length > 0 || errorFiles.length > 0) && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                {completedFiles.length > 0 && (
                  <span className="text-green-600">
                    {completedFiles.length} uploaded successfully
                  </span>
                )}
                {errorFiles.length > 0 && (
                  <span className="text-red-600">{errorFiles.length} failed to upload</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
