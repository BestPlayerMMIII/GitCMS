'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Plus,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Info,
  Download,
  Upload,
  FileText,
  Settings,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  type LFSStatus,
  type LFSRule,
  type LFSFileAnalysis,
  COMMON_LFS_RULES,
  LFSUtils,
  formatFileSize,
} from '@git-cms/core';
import { fetchData } from '@/lib/api-router';

interface LFSManagementProps {
  owner: string;
  repo: string;
  className?: string;
}

interface LFSStats {
  totalRules: number;
  trackedExtensions: string[];
  estimatedSavings: number;
  recentFiles: string[];
}

/**
 * Git LFS Management Component
 * Provides comprehensive LFS configuration and monitoring
 */
export function LFSManagement({ owner, repo, className = '' }: LFSManagementProps) {
  const [lfsStatus, setLfsStatus] = useState<LFSStatus | null>(null);
  const [lfsStats, setLfsStats] = useState<LFSStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [newPattern, setNewPattern] = useState('');
  const [showAddRule, setShowAddRule] = useState(false);
  const [selectedRule, setSelectedRule] = useState<LFSRule | null>(null);
  const [suggestedFiles, setSuggestedFiles] = useState<LFSFileAnalysis[]>([]);

  // Load LFS status
  const loadLFSStatus = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch LFS status from API
      const response = await fetchData(`/api/lfs/status?owner=${owner}&repo=${repo}`);

      if (response.ok) {
        const data = await response.json();
        console.log('LFS Status API Response:', data); // Debug logging

        setLfsStatus(data.status);
        setLfsStats(data.stats);

        // Filter out invalid suggested files
        const validSuggestedFiles = (data.suggestedFiles || [])
          .filter((file: any) => {
            // Only include files with valid path and size data
            return (
              file?.path &&
              typeof file.path === 'string' &&
              file.path.trim() !== '' &&
              typeof file?.size === 'number' &&
              file.size > 0
            );
          })
          .map((file: any) => ({
            path: file.path,
            size: file.size,
            extension: file?.extension || file.path.split('.').pop() || 'unknown',
            shouldTrack: file?.shouldTrack || false,
            reason: file?.reason || 'Large file detected',
          }));

        console.log('Valid suggested files:', validSuggestedFiles); // Debug logging
        setSuggestedFiles(validSuggestedFiles);
      } else {
        console.error('Failed to load LFS status', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading LFS status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo]);

  // Initialize LFS
  const initializeLFS = useCallback(async () => {
    try {
      setIsInitializing(true);

      const response = await fetchData('/api/lfs/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo }),
      });

      if (response.ok) {
        await loadLFSStatus(); // Reload status
      } else {
        const error = await response.json();
        console.error('Failed to initialize LFS:', error);
      }
    } catch (error) {
      console.error('Error initializing LFS:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [owner, repo, loadLFSStatus]);

  // Add LFS pattern
  const addLFSPattern = useCallback(
    async (pattern: string, description?: string) => {
      try {
        const response = await fetchData('/api/lfs/patterns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner, repo, pattern, description }),
        });

        if (response.ok) {
          setNewPattern('');
          setShowAddRule(false);
          await loadLFSStatus(); // Reload status
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to add LFS pattern:', errorData);
          alert(
            `Failed to add LFS pattern: ${errorData.error || errorData.message || 'Unknown error'}`
          );
        }
      } catch (error) {
        console.error('Error adding LFS pattern:', error);
      }
    },
    [owner, repo, loadLFSStatus]
  );

  // Remove LFS pattern
  const removeLFSPattern = useCallback(
    async (pattern: string) => {
      try {
        const response = await fetchData('/api/lfs/patterns', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner, repo, pattern }),
        });

        if (response.ok) {
          await loadLFSStatus(); // Reload status
        } else {
          const error = await response.json();
          console.error('Failed to remove LFS pattern:', error);
        }
      } catch (error) {
        console.error('Error removing LFS pattern:', error);
      }
    },
    [owner, repo, loadLFSStatus]
  );

  // Load data on mount
  useEffect(() => {
    loadLFSStatus();
  }, [loadLFSStatus]);

  // Get file extension from pattern
  const getExtensionFromPattern = (pattern: string): string => {
    return pattern.replace('*.', '');
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading LFS status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HardDrive className="w-5 h-5 text-gray-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Git Large File Storage</h3>
              <p className="text-sm text-gray-600">
                Manage large file tracking for {owner}/{repo}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={loadLFSStatus}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md border border-gray-300 hover:border-gray-400"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {!lfsStatus?.isEnabled && (
              <button
                type="button"
                onClick={initializeLFS}
                disabled={isInitializing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isInitializing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>{isInitializing ? 'Initializing...' : 'Enable LFS'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${lfsStatus?.isEnabled ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-sm font-medium text-gray-900">
                {lfsStatus?.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">LFS Status</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-lg font-semibold text-gray-900">
              {lfsStatus?.rules.length || 0}
            </div>
            <p className="text-xs text-gray-600">Tracking Rules</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-lg font-semibold text-gray-900">{suggestedFiles.length}</div>
            <p className="text-xs text-gray-600">Suggested Files</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-lg font-semibold text-gray-900">
              {lfsStatus?.trackedSize ? formatFileSize(lfsStatus.trackedSize) : '0 B'}
            </div>
            <p className="text-xs text-gray-600">Tracked Size</p>
          </div>
        </div>

        {/* LFS Not Enabled */}
        {!lfsStatus?.isEnabled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">Git LFS Not Enabled</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Git Large File Storage helps you manage large files efficiently. It's recommended
                  for repositories with media files, archives, or documents larger than 50MB.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={initializeLFS}
                    disabled={isInitializing}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isInitializing ? 'Enabling...' : 'Enable Git LFS'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Files */}
        {suggestedFiles.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-amber-800">Files Recommended for LFS</h4>
                <p className="text-sm text-amber-700 mt-1">
                  The following files are large and should be tracked by Git LFS:
                </p>
                <div className="mt-3 space-y-2">
                  {suggestedFiles.slice(0, 5).map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-amber-700">{file.path}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-amber-600">{formatFileSize(file.size)}</span>
                        <button
                          type="button"
                          onClick={() =>
                            addLFSPattern(
                              LFSUtils.generatePattern(file.extension),
                              `${file.extension.toUpperCase()} files`
                            )
                          }
                          className="text-amber-600 hover:text-amber-800"
                        >
                          Track *.{file.extension}
                        </button>
                      </div>
                    </div>
                  ))}
                  {suggestedFiles.length > 5 && (
                    <p className="text-xs text-amber-600">
                      ... and {suggestedFiles.length - 5} more files
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Suggested Files Message */}
        {suggestedFiles.length === 0 && lfsStatus?.isEnabled && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">All Clear!</h4>
                <p className="text-sm text-green-700 mt-1">
                  No large files detected that need LFS tracking. Your repository is optimized!
                </p>
                <p className="text-xs text-green-600 mt-2">
                  Git LFS is recommended for files larger than 100MB or binary files like images,
                  videos, and documents.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Rules */}
        {lfsStatus?.isEnabled && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">LFS Tracking Rules</h4>
              <button
                type="button"
                onClick={() => setShowAddRule(true)}
                className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
              >
                <Plus className="w-4 h-4" />
                <span>Add Rule</span>
              </button>
            </div>

            {/* Add Rule Form */}
            {showAddRule && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">File Pattern</label>
                    <input
                      type="text"
                      value={newPattern}
                      onChange={e => setNewPattern(e.target.value)}
                      placeholder="e.g., *.zip, *.psd, large-files/*"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use patterns like *.ext for file extensions or paths for directories
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => addLFSPattern(newPattern)}
                      disabled={!newPattern.trim() || !LFSUtils.isValidPattern(newPattern)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add Rule
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddRule(false);
                        setNewPattern('');
                      }}
                      className="px-4 py-2 text-gray-600 text-sm rounded-md hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rules List */}
            {lfsStatus.rules.length > 0 ? (
              <div className="space-y-2">
                {lfsStatus.rules.map((rule, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      <code className="text-sm font-mono bg-gray-200 px-2 py-1 rounded">
                        {rule.pattern}
                      </code>
                      <span className="text-sm text-gray-600">{rule.description}</span>
                      {rule.autoGenerated && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Auto
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRule(rule)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLFSPattern(rule.pattern)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <HardDrive className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No LFS rules configured</p>
                <p className="text-xs">Add patterns to start tracking large files</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Setup */}
        {lfsStatus?.isEnabled && lfsStatus.rules.length === 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Setup</h4>
            <p className="text-sm text-gray-600 mb-3">
              Add common file patterns for media and large files:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {COMMON_LFS_RULES.slice(0, 8).map((rule, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => addLFSPattern(rule.pattern, rule.description)}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-left"
                >
                  <code className="text-xs">{rule.pattern}</code>
                  <div className="text-xs text-gray-500">{rule.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rule Details Modal */}
        {selectedRule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Rule Details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedRule(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Pattern</label>
                  <code className="block text-sm bg-gray-100 p-2 rounded mt-1">
                    {selectedRule.pattern}
                  </code>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-600 mt-1">{selectedRule.description}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Git Attributes</label>
                  <code className="block text-sm bg-gray-100 p-2 rounded mt-1">
                    {selectedRule.attributes}
                  </code>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Source</label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedRule.autoGenerated ? 'Auto-generated' : 'Manual'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedRule(null)}
                  className="px-4 py-2 text-gray-600 text-sm rounded-md hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeLFSPattern(selectedRule.pattern);
                    setSelectedRule(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                >
                  Remove Rule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
