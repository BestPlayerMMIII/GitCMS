'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SchemaForm } from '@/components/content/schema-form';
import { useRepoSchema, useContentItem, useContentMutations } from '@/lib/api-hooks';
import { ProgressiveLoading } from '@/components/ui/loading';
import { PageSubHeader } from '@/components/page-header';
import { useNavigationHeader } from '@/contexts/navigation-context';

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
  const { setHeader } = useNavigationHeader();

  // Get repository info from URL params or localStorage
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);
  const schemaId = searchParams.get('schemaId');
  const contentId = searchParams.get('contentId'); // Optional - if editing existing content

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [enableIdEdit, setEnableIdEdit] = useState(false);
  const [newContentId, setNewContentId] = useState<string>('');

  // Use cached hooks for data fetching
  const {
    data: schema,
    loading: schemaLoading,
    error: schemaError,
  } = useRepoSchema(repoInfo?.owner || null, repoInfo?.repo || null, schemaId);

  const {
    data: content,
    loading: contentLoading,
    error: contentError,
  } = useContentItem(
    repoInfo?.owner || null,
    repoInfo?.repo || null,
    schemaId,
    contentId || null,
    { enabled: Boolean(contentId) } // Only fetch if editing existing content
  );

  const { saveContent } = useContentMutations(repoInfo?.owner || null, repoInfo?.repo || null);

  // Determine loading and error states
  const loading = schemaLoading || (contentId ? contentLoading : false);
  const apiError = schemaError || contentError;

  // Local error state for save operations
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const handleSave = async (formData: Record<string, any>) => {
    if (!repoInfo || !schemaId) {
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      // Extract metadata from form data (it should no longer be in _metadata)
      const { _metadata, ...data } = formData;

      // Determine if we're changing the content ID
      const targetContentId =
        enableIdEdit && newContentId && newContentId !== contentId ? newContentId : contentId;

      // Prepare the request payload with metadata in the proper location
      const payload = {
        schemaId,
        data,
        metadata: _metadata || {},
        ...(targetContentId && { contentId: targetContentId }),
      };

      // Use the cached mutation hook
      const result = await saveContent(
        payload.schemaId,
        payload.data,
        payload.contentId,
        payload.metadata,
        false, // publish = false for save
        contentId || undefined // originalContentId
      );

      setSavedMessage('Content saved successfully!');
      setTimeout(() => setSavedMessage(null), 3000);

      // Update URL with contentId if creating new content or if ID changed
      if (!contentId && result.content?.id) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('contentId', result.content.id);
        window.history.replaceState({}, '', newUrl.toString());
      } else if (enableIdEdit && newContentId && newContentId !== contentId) {
        // ID was changed - update URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('contentId', newContentId);
        window.history.replaceState({}, '', newUrl.toString());
      }
    } catch (error) {
      console.error('Save error:', error);

      // Parse structured errors
      if (error instanceof Error) {
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.fieldError) {
            setFieldErrors({
              [`_metadata.${parsedError.fieldError.field}`]: parsedError.fieldError.message,
            });
            setSaveError(parsedError.message);
          } else {
            setSaveError(error.message);
          }
        } catch {
          setSaveError(error.message);
        }
      } else {
        setSaveError('Failed to save content');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    if (!repoInfo?.owner || !repoInfo?.repo || !schemaId) return;

    try {
      setSaving(true);
      setSaveError(null);

      // Extract metadata from form data
      const { _metadata, ...data } = formData;

      // Determine the target content ID
      const targetContentId =
        enableIdEdit && newContentId && newContentId !== contentId ? newContentId : contentId;

      // Prepare the request payload with metadata and publish flag
      const payload = {
        schemaId,
        data,
        metadata: _metadata || {},
        ...(targetContentId && { contentId: targetContentId }),
      };

      // Use the cached mutation hook to publish (set publish flag to true)
      const result = await saveContent(
        payload.schemaId,
        payload.data,
        payload.contentId,
        payload.metadata,
        true, // publish = true
        contentId || undefined // originalContentId
      );

      setSavedMessage('Content published successfully!');
      setTimeout(() => setSavedMessage(null), 3000);

      // Update URL if needed
      if (!contentId && result.content?.id) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('contentId', result.content.id);
        window.history.replaceState({}, '', newUrl.toString());
      } else if (enableIdEdit && newContentId && newContentId !== contentId) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('contentId', newContentId);
        window.history.replaceState({}, '', newUrl.toString());
      }
    } catch (error) {
      console.error('Publish error:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to publish content');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to archive content
  const handleArchive = async (formData: Record<string, any>) => {
    if (!repoInfo?.owner || !repoInfo?.repo || !schemaId) return;

    try {
      setSaving(true);
      setSaveError(null);

      const { _metadata, ...data } = formData;
      const targetContentId =
        enableIdEdit && newContentId && newContentId !== contentId ? newContentId : contentId;

      const archiveMetadata = {
        ...(_metadata || {}),
        status: 'archived',
      };

      await saveContent(
        schemaId,
        data,
        targetContentId || undefined,
        archiveMetadata,
        false, // publish = false
        contentId || undefined // originalContentId
      );

      setSavedMessage('Content archived successfully!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (error) {
      console.error('Archive error:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to archive content');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to get the right action buttons based on current status
  const getActionButtons = () => {
    const currentStatus = content?.metadata?.status || 'draft';

    if (currentStatus === 'draft') {
      return {
        saveLabel: saving ? 'Saving...' : 'Save Draft',
        submitLabel: saving ? 'Publishing...' : 'Publish',
        onSubmit: handleSubmit,
        showArchive: false,
      };
    } else if (currentStatus === 'published') {
      return {
        saveLabel: saving ? 'Updating...' : 'Update',
        submitLabel: saving ? 'Archiving...' : 'Archive',
        onSubmit: handleArchive,
        showArchive: true,
      };
    } else if (currentStatus === 'archived') {
      return {
        saveLabel: saving ? 'Updating...' : 'Update',
        submitLabel: saving ? 'Publishing...' : 'Publish',
        onSubmit: handleSubmit,
        showArchive: false,
      };
    }

    // Default case
    return {
      saveLabel: saving ? 'Saving...' : 'Save Draft',
      submitLabel: saving ? 'Publishing...' : 'Publish',
      onSubmit: handleSubmit,
      showArchive: false,
    };
  };

  const actionButtons = getActionButtons();

  useEffect(() => {
    if (!schema) return;
    setHeader(
      'content',
      <PageSubHeader
        title={contentId ? `Edit ${contentId}` : 'Create content'}
        backName="Back to Content"
        onBack="/content"
        rightElement={
          <div className="flex items-center space-x-3">
            {contentId && (
              <button
                onClick={() => setEnableIdEdit(!enableIdEdit)}
                className={`px-3 py-1 text-xs font-medium rounded-md border ${
                  enableIdEdit
                    ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
                title={enableIdEdit ? 'Disable ID editing' : 'Enable ID editing'}
              >
                {enableIdEdit ? 'Disable ID Edit' : 'Enable ID Edit'}
              </button>
            )}
            {savedMessage && (
              <span className="text-sm text-green-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        }
      />
    );
    return () => setHeader('schemas', null);
  }, [setHeader, schema, contentId, content, enableIdEdit, newContentId, savedMessage]);

  // Determine the error to display (API errors take priority)
  const displayError = apiError?.message || saveError;

  if (loading) {
    return (
      <ProgressiveLoading
        loading={true}
        data={null}
        skeleton={
          <div className="bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading content editor...</p>
            </div>
          </div>
        }
      >
        <div></div>
      </ProgressiveLoading>
    );
  }

  if (displayError) {
    return (
      <div className="bg-gray-50 flex items-center justify-center">
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
                <p className="text-sm text-red-700 mt-1">{displayError}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSaveError(null)}
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
      <div className="bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Schema not found</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <SchemaForm
          schema={schema}
          initialData={content?.data || {}}
          onSave={handleSave}
          onSubmit={actionButtons.onSubmit}
          disabled={saving}
          autoSave={false}
          saveLabel={actionButtons.saveLabel}
          submitLabel={actionButtons.submitLabel}
          showIdField={!contentId} // Show ID field only when creating new content
          allowIdEdit={contentId ? enableIdEdit : false} // Allow ID editing for existing content when enabled
          currentContentId={contentId || ''}
          onIdChange={setNewContentId}
          externalErrors={fieldErrors}
          repoInfo={repoInfo}
        />
      </div>
    </div>
  );
}
