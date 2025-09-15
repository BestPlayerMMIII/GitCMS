'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProgressiveLoading, ContentGridSkeleton } from '@/components/ui/loading';
import { useContentList, useRepoSchemas, useContentMutations } from '@/lib/api-hooks';
import type { GitCMSSchema } from '@gitcms/core';

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

function ContentListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get repository info from URL params or localStorage
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);
  const schemaId = searchParams.get('schemaId');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Schema selection modal state
  const [showSchemaModal, setShowSchemaModal] = useState(false);

  // Use cached hooks for data fetching
  const {
    data: content = [],
    loading,
    error,
    refresh: refreshContent,
  } = useContentList(repoInfo?.owner || null, repoInfo?.repo || null, schemaId || undefined, {
    enabled: Boolean(repoInfo),
  });

  const { data: availableSchemas = [], loading: loadingSchemas } = useRepoSchemas(
    repoInfo?.owner || null,
    repoInfo?.repo || null,
    { enabled: Boolean(repoInfo) }
  );

  // Mutations with automatic cache invalidation
  const { deleteContent } = useContentMutations(repoInfo?.owner || null, repoInfo?.repo || null);

  // Initialize repository info
  useEffect(() => {
    const urlOwner = searchParams.get('owner');
    const urlRepo = searchParams.get('repo');

    if (urlOwner && urlRepo) {
      // Use URL parameters first
      setRepoInfo({ owner: urlOwner, repo: urlRepo });
    } else {
      // Check localStorage for connected repository
      const connectedRepo = localStorage.getItem('gitcms-connected-repo');
      if (connectedRepo) {
        try {
          const repoData = JSON.parse(connectedRepo);
          setRepoInfo({
            owner: repoData.owner,
            repo: repoData.name,
          });
        } catch (error) {
          console.error('Failed to parse connected repository:', error);
        }
      }
    }
  }, [searchParams]);

  // Ensure content and schemas are arrays
  const contentList = content || [];
  const schemasList = availableSchemas || [];

  const handleCreateContent = () => {
    if (!repoInfo) {
      alert('No repository connected. Please connect a repository first.');
      return;
    }

    if (schemasList.length === 0) {
      // If no schemas available, this will trigger a fetch via the useRepoSchemas hook
      setShowSchemaModal(true);
    } else {
      setShowSchemaModal(true);
    }
  };

  const handleSchemaSelect = (selectedSchema: GitCMSSchema) => {
    if (!repoInfo) return;

    const params = new URLSearchParams({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      schemaId: selectedSchema.id,
    });

    setShowSchemaModal(false);
    router.push(`/content/edit?${params}`);
  };

  const handleDelete = async (contentId: string, itemSchemaId: string) => {
    if (!repoInfo) return;

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

  const getEditUrl = (item: ContentItem) => {
    if (!repoInfo) return '/content';
    const params = new URLSearchParams({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      schemaId: item.schemaId,
      contentId: item.id,
    });
    return `/content/edit?${params}`;
  };

  const filteredContent = contentList.filter(item => {
    const matchesSearch =
      searchQuery === '' ||
      JSON.stringify(item.data).toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.metadata.author?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.metadata.status === statusFilter;

    return matchesSearch && matchesStatus;
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

  if (loading && !contentList.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error && !contentList.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error?.message}</p>
              </div>
            </div>
          </div>
          <button
            onClick={refreshContent}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state when no repository is connected
  if (!repoInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="mt-6 text-2xl font-medium text-gray-900">No Repository Connected</h3>
            <p className="mt-4 text-gray-500 max-w-md mx-auto">
              To manage content, you need to first connect a GitHub repository. Once connected, you
              can create and edit content using your defined schemas.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/repositories/connect"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Connect Repository
              </Link>
              <Link
                href="/schemas"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Manage Schemas
              </Link>
            </div>
            <div className="mt-8 text-sm text-gray-500">
              <p>Need help getting started?</p>
              <Link
                href="/demo/rich-editor"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Try the Rich Text Editor Demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Content {schemaId ? `• ${schemaId}` : ''}
                </h1>
                <p className="text-sm text-gray-500">
                  {repoInfo?.owner}/{repoInfo?.repo}
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateContent}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Create Content</span>
            </button>
          </div>
        </div>
      </div>

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
          loading={loading && !contentList.length}
          data={contentList}
          skeleton={<ContentGridSkeleton count={6} />}
          error={error}
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
                  key={item.id}
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
                      <button
                        onClick={() => handleDelete(item.id, item.schemaId)}
                        className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                      >
                        Delete
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
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading schemas...</span>
                      </div>
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
                            Repository: {repoInfo?.owner}/{repoInfo?.repo}
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

export default function ContentList() {
  return (
    <Suspense fallback={<ContentGridSkeleton />}>
      <ContentListContent />
    </Suspense>
  );
}
