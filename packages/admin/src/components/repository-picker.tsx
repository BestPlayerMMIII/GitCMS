'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Search, GitBranch, Calendar, Lock, Unlock, Star, Eye } from 'lucide-react';

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
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => {
    fetchRepositories();
  }, [session]);

  const fetchRepositories = async () => {
    if (!session?.accessToken) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/github/repositories');

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const repos = await response.json();
      setRepositories(repos);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  const filteredRepositories = repositories.filter(repo => {
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
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchRepositories}
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
        <h2 className="text-2xl font-bold text-gray-900">Select Repository</h2>
        <p className="text-gray-600 mt-1">Choose a GitHub repository to connect with GitCMS</p>
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
    </div>
  );
}
