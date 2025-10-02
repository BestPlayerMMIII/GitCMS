'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Upload,
  X,
  Wifi,
  WifiOff,
  Clock,
  Zap,
  HardDrive,
  AlertTriangle,
  Check,
  Loader2,
  FileWarning,
  Gauge,
} from 'lucide-react';
import {
  NetworkMonitor,
  UploadProgressSimulator,
  NetworkUtils,
  type NetworkStats,
  type UploadProgressSimulation,
  GitLFSManager,
  LFSUtils,
  type LFSFileAnalysis,
  formatFileSize,
} from '@git-cms/core';

interface UploadFile extends File {
  id: string;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  simulator?: UploadProgressSimulator;
  lfsAnalysis?: LFSFileAnalysis;
  estimatedTime?: number;
  currentSpeed?: number;
}

interface MediaUploaderProps {
  owner: string;
  repo: string;
  folder?: string;
  acceptedTypes?: string[];
  multiple?: boolean;
  maxFiles?: number;
  onUploadComplete?: (files: any[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * Media Uploader with network-aware progress simulation and LFS management
 */
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
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [lfsEnabled, setLfsEnabled] = useState(false);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const networkMonitor = useRef<NetworkMonitor>();
  const lfsManager = useRef<GitLFSManager>();

  // Initialize network monitoring and LFS
  useEffect(() => {
    networkMonitor.current = NetworkMonitor.getInstance();

    // Start monitoring network
    networkMonitor.current.startMonitoring(3000);

    // Subscribe to network updates
    const unsubscribe = networkMonitor.current.subscribe(setNetworkStats);

    // Initialize LFS manager (would need GitHub client)
    // lfsManager.current = new GitLFSManager(githubClient, owner, repo);

    return () => {
      unsubscribe();
      networkMonitor.current?.stopMonitoring();
    };
  }, [owner, repo]);

  // Generate unique ID for files
  const generateId = () =>
    `smart_upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

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

  // Analyze file for LFS requirements
  const analyzeLFSRequirements = useCallback(
    (file: File): LFSFileAnalysis => {
      const path = `${folder ? folder + '/' : ''}${file.name}`;
      const extension = file.name.split('.').pop()?.toLowerCase() || '';

      return {
        path,
        size: file.size,
        extension,
        shouldTrack: LFSUtils.shouldUseLFS(file.name, file.size),
        reason:
          file.size > 50 * 1024 * 1024
            ? `Large file (${formatFileSize(file.size)})`
            : `Binary file type (.${extension})`,
      };
    },
    [folder]
  );

  // Handle file selection
  const handleFiles = useCallback(
    async (selectedFiles: FileList) => {
      const newFiles: UploadFile[] = [];
      const errors: string[] = [];

      for (let i = 0; i < selectedFiles.length && newFiles.length < maxFiles; i++) {
        const file = selectedFiles[i];

        // Check file size limits
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 100) {
          errors.push(
            `${file.name}: File too large (${fileSizeMB.toFixed(1)}MB). GitHub supports files up to 100MB.`
          );
          continue;
        }

        const preview = await createFilePreview(file);
        const lfsAnalysis = analyzeLFSRequirements(file);

        const smartFile: UploadFile = Object.assign(file, {
          id: generateId(),
          preview,
          progress: 0,
          status: 'pending' as const,
          lfsAnalysis,
        });

        newFiles.push(smartFile);
      }

      // Show file size errors if any
      if (errors.length > 0) {
        onError?.(errors.join('\n'));
      }

      setFiles(prev => [...prev, ...newFiles]);
    },
    [createFilePreview, analyzeLFSRequirements, maxFiles, onError]
  );

  // Upload single file with smart progress simulation
  const uploadFileWithSimulation = useCallback(
    async (file: UploadFile) => {
      // Create progress simulator
      const simulator = new UploadProgressSimulator({
        fileSize: file.size,
        maxProgress: 98,
        updateInterval: 500,
      });

      file.simulator = simulator;

      // Subscribe to progress updates
      const unsubscribe = simulator.subscribe((progress: UploadProgressSimulation) => {
        setFiles(prev =>
          prev.map(f =>
            f.id === file.id
              ? {
                  ...f,
                  progress: progress.progress,
                  estimatedTime: progress.estimatedTimeRemaining,
                  currentSpeed: progress.currentSpeed,
                }
              : f
          )
        );
      });

      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => (f.id === file.id ? { ...f, status: 'uploading' } : f)));

        // Start progress simulation
        await simulator.start();

        // Perform actual upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('owner', owner);
        formData.append('repo', repo);
        if (folder) formData.append('folder', folder);

        const response = await fetch('/api/media?action=upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: Upload failed`;
          try {
            const errorData = await response.json();
            if (errorData?.error) {
              // Use the backend error message directly, avoiding nested "Upload failed" prefixes
              errorMessage = errorData.error;
              if (errorData.details) {
                errorMessage += ` (${errorData.details})`;
              }
            }
          } catch (e) {
            // ignore JSON parse errors, use default message
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();

        // Update to success
        setFiles(prev =>
          prev.map(f => (f.id === file.id ? { ...f, status: 'success', progress: 100 } : f))
        );

        return result.media;
      } catch (error) {
        // Update to error
        setFiles(prev =>
          prev.map(f =>
            f.id === file.id
              ? {
                  ...f,
                  status: 'error',
                  progress: 0,
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : f
          )
        );
        throw error;
      } finally {
        // Cleanup
        unsubscribe();
        simulator.stop();
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
          const result = await uploadFileWithSimulation(file);
          uploadedFiles.push(result);
        } catch (error) {
          // Extract clean error message without adding filename prefix if it's already included
          const errorMsg = error instanceof Error ? error.message : 'Upload failed';
          const cleanError = errorMsg.includes(file.name) ? errorMsg : `${file.name}: ${errorMsg}`;
          errors.push(cleanError);
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
  }, [files, uploadFileWithSimulation, onUploadComplete, onError]);

  // Remove file
  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.simulator) {
        fileToRemove.simulator.stop();
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.simulator) {
        file.simulator.stop();
      }
    });
    setFiles([]);
  }, [files]);

  // Drag and drop handlers
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
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      }
    },
    [handleFiles]
  );

  // File input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        handleFiles(selectedFiles);
      }
      // Reset input
      if (e.target) {
        e.target.value = '';
      }
    },
    [handleFiles]
  );

  // Get status icon
  const getStatusIcon = (file: UploadFile) => {
    switch (file.status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Get connection quality indicator
  const getConnectionIndicator = () => {
    if (!networkStats) {
      return <WifiOff className="w-4 h-4 text-gray-400" />;
    }

    const quality = NetworkUtils.getConnectionQuality(networkStats.uploadSpeed);
    const colors = {
      Excellent: 'text-green-500',
      'Very Good': 'text-green-400',
      Good: 'text-yellow-500',
      Fair: 'text-orange-500',
      Slow: 'text-red-500',
      'Very Slow': 'text-red-600',
    };

    return (
      <Wifi className={`w-4 h-4 ${colors[quality as keyof typeof colors] || 'text-gray-400'}`} />
    );
  };

  const hasFiles = files.length > 0;
  const pendingFiles = files.filter(f => f.status === 'pending');
  const uploadingFiles = files.filter(f => f.status === 'uploading');
  const completedFiles = files.filter(f => f.status === 'success');
  const errorFiles = files.filter(f => f.status === 'error');
  const lfsFiles = files.filter(f => f.lfsAnalysis?.shouldTrack);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Network Status Bar */}
      {networkStats && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getConnectionIndicator()}
              <div className="text-sm">
                <span className="font-medium">Connection:</span>
                <span className="ml-1 text-gray-600">
                  {NetworkUtils.getConnectionQuality(networkStats.uploadSpeed)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                ↑ {NetworkUtils.formatSpeed(networkStats.uploadSpeed)}
              </div>
              {networkStats.rtt && (
                <div className="text-sm text-gray-600">{Math.round(networkStats.rtt)}ms RTT</div>
              )}
            </div>
            <button
              onClick={() => setShowNetworkInfo(!showNetworkInfo)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showNetworkInfo ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {showNetworkInfo && (
            <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Download</div>
                <div className="font-medium">
                  {NetworkUtils.formatSpeed(networkStats.downloadSpeed)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Upload</div>
                <div className="font-medium">
                  {NetworkUtils.formatSpeed(networkStats.uploadSpeed)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Connection</div>
                <div className="font-medium">{networkStats.connectionType || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-gray-500">Latency</div>
                <div className="font-medium">{Math.round(networkStats.rtt)}ms</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LFS Warning */}
      {lfsFiles.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <HardDrive className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-amber-800">Large Files Detected</h4>
              <p className="text-sm text-amber-700 mt-1">
                {lfsFiles.length} file{lfsFiles.length > 1 ? 's' : ''} recommended for Git LFS
                tracking. These files are large and should be stored using Git Large File Storage
                for better performance.
              </p>
              <div className="mt-2 space-y-1">
                {lfsFiles.map(file => (
                  <div key={file.id} className="text-xs text-amber-600">
                    • {file.name} ({formatFileSize(file.size)}) - {file.lfsAnalysis?.reason}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes?.join(',')}
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">
          {acceptedTypes ? acceptedTypes.join(', ') : 'All file types'}
          {multiple && ` (up to ${maxFiles} files)`}
        </p>
        <p className="text-xs text-amber-600 mt-1">
          📏 File size limit: 100MB per file • Files over 50MB recommended for Git LFS
        </p>
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Files ({files.length})</h4>
            <div className="flex items-center space-x-2">
              {pendingFiles.length > 0 && (
                <button
                  onClick={uploadAllFiles}
                  disabled={isUploading}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUploading
                    ? 'Uploading...'
                    : `Upload ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}`}
                </button>
              )}
              <button
                onClick={clearFiles}
                disabled={isUploading}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Stats */}
          {(uploadingFiles.length > 0 || completedFiles.length > 0 || errorFiles.length > 0) && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-medium text-blue-900">{uploadingFiles.length}</div>
                <div className="text-blue-600">Uploading</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-medium text-green-900">{completedFiles.length}</div>
                <div className="text-green-600">Completed</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="font-medium text-red-900">{errorFiles.length}</div>
                <div className="text-red-600">Errors</div>
              </div>
            </div>
          )}

          {/* File Items */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map(file => (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* File Preview/Icon */}
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      <FileWarning className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    {file.lfsAnalysis?.shouldTrack && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        LFS
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    {file.status === 'uploading' && file.currentSpeed && (
                      <span className="flex items-center">
                        <Zap className="w-3 h-3 mr-1" />
                        {NetworkUtils.formatSpeed(file.currentSpeed)}
                      </span>
                    )}
                    {file.status === 'uploading' && file.estimatedTime && (
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {NetworkUtils.formatTime(file.estimatedTime)}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-2 transition-all duration-300 bg-blue-500"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                        <span>Uploading...</span>
                        <span>{Math.round(file.progress)}%</span>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {file.error && <p className="text-xs text-red-600 mt-1">{file.error}</p>}
                </div>

                {/* Status and Actions */}
                <div className="flex items-center space-x-2">
                  {getStatusIcon(file)}
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === 'uploading'}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
