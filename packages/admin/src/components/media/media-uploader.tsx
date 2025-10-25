'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, X, Wifi, WifiOff, HardDrive, FileWarning } from 'lucide-react';
import {
  LFSUtils,
  type LFSFileAnalysis,
  formatFileSize,
  NetworkMonitor,
  type NetworkStats,
  UploadProgressSimulator,
  NetworkUtils as CoreNetworkUtils,
} from '@git-cms/core';
import { useUploadContext } from '@/contexts/upload-context';
import { fetchData } from '@/lib/api-router';

// Re-export network utilities from core for consistency
const NetworkUtils = {
  formatSpeed: (bytesPerSecond?: number) => {
    if (!bytesPerSecond) return '0 MB/s';
    return CoreNetworkUtils.formatSpeed(bytesPerSecond);
  },
  formatTime: (milliseconds?: number) => {
    if (!milliseconds) return '0s';
    return CoreNetworkUtils.formatTime(milliseconds);
  },
  getConnectionQuality: (bytesPerSecond?: number) => {
    if (!bytesPerSecond) return 'Unknown';
    return CoreNetworkUtils.getConnectionQuality(bytesPerSecond);
  },
  getConnectionColor: (quality: string) => {
    return CoreNetworkUtils.getConnectionColor(quality);
  },
};

// Local file interface for UI state (before adding to global context)
interface LocalUploadFile extends File {
  id: string;
  preview?: string;
  lfsAnalysis?: LFSFileAnalysis;
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
  // Local UI state (pending files not yet uploaded)
  const [pendingFiles, setPendingFiles] = useState<LocalUploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const simulatorsRef = useRef<Map<string, UploadProgressSimulator>>(new Map());
  const networkMonitorRef = useRef<NetworkMonitor>();

  // Global upload context for persistent state across tabs
  const { addFiles, updateFile } = useUploadContext();

  // Initialize network monitoring (singleton pattern - shared across all instances)
  useEffect(() => {
    // Get singleton instance
    networkMonitorRef.current = NetworkMonitor.getInstance();

    // Subscribe to network updates
    const unsubscribe = networkMonitorRef.current.subscribe(setNetworkStats);

    // Start monitoring (idempotent - safe to call multiple times)
    networkMonitorRef.current.startMonitoring(1500);

    // Cleanup: only unsubscribe, don't stop monitoring (it's shared!)
    return () => {
      unsubscribe();
      // DON'T stop monitoring - it's a singleton shared across components
    };
  }, []);

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
      const newFiles: LocalUploadFile[] = [];
      const errors: string[] = [];

      for (let i = 0; i < selectedFiles.length && newFiles.length < maxFiles; i++) {
        const file = selectedFiles[i];

        // Check file size limits (2GB for Git LFS)
        const fileSizeMB = file.size / (1024 * 1024);
        const fileSizeGB = fileSizeMB / 1024;
        if (fileSizeGB > 2) {
          errors.push(
            `${file.name}: File too large (${fileSizeGB.toFixed(2)}GB). GitHub LFS maximum is 2GB per file.`
          );
          continue;
        }

        const preview = await createFilePreview(file);
        const lfsAnalysis = analyzeLFSRequirements(file);

        console.log('LFS Analysis for', file.name, lfsAnalysis);

        const localFile: LocalUploadFile = Object.assign(file, {
          id: generateId(),
          preview,
          lfsAnalysis,
        });

        newFiles.push(localFile);
      }

      // Show file size errors if any
      if (errors.length > 0) {
        onError?.(errors.join('\n'));
      }

