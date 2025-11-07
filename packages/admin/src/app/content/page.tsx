'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProgressiveLoading, ContentGridSkeleton, PageLoading } from '@/components/ui/loading';
import { useRepoSchemas, useContentMutations, useContentList } from '@/lib/api-hooks';
import { useRepository } from '@/contexts/repository-context';
import type { GitCMSSchema } from '@git-cms/core';
import { PageSubHeader } from '@/components/page-header';
import { useNavigationHeader } from '@/contexts/navigation-context';
import Suspenser from '@/components/suspenser';
import { NoRepoConnected } from '@/components/no-repo-connected';

interface ContentItem {
  id: string;
  schemaId: string;
  data: Record<string, any>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    author?: string;
    status: 'draft' | 'published' | 'archived';
    slug?: string;
  };
}

function ContentList() {
  const { setHeader } = useNavigationHeader();

  const searchParams = useSearchParams();
  const router = useRouter();
  const { repositoryInfo, setRepositoryInfo } = useRepository();

  const schemaId = searchParams.get('schemaId');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [schemaFilter, setSchemaFilter] = useState<string>('all');

  // Schema selection modal state
  const [showSchemaModal, setShowSchemaModal] = useState(false);

  // Update repository info from URL params if available
  useEffect(() => {
    const urlOwner = searchParams.get('owner');
    const urlRepo = searchParams.get('repo');

    if (
      urlOwner &&
      urlRepo &&
      (!repositoryInfo || repositoryInfo.owner !== urlOwner || repositoryInfo.repo !== urlRepo)
    ) {
      setRepositoryInfo({ owner: urlOwner, repo: urlRepo });
    }
  }, [searchParams, repositoryInfo, setRepositoryInfo]);

  // Use cached hooks for data fetching
  const {
    data: content = [],
    loading,
    error,
    refresh: refreshContent,
  } = useContentList(
    repositoryInfo?.owner || null,
    repositoryInfo?.repo || null,
    schemaId || undefined,
    {
      enabled: Boolean(repositoryInfo),
    }
  );

  const { data: availableSchemas = [], loading: loadingSchemas } = useRepoSchemas(
    repositoryInfo?.owner || null,
    repositoryInfo?.repo || null,
    { enabled: Boolean(repositoryInfo) }
  );

  // Mutations with automatic cache invalidation
  const { deleteContent, saveContent } = useContentMutations(
    repositoryInfo?.owner || null,
    repositoryInfo?.repo || null
  );

  // Ensure content and schemas are arrays
  const contentList = content || [];
  const schemasList = availableSchemas || [];

  const handleCreateContent = useCallback(() => {
    if (!repositoryInfo) {
      alert('No repository connected. Please connect a repository first.');
      return;
    }

    if (schemasList.length === 0) {
      // If no schemas available, this will trigger a fetch via the useRepoSchemas hook
      setShowSchemaModal(true);
    } else {
      setShowSchemaModal(true);
    }
  }, [repositoryInfo, schemasList.length]);

  useEffect(() => {
    setHeader(
      'content',
      <PageSubHeader
        title="Content"
        backName="Back to Dashboard"
        onBack="/"
        rightElement={
          repositoryInfo && (
            <button
              onClick={handleCreateContent}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Content
            </button>
          )
        }
      />
    );
    return () => setHeader('content', null);
  }, [setHeader, repositoryInfo, handleCreateContent]);

  const handleSchemaSelect = (selectedSchema: GitCMSSchema) => {
    if (!repositoryInfo) return;

    const params = new URLSearchParams({
      owner: repositoryInfo.owner,
      repo: repositoryInfo.repo,
      schemaId: selectedSchema.id,
    });

    setShowSchemaModal(false);
    router.push(`/content/edit?${params}`);
  };

  const handleDelete = async (contentId: string, itemSchemaId: string) => {
    if (!repositoryInfo) return;

    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteContent(itemSchemaId, contentId);
      // Content list will be automatically refreshed via cache invalidation
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete content');
    }
  };

  const handleDuplicate = async (item: ContentItem) => {
    if (!repositoryInfo) return;

    // Generate a unique ID for the duplicated content
    const generateUniqueId = (baseId: string): string => {
      const existingIds = contentList.map(c => c.id);
      let counter = 1;
      let newId = `${baseId}-copy`;

      while (existingIds.includes(newId)) {
        counter++;
        newId = `${baseId}-copy-${counter}`;
      }

      return newId;
    };

    const newId = generateUniqueId(item.id);
    const duplicatedContent = {
      ...item,
      id: newId,
      metadata: {
        ...item.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft' as const, // New content should start as draft
      },
      // Update title/name fields to indicate it's a copy
      data: {
        ...item.data,
        ...(item.data.title && { title: `${item.data.title} (Copy)` }),
        ...(item.data.name && { name: `${item.data.name} (Copy)` }),
      },
    };

    try {
      await saveContent(item.schemaId, duplicatedContent.data, newId);
      // Content list will be automatically refreshed via cache invalidation
    } catch (error) {
      console.error('Failed to duplicate content:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        alert('A content item with this ID already exists. Please try again.');
        // Retry with a different ID
        handleDuplicate(item);
      } else {
        alert(error instanceof Error ? error.message : 'Failed to duplicate content');
      }
    }
  };

  const handleQuickStatusChange = async (
    item: ContentItem,
    newStatus: 'draft' | 'published' | 'archived'
  ) => {
    if (!repositoryInfo) return;

    try {
      const updatedMetadata = {
        ...item.metadata,
        status: newStatus,
        ...(newStatus === 'published' && { publishedAt: new Date().toISOString() }),
      };

      await saveContent(
        item.schemaId,
        item.data,
        item.id,
        updatedMetadata,
        newStatus === 'published' // publish flag
      );
      // Content list will be automatically refreshed via cache invalidation
    } catch (error) {
      console.error('Failed to change status:', error);
      alert(error instanceof Error ? error.message : 'Failed to change content status');
    }
  };

  const getEditUrl = (item: ContentItem) => {
    if (!repositoryInfo) return '/content';
    const params = new URLSearchParams({
      owner: repositoryInfo.owner,
      repo: repositoryInfo.repo,
      schemaId: item.schemaId,
      contentId: item.id,
    });
    return `/content/edit?${params}`;
  };

  // Filter content client-side (no loading state triggered)
  const filteredContent = contentList.filter(item => {
    const matchesSearch =
      searchQuery === '' ||
      JSON.stringify(item.data).toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.metadata.author?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.metadata.status === statusFilter;
    const matchesSchema = schemaFilter === 'all' || item.schemaId === schemaFilter;

    return matchesSearch && matchesStatus && matchesSchema;
  });

  const getDisplayTitle = (item: ContentItem): string => {
    // Try to find a title field in the data
    const titleFields = ['title', 'name', 'subject', 'heading'];
    for (const field of titleFields) {
      if (item.data[field] && typeof item.data[field] === 'string') {
        return item.data[field];
      }
    }
    return item.id;
  };

  const getDisplayDescription = (item: ContentItem): string => {
    // Try to find a description field in the data
    const descFields = ['description', 'excerpt', 'summary', 'content'];
    for (const field of descFields) {
      if (item.data[field] && typeof item.data[field] === 'string') {
        // Strip HTML tags from rich-text content
        const cleanText = item.data[field]
          .replace(/<[^>]*>/g, ' ') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
          .replace(/&amp;/g, '&') // Replace HTML entities
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
          .trim(); // Remove leading/trailing whitespace

        if (cleanText.length === 0) continue; // Skip empty fields after cleaning

        return cleanText.substring(0, 150) + (cleanText.length > 150 ? '...' : '');
      }
    }
    return 'No description available';
  };

  // Empty state when no repository is connected
  if (!repositoryInfo) {
    return (
      <NoRepoConnected
        title="Contents"
        description="Connect a repository to manage your contents."
      />
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 max-w-lg">
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={schemaFilter}
              onChange={e => setSchemaFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Schemas</option>
              {schemasList.map(schema => (
                <option key={schema.id} value={schema.id}>
                  {schema.metadata?.name || schema.id}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <button
              onClick={refreshContent}
              className="px-3 py-2 text-gray-500 hover:text-gray-700"
              title="Refresh content list"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <ProgressiveLoading
          loading={loading && contentList.length === 0}
          data={contentList}
          skeleton={<ContentGridSkeleton count={6} />}
          error={error && contentList.length === 0 ? error : null}
          onRetry={refreshContent}
        >
          {filteredContent.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No content found</h3>
              <p className="mt-2 text-gray-500">
                {contentList.length === 0
                  ? 'Get started by creating your first content item.'
                  : 'Try adjusting your search or filters.'}
              </p>
              {contentList.length === 0 && (
                <button
                  onClick={handleCreateContent}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Content
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredContent.map(item => (
                <div
                  key={`${item.schemaId}-${item.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {getDisplayTitle(item)}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {item.schemaId} • {item.id}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.metadata.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : item.metadata.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.metadata.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-gray-600 line-clamp-3">
                      {getDisplayDescription(item)}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {item.metadata.author && `By ${item.metadata.author} • `}
                        {new Date(item.metadata.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center space-x-2">
                      <Link
                        href={getEditUrl(item)}
                        className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center"
                      >
                        Edit
                      </Link>

                      {/* Quick status change buttons */}
                      {item.metadata.status === 'draft' && (
                        <button
                          onClick={() => handleQuickStatusChange(item, 'published')}
                          className="px-3 py-2 text-sm text-green-600 border border-green-200 rounded-md hover:bg-green-50"
                          title="Publish"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                      )}
                      {item.metadata.status === 'published' && (
                        <button
                          onClick={() => handleQuickStatusChange(item, 'archived')}
                          className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
                          title="Archive"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                            />
                          </svg>
                        </button>
                      )}
                      {item.metadata.status === 'archived' && (
                        <button
                          onClick={() => handleQuickStatusChange(item, 'published')}
                          className="px-3 py-2 text-sm text-green-600 border border-green-200 rounded-md hover:bg-green-50"
                          title="Publish"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                      )}

                      <button
                        onClick={() => handleDuplicate(item)}
                        className="px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
                        title="Duplicate content"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.schemaId)}
                        className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ProgressiveLoading>
      </div>

      {/* Schema Selection Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowSchemaModal(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Choose Content Type
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                      Select from your custom schemas stored in this repository.
                    </p>

                    {loadingSchemas ? (
                      <PageLoading message="Loading schemas..." />
                    ) : schemasList.length === 0 ? (
                      <div className="text-center py-8">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <h4 className="mt-2 text-lg font-medium text-gray-900">
                          No custom schemas found
                        </h4>
                        <p className="mt-1 text-sm text-gray-500">
                          You need to create custom schemas for this repository before you can add
                          content. Schemas define the structure and fields for your content types.
                        </p>
                        <div className="mt-4 space-y-2">
                          <Link
                            href="/schemas"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            onClick={() => setShowSchemaModal(false)}
                          >
                            Create Schema
                          </Link>
                          <div className="text-xs text-gray-400">
                            Repository: {repositoryInfo?.owner}/{repositoryInfo?.repo}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 max-h-96 overflow-y-auto">
                        {schemasList.map(schema => (
                          <button
                            key={schema.id}
                            onClick={() => handleSchemaSelect(schema)}
                            className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                                    {schema.metadata.name}
                                  </h4>
                                  {schema.metadata.icon && (
                                    <span className="text-lg">{schema.metadata.icon}</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{schema.id}</p>
                                {schema.metadata.description && (
                                  <p className="text-sm text-gray-600 mt-2">
                                    {schema.metadata.description}
                                  </p>
                                )}
                                <div className="flex items-center mt-2 space-x-2">
                                  {schema.metadata.category && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {schema.metadata.category}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {Object.keys(schema.fields).length} field
                                    {Object.keys(schema.fields).length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                              <svg
                                className="w-5 h-5 text-gray-400 group-hover:text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowSchemaModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

export default function ContentListPage() {
  return (
    <Suspenser>
      <ContentList />
    </Suspenser>
  );
}
