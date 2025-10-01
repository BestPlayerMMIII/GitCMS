'use client';

import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { type GitCMSMediaFile, type MediaType } from '@git-cms/core';
import {
  Search,
  Filter,
  Tag,
  FolderOpen,
  Calendar,
  FileType,
  Sliders,
  X,
  Plus,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
} from 'lucide-react';

// Local type definitions until core package is built
interface MediaSearchOptions {
  query?: string;
  mediaTypes?: MediaType[];
  tags?: string[];
  folders?: string[];
  dateRange?: { from?: Date; to?: Date };
  sizeRange?: { min?: number; max?: number };
  sortBy?: 'name' | 'date' | 'size' | 'type';
  sortDirection?: 'asc' | 'desc';
  showHidden?: boolean;
  limit?: number;
  offset?: number;
}

interface MediaSearchResult {
  media: GitCMSMediaFile[];
  total: number;
  facets: {
    mediaTypes: Record<MediaType, number>;
    tags: Record<string, number>;
    folders: Record<string, number>;
  };
}

interface MediaLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface MediaCollection {
  id: string;
  name: string;
  description?: string;
  mediaIds: string[];
}

// Simple search engine implementation
class SimpleMediaSearchEngine {
  searchMedia(media: GitCMSMediaFile[], options: MediaSearchOptions): MediaSearchResult {
    let filtered = [...media];

    // Apply hidden files filter by default (exclude files/folders starting with .)
    if (!options.showHidden) {
      filtered = filtered.filter(item => {
        const filename = item.filename;
        const pathParts = item.path.split('/');
        // Filter out files that start with . or are in folders that start with .
        return !filename.startsWith('.') && !pathParts.some(part => part.startsWith('.'));
      });
    }

    // Apply text search
    if (options.query) {
      const query = options.query.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.filename.toLowerCase().includes(query) || item.path.toLowerCase().includes(query)
      );
    }

    // Apply media type filter
    if (options.mediaTypes?.length) {
      filtered = filtered.filter(item => options.mediaTypes!.includes(item.mediaType));
    }

    // Apply folder filter
    if (options.folders?.length) {
      filtered = filtered.filter(item =>
        options.folders!.some(folder => item.path.startsWith(folder))
      );
    }

    // Apply size filter
    if (options.sizeRange) {
      filtered = filtered.filter(item => {
        const size = item.size;
        return (
          (!options.sizeRange!.min || size >= options.sizeRange!.min) &&
          (!options.sizeRange!.max || size <= options.sizeRange!.max)
        );
      });
    }

    // Apply date filter
    if (options.dateRange) {
      filtered = filtered.filter(item => {
        const date = new Date(item.uploadedAt);
        return (
          (!options.dateRange!.from || date >= options.dateRange!.from) &&
          (!options.dateRange!.to || date <= options.dateRange!.to)
        );
      });
    }

    // Generate facets before sorting and pagination
    const facets = this.generateFacets(filtered);

    // Apply sorting
    filtered = this.sortMedia(filtered, options.sortBy, options.sortDirection);

    // Apply pagination
    const total = filtered.length;
    let paginatedResults = filtered;
    if (options.offset) {
      paginatedResults = paginatedResults.slice(options.offset);
    }
    if (options.limit) {
      paginatedResults = paginatedResults.slice(0, options.limit);
    }

    return { media: paginatedResults, total, facets };
  }

  private generateFacets(media: GitCMSMediaFile[]) {
    const facets = {
      mediaTypes: {} as Record<MediaType, number>,
      tags: {} as Record<string, number>,
      folders: {} as Record<string, number>,
    };

    media.forEach(item => {
      // Media types
      facets.mediaTypes[item.mediaType] = (facets.mediaTypes[item.mediaType] || 0) + 1;

      // Folders
      const folder = item.path.substring(0, item.path.lastIndexOf('/')) || '/';
      facets.folders[folder] = (facets.folders[folder] || 0) + 1;
    });

    return facets;
  }

  private sortMedia(
    media: GitCMSMediaFile[],
    sortBy: MediaSearchOptions['sortBy'] = 'name',
    direction: MediaSearchOptions['sortDirection'] = 'asc'
  ): GitCMSMediaFile[] {
    const multiplier = direction === 'asc' ? 1 : -1;

    // Create a new array to avoid mutating the original
    return [...media].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename) * multiplier;
        case 'date':
          return (new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()) * multiplier;
        case 'size':
          return (a.size - b.size) * multiplier;
        case 'type':
          return a.mediaType.localeCompare(b.mediaType) * multiplier;
        default:
          return 0;
      }
    });
  }
}

