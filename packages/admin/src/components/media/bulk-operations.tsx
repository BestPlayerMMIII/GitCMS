'use client';

import React, { useState, memo, useCallback } from 'react';
import { type GitCMSMediaFile } from '@git-cms/core';
import {
  Check,
  X,
  Trash2,
  Tag,
  FolderOpen,
  Copy,
  Download,
  Settings,
  PlayCircle,
  PauseCircle,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface BulkOperationsProps {
  selectedMedia: GitCMSMediaFile[];
  onClearSelection: () => void;
  onOperationComplete: (results: BulkOperationResult) => void;
  className?: string;
}

interface BulkOperationResult {
  operation: string;
  success: number;
  failed: number;
  errors: string[];
}

type BulkOperationType =
  | 'add-tags'
  | 'remove-tags'
  | 'move-folder'
  | 'duplicate'
  | 'delete'
  | 'download';

interface BulkOperation {
  id: string;
  type: BulkOperationType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  parameters: Record<string, any>;
}

function BulkOperations({
  selectedMedia,
  onClearSelection,
  onOperationComplete,
  className = '',
}: BulkOperationsProps) {
  const [activeOperation, setActiveOperation] = useState<BulkOperation | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<BulkOperationType | null>(null);
  const [operationParams, setOperationParams] = useState<Record<string, any>>({});

  // Prevent event propagation to parent forms/containers
  const handleInteraction = useCallback((e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
  }, []);

  const operations = [
    {
      id: 'add-tags',
      name: 'Add Tags',
      icon: <Tag className="w-4 h-4" />,
      description: 'Add tags to selected media files',
      needsParams: true,
      dangerous: false,
    },
    {
      id: 'remove-tags',
      name: 'Remove Tags',
      icon: <Tag className="w-4 h-4" />,
      description: 'Remove tags from selected media files',
      needsParams: true,
      dangerous: false,
    },
    {
      id: 'move-folder',
      name: 'Move to Folder',
      icon: <FolderOpen className="w-4 h-4" />,
      description: 'Move files to a different folder',
      needsParams: true,
      dangerous: false,
    },
    {
      id: 'duplicate',
      name: 'Duplicate',
      icon: <Copy className="w-4 h-4" />,
      description: 'Create copies of selected files',
      needsParams: false,
      dangerous: false,
    },
    {
      id: 'download',
      name: 'Download All',
      icon: <Download className="w-4 h-4" />,
      description: 'Download selected files as a ZIP',
      needsParams: false,
      dangerous: false,
    },
    {
      id: 'delete',
      name: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      description: 'Permanently delete selected files',
      needsParams: false,
      dangerous: true,
    },
  ] as const;

  const executeOperation = async (operationType: BulkOperationType) => {
    const operation: BulkOperation = {
      id: `bulk_${Date.now()}`,
      type: operationType,
      status: 'pending',
      progress: {
        total: selectedMedia.length,
        completed: 0,
        failed: 0,
      },
      parameters: operationParams,
    };

    setActiveOperation(operation);

    try {
      operation.status = 'running';

      // Simulate bulk operation execution
      // In a real implementation, this would call the appropriate API endpoints
      const results = await simulateBulkOperation(operation, selectedMedia);

      operation.status = 'completed';
      operation.progress.completed = results.success;
      operation.progress.failed = results.failed;

      onOperationComplete(results);

      // Clear selection after successful operation
      if (results.success > 0) {
        onClearSelection();
      }
    } catch (error) {
      operation.status = 'failed';
      onOperationComplete({
        operation: operationType,
        success: 0,
        failed: selectedMedia.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      // Clear active operation after a delay
      setTimeout(() => setActiveOperation(null), 3000);
    }
  };

  const showConfirmation = (operationType: BulkOperationType) => {
    const operation = operations.find(op => op.id === operationType);
    if (operation?.needsParams) {
      // Show parameter input dialog
      setShowConfirmDialog(operationType);
    } else {
      // Execute immediately for operations without parameters
      executeOperation(operationType);
    }
  };

  const confirmOperation = () => {
    if (showConfirmDialog) {
      executeOperation(showConfirmDialog);
      setShowConfirmDialog(null);
      setOperationParams({});
    }
  };

  const cancelOperation = () => {
    setShowConfirmDialog(null);
    setOperationParams({});
  };

  const getStatusIcon = (status: BulkOperation['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'running':
        return <PlayCircle className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  if (selectedMedia.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
      onClick={handleInteraction}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            {selectedMedia.length} selected
          </span>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-gray-500 hover:text-gray-700"
          title="Clear selection"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Operation Progress */}
      {activeOperation && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {getStatusIcon(activeOperation.status)}
              <span className="ml-2 font-medium">
                {operations.find(op => op.id === activeOperation.type)?.name}
              </span>
            </div>
            <span className="text-sm text-blue-700">
              {activeOperation.progress.completed} / {activeOperation.progress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(activeOperation.progress.completed / activeOperation.progress.total) * 100}%`,
              }}
            />
          </div>
          {activeOperation.progress.failed > 0 && (
            <div className="mt-1 text-sm text-red-600">
              {activeOperation.progress.failed} failed
            </div>
          )}
        </div>
      )}

      {/* Operations Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {operations.map(operation => (
          <button
            type="button"
            key={operation.id}
            onClick={() => showConfirmation(operation.id as BulkOperationType)}
            disabled={activeOperation?.status === 'running'}
            className={`p-3 rounded-lg border text-left transition-colors ${
              operation.dangerous
                ? 'border-red-200 hover:border-red-300 hover:bg-red-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center mb-2">
              {operation.icon}
              <span className="ml-2 font-medium text-sm">{operation.name}</span>
            </div>
            <p className="text-xs text-gray-500">{operation.description}</p>
          </button>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {operations.find(op => op.id === showConfirmDialog)?.name}
              </h3>

              {/* Parameter inputs based on operation type */}
              {showConfirmDialog === 'add-tags' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags to add (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={operationParams.tags || ''}
                    onChange={e => setOperationParams({ tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}

              {showConfirmDialog === 'remove-tags' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags to remove (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={operationParams.tags || ''}
                    onChange={e => setOperationParams({ tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}

              {showConfirmDialog === 'move-folder' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination folder
                  </label>
                  <input
                    type="text"
                    value={operationParams.folder || ''}
                    onChange={e => setOperationParams({ folder: e.target.value })}
                    placeholder=".gitcms/media/new-folder"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}

              <p className="text-sm text-gray-600 mb-6">
                This operation will affect {selectedMedia.length} file
                {selectedMedia.length !== 1 ? 's' : ''}.
                {operations.find(op => op.id === showConfirmDialog)?.dangerous && (
                  <span className="text-red-600 font-medium"> This action cannot be undone.</span>
                )}
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelOperation}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmOperation}
                  className={`px-4 py-2 text-white rounded-md ${
                    operations.find(op => op.id === showConfirmDialog)?.dangerous
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock bulk operation simulation
async function simulateBulkOperation(
  operation: BulkOperation,
  media: GitCMSMediaFile[]
): Promise<BulkOperationResult> {
  const results: BulkOperationResult = {
    operation: operation.type,
    success: 0,
    failed: 0,
    errors: [],
  };

  // Simulate processing each file
  for (let i = 0; i < media.length; i++) {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate some failures (10% failure rate)
    if (Math.random() < 0.9) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push(`Failed to process ${media[i].filename}`);
    }

    operation.progress.completed = results.success;
    operation.progress.failed = results.failed;
  }

  return results;
}

// Memoize the component to prevent unnecessary re-renders
export default memo(BulkOperations);
