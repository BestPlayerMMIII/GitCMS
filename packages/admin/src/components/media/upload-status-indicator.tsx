'use client';

import React from 'react';
import { X, Check, Loader2, AlertTriangle, Upload as UploadIcon } from 'lucide-react';
import { useUploadContext, type UploadFile } from '@/contexts/upload-context';
import { NetworkUtils, formatFileSize } from '@git-cms/core';

/**
 * Floating Upload Status Indicator
 * Shows persistent upload progress even when user switches tabs
 */
export function UploadStatusIndicator() {
  const { files, isUploading, clearCompleted } = useUploadContext();

  const activeUploads = files.filter(f => f.status === 'uploading' || f.status === 'pending');
  const completedUploads = files.filter(f => f.status === 'success');
  const failedUploads = files.filter(f => f.status === 'error');

  // Don't show if no files
  if (files.length === 0) return null;

  const totalProgress =
    files.length > 0 ? files.reduce((sum, f) => sum + (f.progress || 0), 0) / files.length : 0;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-2xl border-2 border-gray-200 z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-2">
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          ) : completedUploads.length > 0 ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <UploadIcon className="w-5 h-5 text-gray-600" />
          )}
          <span className="font-semibold text-sm text-gray-900">
            {isUploading
              ? `Uploading ${activeUploads.length} file${activeUploads.length > 1 ? 's' : ''}...`
              : completedUploads.length > 0
                ? `${completedUploads.length} file${completedUploads.length > 1 ? 's' : ''} uploaded`
                : 'Upload Queue'}
          </span>
        </div>
        {completedUploads.length > 0 && !isUploading && (
          <button
            type="button"
            onClick={clearCompleted}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Overall Progress */}
      {isUploading && (
        <div className="px-4 py-2 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Overall Progress</span>
            <span className="font-medium">{totalProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* File List */}
      <div className="max-h-64 overflow-y-auto">
        {files.map(file => (
          <FileUploadItem key={file.id} file={file} />
        ))}
      </div>

      {/* Summary */}
      {files.length > 3 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
          {completedUploads.length > 0 && (
            <span className="text-green-600 font-medium">
              ✓ {completedUploads.length} completed
            </span>
          )}
          {failedUploads.length > 0 && (
            <span className="text-red-600 font-medium ml-3">✗ {failedUploads.length} failed</span>
          )}
        </div>
      )}
    </div>
  );
}

function FileUploadItem({ file }: { file: UploadFile }) {
  const getStatusIcon = () => {
    switch (file.status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-600 flex-shrink-0" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />;
    }
  };

  const getPhaseLabel = (progress: number) => {
    if (progress >= 99) return 'Finalizing...';
    if (progress >= 90) return 'Almost there';
    if (progress >= 50) return 'Uploading';
    return 'Starting';
  };

  return (
    <div className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex items-start space-x-3">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
            {file.status === 'uploading' && (
              <span className="text-xs text-gray-500 ml-2">{file.progress?.toFixed(0)}%</span>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-1">
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            {file.status === 'uploading' && (
              <>
                <span className="text-gray-300">•</span>
                <p className="text-xs text-blue-600 font-medium">
                  {NetworkUtils.formatSpeed(file.uploadSpeed)}
                </p>
              </>
            )}
            {file.status === 'uploading' && (
              <>
                <span className="text-gray-300">•</span>
                <p className="text-xs text-purple-600">
                  {NetworkUtils.formatTime(file.estimatedTime)}
                </p>
              </>
            )}
          </div>

          {file.status === 'uploading' && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${NetworkUtils.getProgressColor(
                    file.progress >= 90 ? 'entertainment' : 'network'
                  )} ${NetworkUtils.getProgressAnimation(file.progress >= 90 ? 'entertainment' : 'network')}`}
                  style={{ width: `${file.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{getPhaseLabel(file.progress || 0)}</p>
            </div>
          )}

          {file.status === 'error' && file.error && (
            <p className="text-xs text-red-600 mt-1">{file.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
