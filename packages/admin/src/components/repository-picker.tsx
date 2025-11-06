'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Search, GitBranch, Calendar, Lock, Unlock, Star, Eye, Plus } from 'lucide-react';
import { useGitHubRepositories } from '../lib/api-hooks';
import { LoadingSpinner } from './ui/loading';

interface Repository {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  description?: string;
  language?: string;
  stargazers_count?: number;
  watchers_count?: number;
  updated_at?: string;
}

interface RepositoryPickerProps {
  onSelectRepository: (repo: Repository) => void;
  selectedRepository?: Repository | null;
  inSelectedRepository?: React.ReactNode;
}

export function RepositoryPicker({
  onSelectRepository,
  selectedRepository,
  inSelectedRepository,
}: RepositoryPickerProps) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Use cached hook for repositories
  const {
    data: repositories = [],
    loading,
    error,
    refresh: refreshRepositories,
  } = useGitHubRepositories({
    enabled: !!session?.accessToken,
  });

  const filteredRepositories = (repositories || []).filter(repo => {
    const matchesSearch =
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'private' && repo.private) ||
      (filter === 'public' && !repo.private);

    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const handleCreateRepository = async () => {
    if (!newRepoName.trim()) {
      setCreateError('Repository name is required');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `token ${session?.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newRepoName,
          description: newRepoDescription || undefined,
          private: newRepoPrivate,
          auto_init: true, // Initialize with README
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create repository');
      }

      const newRepo = await response.json();

      // Refresh the repository list
      await refreshRepositories();

      // Select the newly created repository
      const repoToSelect: Repository = {
        owner: newRepo.owner.login,
        name: newRepo.name,
        fullName: newRepo.full_name,
        private: newRepo.private,
        defaultBranch: newRepo.default_branch || 'main',
        description: newRepo.description,
        language: newRepo.language,
        stargazers_count: newRepo.stargazers_count,
        watchers_count: newRepo.watchers_count,
        updated_at: newRepo.updated_at,
      };

      onSelectRepository(repoToSelect);

      // Close modal and reset form
      setShowCreateModal(false);
      setNewRepoName('');
      setNewRepoDescription('');
      setNewRepoPrivate(false);
    } catch (error: any) {
      console.error('Failed to create repository:', error);
      setCreateError(error.message || 'Failed to create repository');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="text-red-500">⚠️</div>
          <div>
            <h3 className="font-medium text-red-800">Error loading repositories</h3>
            <p className="text-red-600 text-sm">{error?.message || String(error)}</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-red-700 hover:text-red-900 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Select Repository</h2>
            <p className="text-gray-600 mt-1">Choose a GitHub repository to connect with GitCMS</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex space-x-2">
          {(['all', 'public', 'private'] as const).map(filterType => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterType}
            </button>
          ))}
        </div>
      </div>

      {/* Repository List */}
      <div className="space-y-3">
        {filteredRepositories.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No repositories found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'Try adjusting your search terms.'
                : "You don't have any repositories yet."}
            </p>
          </div>
        ) : (
          filteredRepositories.map(repo => (
            <div
              key={repo.fullName}
              onClick={() => onSelectRepository(repo)}
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedRepository?.fullName === repo.fullName
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{repo.name}</h3>
                    <div className="flex items-center space-x-1">
                      {repo.private ? (
                        <Lock className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Unlock className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {repo.private ? 'Private' : 'Public'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{repo.fullName}</p>
                  {repo.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{repo.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    {repo.language && (
                      <span className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span>{repo.language}</span>
                      </span>
                    )}
                    {repo.stargazers_count !== undefined && (
                      <span className="flex items-center space-x-1">
                        <Star className="h-3 w-3" />
                        <span>{repo.stargazers_count}</span>
                      </span>
                    )}
                    {repo.watchers_count !== undefined && (
                      <span className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{repo.watchers_count}</span>
                      </span>
                    )}
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Updated {formatDate(repo.updated_at)}</span>
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <GitBranch className="h-3 w-3" />
                    <span>{repo.defaultBranch}</span>
                  </div>
                </div>
              </div>

              {selectedRepository?.fullName === repo.fullName && inSelectedRepository}
            </div>
          ))
        )}
      </div>

      {/* Create Repository Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => !creating && setShowCreateModal(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Create New Repository
                    </h3>

                    {createError && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-800">{createError}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repository Name *
                        </label>
                        <input
                          type="text"
                          value={newRepoName}
                          onChange={e => setNewRepoName(e.target.value)}
                          disabled={creating}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                          placeholder="my-awesome-repo"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Use lowercase letters, numbers, and hyphens
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (optional)
                        </label>
                        <textarea
                          value={newRepoDescription}
                          onChange={e => setNewRepoDescription(e.target.value)}
                          disabled={creating}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                          placeholder="A brief description of your repository"
                        />
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newRepoPrivate}
                            onChange={e => setNewRepoPrivate(e.target.checked)}
                            disabled={creating}
                            className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Make this repository private
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleCreateRepository}
                  disabled={creating || !newRepoName.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Creating...</span>
                    </>
                  ) : (
                    'Create Repository'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
