'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { type GitCMSSchema, defaultRegistry } from '@gitcms/core';
import { SchemaForm } from '@/components/content/schema-form';

interface ContentEditorProps {
  owner: string;
  repo: string;
  schemaId: string;
  contentId?: string;
}

interface ContentData {
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

export default function ContentEditor() {
  const searchParams = useSearchParams();

  // Get repository info from URL params or localStorage
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);
  const schemaId = searchParams.get('schemaId');
  const contentId = searchParams.get('contentId'); // Optional - if editing existing content

  const [schema, setSchema] = useState<GitCMSSchema | null>(null);
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

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

  // Load schema and content
  useEffect(() => {
    if (!repoInfo || !schemaId) {
      setError('Missing required parameters');
      setLoading(false);
      return;
    }

    loadData();
  }, [repoInfo, schemaId, contentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load schema from registry
      if (!schemaId) {
        throw new Error('Schema ID is required');
      }

      const schemaData = defaultRegistry.get(schemaId);
      if (!schemaData) {
        throw new Error(`Schema not found: ${schemaId}`);
      }
      setSchema(schemaData);

      // Load content if editing existing
      if (contentId && repoInfo) {
        const response = await fetch(
          `/api/content?action=get&owner=${repoInfo.owner}&repo=${repoInfo.repo}&schemaId=${schemaId}&contentId=${contentId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Content not found');
          }
          throw new Error('Failed to load content');
        }

        const result = await response.json();
        if (result.success) {
          setContent(result.content);
        } else {
          throw new Error(result.error || 'Failed to load content');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Record<string, any>) => {
    if (!repoInfo || !schemaId) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const action = contentId ? 'update' : 'create';
      const payload = {
        ...(contentId && { contentId }),
        schemaId,
        data: formData,
        metadata: {
          ...content?.metadata,
          status: content?.metadata?.status || 'draft',
        },
      };

      const response = await fetch(
        `/api/content?action=${action}&owner=${repoInfo.owner}&repo=${repoInfo.repo}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to save content';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Use status text if JSON parsing fails
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.success) {
        setContent(result.content);
        setSavedMessage('Content saved successfully!');
        setTimeout(() => setSavedMessage(null), 3000);

        // Update URL with contentId if creating new content
        if (!contentId && result.content.id) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('contentId', result.content.id);
          window.history.replaceState({}, '', newUrl.toString());
        }
      } else {
        throw new Error(result.error || 'Failed to save content');
      }
    } catch (error) {
      console.error('Save error:', error);
      setError(error instanceof Error ? error.message : 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    if (!repoInfo?.owner || !repoInfo?.repo || !schemaId) return;

    try {
      setSaving(true);
      setError(null);

      // Save first if not already saved
      if (!contentId) {
        await handleSave(formData);
      }

      // Then publish
      const publishPayload = {
        contentId: contentId || content?.id,
        schemaId,
        data: formData,
        metadata: {
          ...content?.metadata,
          status: 'published',
        },
      };

      const response = await fetch(
        `/api/content?action=update&owner=${repoInfo.owner}&repo=${repoInfo.repo}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(publishPayload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to publish content');
      }

      const result = await response.json();
      if (result.success) {
        setContent(result.content);
        setSavedMessage('Content published successfully!');
        setTimeout(() => setSavedMessage(null), 3000);
      } else {
        throw new Error(result.error || 'Failed to publish content');
      }
    } catch (error) {
      console.error('Publish error:', error);
      setError(error instanceof Error ? error.message : 'Failed to publish content');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading content editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Schema not found</p>
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
                onClick={() => window.history.back()}
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
                  {contentId ? 'Edit' : 'Create'} {schema.metadata.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {repoInfo?.owner}/{repoInfo?.repo} • {schema.id}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {savedMessage && (
                <span className="text-sm text-green-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
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
                  {savedMessage}
                </span>
              )}
              {content?.metadata?.status && (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    content.metadata.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : content.metadata.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {content.metadata.status}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <SchemaForm
          schema={schema}
          initialData={content?.data || {}}
          onSave={handleSave}
          onSubmit={handleSubmit}
          disabled={saving}
          autoSave={false}
          saveLabel={saving ? 'Saving...' : 'Save Draft'}
          submitLabel={saving ? 'Publishing...' : 'Publish'}
        />
      </div>
    </div>
  );
}