interface AdvancedMediaSearchProps {
  media: GitCMSMediaFile[];
  onSearchResults: (
    results: MediaSearchResult & { hasActiveSearch: boolean; showHidden?: boolean }
  ) => void;
  availableLabels?: MediaLabel[];
  availableCollections?: MediaCollection[];
  className?: string;
}

function AdvancedMediaSearch({
  media,
  onSearchResults,
  availableLabels = [],
  availableCollections = [],
  className = '',
}: AdvancedMediaSearchProps) {
  const [searchOptions, setSearchOptions] = useState<MediaSearchOptions>({
    query: '',
    sortBy: 'name',
    sortDirection: 'asc',
    showHidden: false,
    limit: 50,
    offset: 0,
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchEngine] = useState(() => new SimpleMediaSearchEngine());
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [debouncedSearchOptions, setDebouncedSearchOptions] = useState(searchOptions);

  // Debounce search options to prevent excessive searches
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchOptions(searchOptions);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchOptions]);

  // Memoize expensive tag and folder extractions
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    media.forEach(item => {
      // Skip hidden files if showHidden is false
      if (!searchOptions.showHidden) {
        const filename = item.filename;
        const pathParts = item.path.split('/');
        if (filename.startsWith('.') || pathParts.some(part => part.startsWith('.'))) {
          return; // Skip this file
        }
      }

      const itemMetadata = item.metadata as any;
      if (itemMetadata?.autoTags) {
        itemMetadata.autoTags.forEach((tag: string) => tags.add(tag));
      }
      if (itemMetadata?.manualTags) {
        itemMetadata.manualTags.forEach((tag: string) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [media, searchOptions.showHidden]);

  const availableFolders = useMemo(() => {
    const folders = new Set<string>();
    media.forEach(item => {
      // Skip hidden files if showHidden is false
      if (!searchOptions.showHidden) {
        const filename = item.filename;
        const pathParts = item.path.split('/');
        if (filename.startsWith('.') || pathParts.some(part => part.startsWith('.'))) {
          return; // Skip this file
        }
      }

      const folder = item.path.substring(0, item.path.lastIndexOf('/')) || '/';
      folders.add(folder);
    });
    return Array.from(folders).sort();
  }, [media, searchOptions.showHidden]);

  const updateActiveFilters = useCallback(() => {
    const filters: string[] = [];

    if (searchOptions.query) filters.push(`Search: "${searchOptions.query}"`);
    if (searchOptions.mediaTypes?.length) {
      filters.push(`Types: ${searchOptions.mediaTypes.join(', ')}`);
    }
    if (searchOptions.tags?.length) {
      filters.push(`Tags: ${searchOptions.tags.join(', ')}`);
    }
    if (searchOptions.folders?.length) {
      filters.push(`Folders: ${searchOptions.folders.join(', ')}`);
    }
    if (searchOptions.sizeRange) {
      const { min, max } = searchOptions.sizeRange;
      if (min || max) {
        filters.push(
          `Size: ${min ? `>${formatFileSize(min)}` : ''}${min && max ? ' & ' : ''}${max ? `<${formatFileSize(max)}` : ''}`
        );
      }
    }
    if (searchOptions.dateRange) {
      filters.push(`Date: ${formatDateRange(searchOptions.dateRange)}`);
    }
    if (searchOptions.showHidden) {
      filters.push(`Including hidden files`);
    }
    // Show sorting when it's not the default
    if (searchOptions.sortBy !== 'name' || searchOptions.sortDirection !== 'asc') {
      const sortLabel =
        searchOptions.sortBy === 'name'
          ? 'Name'
          : searchOptions.sortBy === 'date'
            ? 'Date'
            : searchOptions.sortBy === 'size'
              ? 'Size'
              : 'Type';
      const directionLabel = searchOptions.sortDirection === 'asc' ? '↑' : '↓';
      filters.push(`Sort: ${sortLabel} ${directionLabel}`);
    }

    setActiveFilters(filters);
  }, [searchOptions]);

  // Helper function to determine if there's an active search
  const hasActiveSearch = useCallback((options: MediaSearchOptions) => {
    return !!(
      options.query ||
      (options.mediaTypes && options.mediaTypes.length > 0) ||
      (options.tags && options.tags.length > 0) ||
      (options.folders && options.folders.length > 0) ||
      options.sizeRange?.min ||
      options.sizeRange?.max ||
      options.dateRange?.from ||
      options.dateRange?.to ||
      options.showHidden || // Show hidden files is considered an active search
      options.sortBy !== 'name' || // Non-default sorting is considered active
      options.sortDirection !== 'asc' // Non-default sort direction is considered active
    );
  }, []);

  // Perform search whenever debounced options change
  useEffect(() => {
    const results = searchEngine.searchMedia(media, debouncedSearchOptions);
    const isActiveSearch = hasActiveSearch(debouncedSearchOptions);
    onSearchResults({
      ...results,
      hasActiveSearch: isActiveSearch,
      showHidden: debouncedSearchOptions.showHidden,
    });
    updateActiveFilters();
  }, [media, debouncedSearchOptions, updateActiveFilters, hasActiveSearch, onSearchResults]);

  const updateSearchOptions = useCallback((updates: Partial<MediaSearchOptions>) => {
    setSearchOptions((prev: MediaSearchOptions) => ({ ...prev, ...updates, offset: 0 }));
  }, []);

  const addTag = useCallback(
    (tag: string) => {
      const currentTags = searchOptions.tags || [];
      if (!currentTags.includes(tag)) {
        updateSearchOptions({ tags: [...currentTags, tag] });
      }
    },
    [searchOptions.tags, updateSearchOptions]
  );

  // Prevent event propagation to parent forms/containers
  const handleInteraction = useCallback((e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
  }, []);

  const removeTag = (tag: string) => {
    const currentTags = searchOptions.tags || [];
    updateSearchOptions({ tags: currentTags.filter((t: string) => t !== tag) });
  };

  const addMediaType = (type: MediaType) => {
    const currentTypes = searchOptions.mediaTypes || [];
    if (!currentTypes.includes(type)) {
      updateSearchOptions({ mediaTypes: [...currentTypes, type] });
    }
  };

  const removeMediaType = (type: MediaType) => {
    const currentTypes = searchOptions.mediaTypes || [];
    updateSearchOptions({ mediaTypes: currentTypes.filter((t: MediaType) => t !== type) });
  };

  const clearFilters = () => {
    setSearchOptions({
      query: '',
      sortBy: 'name',
      sortDirection: 'asc',
      showHidden: false,
      limit: 50,
      offset: 0,
    });
  };

  const extractAvailableTags = () => {
    const tags = new Set<string>();
    media.forEach(item => {
      const itemMetadata = item.metadata as any;
      if (itemMetadata?.autoTags) {
        itemMetadata.autoTags.forEach((tag: string) => tags.add(tag));
      }
      if (itemMetadata?.manualTags) {
        itemMetadata.manualTags.forEach((tag: string) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  };

  const extractAvailableFolders = () => {
    const folders = new Set<string>();
    media.forEach(item => {
      const folder = item.path.substring(0, item.path.lastIndexOf('/')) || '/';
      folders.add(folder);
    });
    return Array.from(folders).sort();
  };

  const mediaTypes: MediaType[] = ['image', 'video', 'audio', 'document'];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchOptions.query || ''}
              onChange={e => {
                handleInteraction(e);
                updateSearchOptions({ query: e.target.value });
              }}
              onClick={handleInteraction}
              placeholder="Search media files..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <select
              value={searchOptions.sortBy}
              onChange={e => {
                handleInteraction(e);
                updateSearchOptions({ sortBy: e.target.value as any });
              }}
              onClick={handleInteraction}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="name">Name</option>
              <option value="date">Date</option>
              <option value="size">Size</option>
              <option value="type">Type</option>
            </select>

            <button
              type="button"
              onClick={e => {
                handleInteraction(e);
                updateSearchOptions({
                  sortDirection: searchOptions.sortDirection === 'asc' ? 'desc' : 'asc',
                });
              }}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {searchOptions.sortDirection === 'asc' ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            type="button"
            onClick={e => {
              handleInteraction(e);
              setShowAdvancedFilters(!showAdvancedFilters);
            }}
            className={`px-4 py-2 rounded-md flex items-center text-sm ${
              showAdvancedFilters
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <Sliders className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            {activeFilters.map((filter, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {filter}
              </span>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <X className="w-3 h-3 mr-1" />
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Media Types Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileType className="w-4 h-4 inline mr-1" />
                Media Types
              </label>
              <div className="space-y-2">
                {mediaTypes.map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchOptions.mediaTypes?.includes(type) || false}
                      onChange={e => {
                        if (e.target.checked) {
                          addMediaType(type);
                        } else {
                          removeMediaType(type);
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Tags
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {availableTags.map(tag => (
                  <label key={tag} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchOptions.tags?.includes(tag) || false}
                      onChange={e => {
                        if (e.target.checked) {
                          addTag(tag);
                        } else {
                          removeTag(tag);
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Folders Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FolderOpen className="w-4 h-4 inline mr-1" />
                Folders
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {availableFolders.map(folder => (
                  <label key={folder} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchOptions.folders?.includes(folder) || false}
                      onChange={e => {
                        const currentFolders = searchOptions.folders || [];
                        if (e.target.checked) {
                          updateSearchOptions({ folders: [...currentFolders, folder] });
                        } else {
                          updateSearchOptions({
                            folders: currentFolders.filter((f: string) => f !== folder),
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm font-mono">{folder}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Size Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Size Range
              </label>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500">Min size (MB)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      searchOptions.sizeRange?.min
                        ? (searchOptions.sizeRange.min / 1024 / 1024).toFixed(1)
                        : ''
                    }
                    onChange={e => {
                      const value = parseFloat(e.target.value);
                      const sizeRange = searchOptions.sizeRange || {};
                      updateSearchOptions({
                        sizeRange: {
                          ...sizeRange,
                          min: isNaN(value) ? undefined : value * 1024 * 1024,
                        },
                      });
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Max size (MB)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      searchOptions.sizeRange?.max
                        ? (searchOptions.sizeRange.max / 1024 / 1024).toFixed(1)
                        : ''
                    }
                    onChange={e => {
                      const value = parseFloat(e.target.value);
                      const sizeRange = searchOptions.sizeRange || {};
                      updateSearchOptions({
                        sizeRange: {
                          ...sizeRange,
                          max: isNaN(value) ? undefined : value * 1024 * 1024,
                        },
                      });
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="∞"
                  />
                </div>
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Upload Date Range
              </label>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500">From</label>
                  <input
                    type="date"
                    value={
                      searchOptions.dateRange?.from
                        ? searchOptions.dateRange.from.toISOString().split('T')[0]
                        : ''
                    }
                    onChange={e => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      const dateRange = searchOptions.dateRange || {};
                      updateSearchOptions({
                        dateRange: {
                          ...dateRange,
                          from: date,
                        },
                      });
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">To</label>
                  <input
                    type="date"
                    value={
                      searchOptions.dateRange?.to
                        ? searchOptions.dateRange.to.toISOString().split('T')[0]
                        : ''
                    }
                    onChange={e => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      const dateRange = searchOptions.dateRange || {};
                      updateSearchOptions({
                        dateRange: {
                          ...dateRange,
                          to: date,
                        },
                      });
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Results Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Results per page
              </label>
              <select
                value={searchOptions.limit}
                onChange={e => updateSearchOptions({ limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            {/* Show Hidden Files */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility Options
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={searchOptions.showHidden || false}
                  onChange={e => {
                    handleInteraction(e);
                    updateSearchOptions({ showHidden: e.target.checked });
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Show hidden files</span>
                <span className="text-xs text-gray-500 ml-1">
                  (files/folders starting with ".")
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDateRange(dateRange: { from?: Date; to?: Date }): string {
  const { from, to } = dateRange;
  if (from && to) {
    return `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;
  } else if (from) {
    return `After ${from.toLocaleDateString()}`;
  } else if (to) {
    return `Before ${to.toLocaleDateString()}`;
  }
  return '';
}

// Memoize the component to prevent unnecessary re-renders
export default memo(AdvancedMediaSearch);