      setPendingFiles(prev => [...prev, ...newFiles]);
    },
    [createFilePreview, analyzeLFSRequirements, maxFiles, onError]
  );

  // Upload single file with smart 2-phase progress simulation
  const uploadFileWithSimulation = useCallback(
    async (file: LocalUploadFile) => {
      const stats = networkMonitorRef.current?.getCurrentStats();
      const uploadSpeed = stats?.uploadSpeed || 5 * 1024 * 1024; // Default 5 MB/s

      // Add file to context ONCE at the start
      addFiles([
        Object.assign(
          { ...file, name: file.name, size: file.size },
          {
            progress: 0,
            status: 'uploading' as const,
          }
        ),
      ]);

      // Create progress simulator with 2-phase algorithm (alpha=0.9, beta=0.4)
      const simulator = new UploadProgressSimulator({
        fileSize: file.size,
        alpha: 0.9, // Switch to entertainment phase at 90%
        beta: 0.4, // Exponential decay factor for entertainment phase
        updateInterval: 1500, // Update every 1.5 seconds
      });

      // Subscribe to progress updates
      const unsubscribe = simulator.subscribe(progressUpdate => {
        // UPDATE existing file progress (not add new files!)
        updateFile(file.id, {
          progress: progressUpdate.progress,
          status: 'uploading' as const,
          uploadSpeed: progressUpdate.currentSpeed,
          estimatedTime: progressUpdate.estimatedTimeRemaining,
          simulatedProgress: progressUpdate.progress,
        });
      });

      simulatorsRef.current.set(file.id, simulator);

      try {
        // Start simulation
        await simulator.start();

        // Perform actual upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('owner', owner);
        formData.append('repo', repo);
        if (folder) formData.append('folder', folder);

        const response = await fetchData('/api/media?action=upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: Upload failed`;
          try {
            const errorData = await response.json();
            if (errorData?.error) {
              errorMessage = errorData.error;
              if (errorData.details) {
                errorMessage += ` (${errorData.details})`;
              }
            }
          } catch (e) {
            // ignore JSON parse errors
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();

        // Complete simulator and update to success
        simulator.complete();
        updateFile(file.id, {
          progress: 100,
          status: 'success' as const,
        });

        return result.media;
      } catch (error) {
        // Stop simulator and update to error
        simulator.stop();
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        updateFile(file.id, {
          progress: 0,
          status: 'error' as const,
          error: errorMessage,
        });
        throw error;
      } finally {
        // Cleanup
        unsubscribe();
        simulatorsRef.current.delete(file.id);
      }
    },
    [owner, repo, folder, addFiles, updateFile]
  );

  // Upload all pending files
  const uploadAllFiles = useCallback(async () => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
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

      // Clear pending files after successful upload
      setPendingFiles([]);
    } finally {
      setIsUploading(false);
    }
  }, [pendingFiles, uploadFileWithSimulation, onUploadComplete, onError]);

  // Remove file from pending list
  const removeFile = useCallback((id: string) => {
    setPendingFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // Clear all pending files
  const clearFiles = useCallback(() => {
    pendingFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setPendingFiles([]);
  }, [pendingFiles]);

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

  // Get connection quality indicator
  const getConnectionIndicator = () => {
    if (!networkStats) {
      return <WifiOff className="w-4 h-4 text-gray-400" />;
    }

    const quality = NetworkUtils.getConnectionQuality(networkStats.uploadSpeed);
    const color = NetworkUtils.getConnectionColor(quality);

    return <Wifi className={`w-4 h-4 ${color}`} />;
  };

  const hasFiles = pendingFiles.length > 0;
  const hasLargeFiles = pendingFiles.some(f => f.size > 100 * 1024 * 1024);
  const lfsFiles = pendingFiles.filter(f => f.lfsAnalysis?.shouldTrack);

  const sanitizeFileType = (type: string) => {
    if (['image', 'video', 'audio', 'document', 'other'].includes(type)) {
      return type + '/*';
    } else if (type.startsWith('.')) {
      return type;
    } else return '.' + type;
  };

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
              type="button"
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

      {/* LFS Info - Only show if files are very large (>100MB) */}
      {hasLargeFiles && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start">
            <HardDrive className="w-4 h-4 text-blue-500 mt-0.5" />
            <div className="ml-2">
              <p className="text-xs text-blue-700">
                Files ≥1MB automatically use Git LFS for optimal performance.
              </p>
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
          accept={acceptedTypes?.map(type => sanitizeFileType(type)).join(',')}
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
        <p className="text-xs text-blue-600 mt-1">
          Files ≥1MB automatically use Git LFS • Maximum: 2GB per file
        </p>
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Files ({pendingFiles.length})</h4>
            <div className="flex items-center space-x-2">
              {pendingFiles.length > 0 && (
                <button
                  type="button"
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
                type="button"
                onClick={clearFiles}
                disabled={isUploading}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* File Items - Only Pending Files (progress shown in floating indicator) */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingFiles.map(file => (
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
                  </div>
                </div>

                {/* Remove Button */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-gray-600"
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
