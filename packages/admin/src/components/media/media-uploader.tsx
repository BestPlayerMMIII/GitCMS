'use client';

import React, { useState, useRef, useCallback } from 'react';
import { MediaType, MediaValidator, MEDIA_TYPES } from '@gitcms/core';
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

// Chunked upload configuration
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB - files larger than this use chunked upload

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  processingProgress?: number;
  phase: 'upload' | 'processing' | 'complete';
  error?: string;
  preview?: string;
  uploadId?: string; // For chunked uploads
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
          phase: 'upload',
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

  // Upload single file with chunking support
  const uploadFile = useCallback(
    async (uploadFile: UploadFile): Promise<void> => {
      const isLargeFile = uploadFile.file.size > LARGE_FILE_THRESHOLD;

      if (isLargeFile) {
        return uploadFileChunked(uploadFile);
      } else {
        return uploadFileTraditional(uploadFile);
      }
    },
    [owner, repo, folder]
  );

  // Traditional upload for smaller files
  const uploadFileTraditional = useCallback(
    async (uploadFile: UploadFile): Promise<void> => {
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('owner', owner);
      formData.append('repo', repo);
      if (folder) formData.append('folder', folder);

      // Update status to uploading
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0, phase: 'upload' } : f
        )
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
                f.id === uploadFile.id
                  ? { ...f, status: 'success', progress: 100, phase: 'complete' }
                  : f
              )
            );
            resolve(result.media);
          } else {
            let errorMessage = 'Upload failed';
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.error || errorMessage;
            } catch (e) {}
            setFiles(prev =>
              prev.map(f =>
                f.id === uploadFile.id
                  ? { ...f, status: 'error', progress: 0, error: errorMessage, phase: 'upload' }
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
                ? { ...f, status: 'error', progress: 0, error: 'Upload failed', phase: 'upload' }
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

  // Chunked upload for larger files
  const uploadFileChunked = useCallback(
    async (uploadFile: UploadFile): Promise<any> => {
      const file = uploadFile.file;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Update file with upload ID
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'uploading', progress: 0, phase: 'upload', uploadId }
            : f
        )
      );

      try {
        // Step 1: Initialize chunked upload
        const initResponse = await fetch('/api/media/chunked?action=init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileSize: file.size,
            totalChunks,
            mimeType: file.type,
            owner,
            repo,
            folder,
            uploadId,
          }),
        });

        if (!initResponse.ok) {
          const errorText = await initResponse.text();
          console.error('Init response error:', errorText);
          throw new Error('Failed to initialize chunked upload');
        }

        const initResult = await initResponse.json();
        console.log('Upload initialized:', initResult);

        // Step 2: Upload chunks
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const chunkFormData = new FormData();
          chunkFormData.append('chunk', chunk);
          chunkFormData.append('uploadId', uploadId);
          chunkFormData.append('chunkIndex', chunkIndex.toString());
          chunkFormData.append('totalChunks', totalChunks.toString());

          const chunkResponse = await fetch('/api/media/chunked?action=upload-chunk', {
            method: 'POST',
            body: chunkFormData,
          });

          if (!chunkResponse.ok) {
            const errorText = await chunkResponse.text();
            console.error(`Chunk ${chunkIndex + 1} response error:`, errorText);
            throw new Error(`Failed to upload chunk ${chunkIndex + 1}`);
          }

          const chunkResult = await chunkResponse.json();
          console.log(`Chunk ${chunkIndex + 1} uploaded:`, chunkResult);

          // Update upload progress
          const uploadProgress = ((chunkIndex + 1) / totalChunks) * 50; // 50% for upload phase
          setFiles(prev =>
            prev.map(f => (f.id === uploadFile.id ? { ...f, progress: uploadProgress } : f))
          );
        }

        // Step 3: Finalize and upload to GitHub (with progress updates via SSE)
        setFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, status: 'processing', phase: 'processing', processingProgress: 0 }
              : f
          )
        );

        return new Promise((resolve, reject) => {
          // Start the finalization process
          console.log('Starting finalization for uploadId:', uploadId);

          fetch('/api/media/chunked?action=finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uploadId }),
          })
            .then(response => {
              if (!response.ok) {
                response.text().then(errorText => {
                  console.error('Finalize response error:', errorText);
                  reject(new Error('Failed to start finalization'));
                });
                return;
              }

              response.json().then(result => {
                console.log('Finalization started:', result);
              });
            })
            .catch(error => {
              console.error('Finalize request error:', error);
              reject(error);
            });

          // Listen for progress updates via Server-Sent Events
          const eventSource = new EventSource(`/api/media/chunked/progress?uploadId=${uploadId}`);

          let progressTimeout = setTimeout(() => {
            console.error('Progress timeout - no updates received');
            eventSource.close();
            reject(new Error('Upload progress timeout'));
          }, 30000); // 30 second timeout

          eventSource.onmessage = event => {
            clearTimeout(progressTimeout);
            const data = JSON.parse(event.data);
            console.log('Progress update:', data);

            if (data.type === 'progress') {
              const processingProgress = data.progress;
              const totalProgress = 50 + processingProgress * 0.5; // 50% upload + 50% processing

              setFiles(prev =>
                prev.map(f =>
                  f.id === uploadFile.id ? { ...f, progress: totalProgress, processingProgress } : f
                )
              );

              // Reset timeout for next update
              progressTimeout = setTimeout(() => {
                console.error('Progress timeout - no updates received');
                eventSource.close();
                reject(new Error('Upload progress timeout'));
              }, 30000);
            } else if (data.type === 'complete') {
              clearTimeout(progressTimeout);
              eventSource.close();
              console.log('Upload completed:', data.media);
              setFiles(prev =>
                prev.map(f =>
                  f.id === uploadFile.id
                    ? { ...f, status: 'success', progress: 100, phase: 'complete' }
                    : f
                )
              );
              resolve(data.media);
            } else if (data.type === 'error') {
              clearTimeout(progressTimeout);
              eventSource.close();
              console.error('Upload error from SSE:', data.error);
              setFiles(prev =>
                prev.map(f =>
                  f.id === uploadFile.id
                    ? { ...f, status: 'error', error: data.error, phase: 'processing' }
                    : f
                )
              );
              reject(new Error(data.error));
            }
          };

          eventSource.onerror = error => {
            clearTimeout(progressTimeout);
            console.error('EventSource error:', error);
            eventSource.close();
            setFiles(prev =>
              prev.map(f =>
                f.id === uploadFile.id
                  ? {
                      ...f,
                      status: 'error',
                      error: 'Connection lost during processing',
                      phase: 'processing',
                    }
                  : f
              )
            );
            reject(new Error('Connection lost during processing'));
          };
        });
      } catch (error) {
        setFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed',
                  phase: 'upload',
                }
              : f
          )
        );
        throw error;
      }
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
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />;
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

    switch (uploadFile.phase) {
      case 'upload':
        return 'Uploading...';
      case 'processing':
        return 'Processing on GitHub...';
      case 'complete':
        return 'Complete';
      default:
        return '';
    }
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
                    {uploadFile.file.size > LARGE_FILE_THRESHOLD && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        Large file - chunked upload
                      </span>
                    )}
                  </p>
                  {/* Progress Bar & Processing State */}
                  {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                    <div className="w-full mt-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-2 transition-all duration-200 ${
                            uploadFile.status === 'processing' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                        <span>{getPhaseLabel(uploadFile)}</span>
                        <span>{Math.round(uploadFile.progress)}%</span>
                      </div>
                      {/* Additional processing progress for chunked uploads */}
                      {uploadFile.status === 'processing' &&
                        uploadFile.processingProgress !== undefined && (
                          <div className="text-xs text-gray-500 mt-1">
                            GitHub upload: {Math.round(uploadFile.processingProgress)}%
                          </div>
                        )}
                    </div>
                  )}
                  {/* Large File Warning */}
                  {files.some(f => f.file.size > 10 * 1024 * 1024) && (
                    <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
                      Warning: Large files (&gt;10MB) may take a long time to upload and process.
                      Please be patient.
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
