'use client';

import { useState } from 'react';
import type { GitCMSSchema } from '@git-cms/core';
import { useEnhancedSchemaImport } from '../../lib/api-hooks';
import { LoadingSpinner, PageLoading } from '../ui/loading';
import { fetchData } from '@/lib/api-router';

interface SchemaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (schemas: GitCMSSchema[], repoUrl: string) => void;
}

interface ImportState {
  step: 'url' | 'loading' | 'preview' | 'importing' | 'success' | 'error';
  repoUrl: string;
  schemas: GitCMSSchema[];
  selectedSchemas: Set<string>;
  error: string | null;
  includePrivate: boolean;
  repositoryInfo?: {
    owner: string;
    repo: string;
    branch: string;
    fullName: string;
    private: boolean;
  };
  warnings?: string[];
}

export function SchemaImportModal({ isOpen, onClose, onImport }: SchemaImportModalProps) {
  const [state, setState] = useState<ImportState>({
    step: 'url',
    repoUrl: '',
    schemas: [],
    selectedSchemas: new Set(),
    error: null,
    includePrivate: true,
  });

  const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    try {
      // Handle different GitHub URL formats
      const patterns = [
        /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
        /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
        /^([^\/]+)\/([^\/]+)$/, // Simple owner/repo format
      ];

      for (const pattern of patterns) {
        const match = url.trim().match(pattern);
        if (match) {
          return { owner: match[1], repo: match[2] };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // Parse repository info from URL
  const repoInfo = state.repoUrl ? parseGitHubUrl(state.repoUrl) : null;

  // Use enhanced import hook for fetching schemas from both public and private repos
  const {
    data: importData,
    loading: fetchingSchemas,
    error: fetchError,
    invalidate: refetchSchemas,
  } = useEnhancedSchemaImport(repoInfo?.owner || null, repoInfo?.repo || null, {
    enabled: false, // We'll trigger this manually
    includePrivate: state.includePrivate,
  });

  const fetchSchemas = async () => {
    const repoInfo = parseGitHubUrl(state.repoUrl);
    if (!repoInfo) {
      setState(prev => ({
        ...prev,
        step: 'error',
        error:
          'Invalid GitHub repository URL. Please use formats like:\n• https://github.com/owner/repo\n• owner/repo',
      }));
      return;
    }

    setState(prev => ({ ...prev, step: 'loading', error: null }));

    try {
      const params = new URLSearchParams({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        includePrivate: state.includePrivate.toString(),
      });

      const response = await fetchData(`/api/schemas/import?${params}`);

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific error cases
        if (errorData.requiresAuth) {
          setState(prev => ({
            ...prev,
            step: 'error',
            error:
              'This repository is private. Please make sure you are authenticated and have access to this repository.',
          }));
          return;
        }

        throw new Error(errorData.error || `Failed to fetch schemas: ${response.statusText}`);
      }

      const data = await response.json();
      const schemas = data.schemas || [];

      if (schemas.length === 0) {
        const message =
          data.message ||
          "No schemas found in this repository. Make sure it's a GitCMS-configured repository with schemas in the .gitcms/schemas/ directory.";
        setState(prev => ({
          ...prev,
          step: 'error',
          error: message,
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        step: 'preview',
        schemas,
        selectedSchemas: new Set(schemas.map((s: GitCMSSchema) => s.id)),
        repositoryInfo: data.repository,
        warnings: data.warnings,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch schemas',
      }));
    }
  };

  const handleImport = async () => {
    const selectedSchemasList = state.schemas.filter(schema =>
      state.selectedSchemas.has(schema.id)
    );

    if (selectedSchemasList.length === 0) {
      setState(prev => ({ ...prev, error: 'Please select at least one schema to import.' }));
      return;
    }

    setState(prev => ({ ...prev, step: 'importing', error: null }));

    try {
      await onImport(selectedSchemasList, state.repoUrl);
      setState(prev => ({ ...prev, step: 'success' }));

      // Auto-close after success
      setTimeout(() => {
        onClose();
        resetState();
      }, 2000);
    } catch (error) {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: error instanceof Error ? error.message : 'Failed to import schemas',
      }));
    }
  };

  const resetState = () => {
    setState({
      step: 'url',
      repoUrl: '',
      schemas: [],
      selectedSchemas: new Set(),
      error: null,
      includePrivate: true,
    });
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  const toggleSchema = (schemaId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedSchemas);
      if (newSelected.has(schemaId)) {
        newSelected.delete(schemaId);
      } else {
        newSelected.add(schemaId);
      }
      return { ...prev, selectedSchemas: newSelected };
    });
  };

  const toggleSelectAll = () => {
    setState(prev => {
      const allSelected = prev.selectedSchemas.size === prev.schemas.length;
      return {
        ...prev,
        selectedSchemas: allSelected ? new Set() : new Set(prev.schemas.map(s => s.id)),
      };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Import Schemas from Repository
                </h3>

                {state.step === 'url' && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-4">
                      Enter the URL of a public GitHub repository that uses GitCMS to import its
                      schemas.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="repo-url"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Repository URL
                        </label>
                        <input
                          type="text"
                          id="repo-url"
                          value={state.repoUrl}
                          onChange={e => setState(prev => ({ ...prev, repoUrl: e.target.value }))}
                          placeholder="https://github.com/username/repository"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={state.includePrivate}
                            onChange={e =>
                              setState(prev => ({ ...prev, includePrivate: e.target.checked }))
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Include private repositories
                          </span>
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          When enabled, you can import schemas from private repositories you have
                          access to. You must be authenticated with GitHub for this to work.
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p className="font-medium">Supported formats:</p>
                        <ul className="mt-1 space-y-1">
                          <li>• https://github.com/owner/repo</li>
                          <li>• owner/repo</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {state.step === 'loading' && (
                  <div className="mt-4 text-center">
                    <LoadingSpinner />
                    <p className="mt-2 text-sm text-gray-500">
                      Fetching schemas from repository...
                    </p>
                  </div>
                )}

                {state.step === 'preview' && (
                  <div className="mt-4">
                    {/* Repository Information */}
                    {state.repositoryInfo && (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            Repository Information
                          </h4>
                          {state.repositoryInfo.private && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Private
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>
                            <strong>Full Name:</strong> {state.repositoryInfo.fullName}
                          </p>
                          <p>
                            <strong>Branch:</strong> {state.repositoryInfo.branch}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {state.warnings && state.warnings.length > 0 && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {state.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-sm text-gray-500 mb-4">
                      Found {state.schemas.length} schema{state.schemas.length !== 1 ? 's' : ''} in
                      the repository. Select which ones to import:
                    </p>

                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                      <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={
                              state.selectedSchemas.size === state.schemas.length &&
                              state.schemas.length > 0
                            }
                            onChange={toggleSelectAll}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 font-medium">
                            Select all ({state.selectedSchemas.size}/{state.schemas.length})
                          </span>
                        </label>
                      </div>

                      <div className="divide-y divide-gray-200">
                        {state.schemas.map(schema => (
                          <div key={schema.id} className="px-3 py-3">
                            <label className="flex items-start">
                              <input
                                type="checkbox"
                                checked={state.selectedSchemas.has(schema.id)}
                                onChange={() => toggleSchema(schema.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                              />
                              <div className="ml-3 min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {schema.metadata?.name || schema.id}
                                </div>
                                {schema.metadata?.description && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    {schema.metadata.description}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1">
                                  ID: {schema.id} • {Object.keys(schema.fields || {}).length} fields
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {state.step === 'importing' && <PageLoading message="Importing schemas..." />}

                {state.step === 'success' && (
                  <div className="mt-4 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                      <svg
                        className="h-6 w-6 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Successfully imported {state.selectedSchemas.size} schema
                      {state.selectedSchemas.size !== 1 ? 's' : ''}!
                    </p>
                  </div>
                )}

                {state.step === 'error' && (
                  <div className="mt-4">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Import Failed</h3>
                          <div className="mt-2 text-sm text-red-700">
                            <pre className="whitespace-pre-wrap">{state.error}</pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {state.step === 'url' && (
              <>
                <button
                  type="button"
                  onClick={fetchSchemas}
                  disabled={!state.repoUrl.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Fetch Schemas
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </>
            )}

            {state.step === 'preview' && (
              <>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={state.selectedSchemas.size === 0}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Import Selected ({state.selectedSchemas.size})
                </button>
                <button
                  type="button"
                  onClick={() => setState(prev => ({ ...prev, step: 'url' }))}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Back
                </button>
              </>
            )}

            {state.step === 'error' && (
              <>
                <button
                  type="button"
                  onClick={() => setState(prev => ({ ...prev, step: 'url', error: null }))}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </>
            )}

            {(state.step === 'loading' || state.step === 'importing') && (
              <button
                type="button"
                onClick={handleClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
