'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { SchemaList } from '@/components/schemas/schema-list';
import { SchemaEditor } from '@/components/schemas/schema-editor';
import { SchemaImportModal } from '@/components/schemas/schema-import-modal';
import { ProgressiveLoading, SchemaListSkeleton } from '@/components/ui/loading';
import { useRepoSchemas, useSchemaMutations, useCacheInvalidation } from '@/lib/api-hooks';
import type { GitCMSSchema } from '@gitcms/core';

interface SchemaPageState {
  view: 'list' | 'edit' | 'create' | 'import';
  selectedSchema?: GitCMSSchema;
}

export default function SchemasPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<SchemaPageState>({ view: 'list' });
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Cache invalidation utilities
  const { invalidateRepoSchemas } = useCacheInvalidation();

  // Get schemas using cached hook
  const {
    data: schemas,
    loading,
    error,
    refresh: refreshSchemas,
  } = useRepoSchemas(repoInfo?.owner || null, repoInfo?.repo || null, {
    enabled: Boolean(repoInfo),
    fallbackToRegistry: true,
  });

  // Ensure schemas is always an array
  const schemasList = schemas || [];

  // Mutations with automatic cache invalidation
  const { saveSchema, deleteSchema } = useSchemaMutations(
    repoInfo?.owner || null,
    repoInfo?.repo || null
  );

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

  const handleCreateSchema = () => {
    setState({ view: 'create' });
  };

  const handleEditSchema = (schema: GitCMSSchema) => {
    setState({ view: 'edit', selectedSchema: schema });
  };

  const handleDeleteSchema = async (schemaId: string) => {
    if (!confirm('Are you sure you want to delete this schema?')) {
      return;
    }

    try {
      await deleteSchema(schemaId);
    } catch (error) {
      console.error('Failed to delete schema:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete schema');
    }
  };

  const handleSaveSchema = async (schema: GitCMSSchema) => {
    if (!repoInfo) {
      alert('Repository information not available. Please connect a repository first.');
      return;
    }

    try {
      await saveSchema(schema);
      // Return to list view
      setState({ view: 'list' });
    } catch (error) {
      console.error('Failed to save schema:', error);
      alert(error instanceof Error ? error.message : 'Failed to save schema');
    }
  };

  const handleCancel = () => {
    setState({ view: 'list' });
  };

  const handleImportSchemas = () => {
    setImportModalOpen(true);
  };

  const handleImport = async (schemasToImport: GitCMSSchema[], repoUrl: string) => {
    if (!repoInfo) {
      throw new Error('Repository information not available. Please connect a repository first.');
    }

    // Import schemas one by one with conflict detection
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const schema of schemasToImport) {
      try {
        await saveSchema(schema);
        results.imported++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('409') || errorMessage.includes('already exists')) {
          // Schema already exists - this is okay, we'll skip it
          results.skipped++;
        } else {
          results.errors.push(`${schema.id}: ${errorMessage}`);
        }
      }
    }

    // Show summary message
    let message = `Import completed: ${results.imported} imported`;
    if (results.skipped > 0) {
      message += `, ${results.skipped} skipped (already exist)`;
    }
    if (results.errors.length > 0) {
      message += `, ${results.errors.length} failed`;
      console.error('Import errors:', results.errors);
    }

    // You could show a toast notification here instead
    console.log(message);

    if (results.errors.length > 0) {
      throw new Error(`Some schemas failed to import:\n${results.errors.join('\n')}`);
    }
  };

  const handleSchemaListChange = () => {
    // Refresh the schema list when changes occur
    refreshSchemas();
  };

  const schemasPageHeader = (
    <PageHeader
      title="Content Schemas"
      leftElement={
        <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      }
      className="mb-4"
    />
  );

  return (
    <div className="container mx-auto py-8">
      {state.view === 'list' && (
        <>
          {schemasPageHeader}
          <div className="mb-6">
            <p className="text-gray-600">
              Content schemas define the structure and fields for your content types.
              <br />
              Create schemas first, then you can create content instances based on these templates.
            </p>
            {!loading && schemasList.length === 0 && !error && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Getting Started</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        No schemas found.
                        <br />
                        Create your first content schema to define what types of content you want to
                        manage (e.g., blog posts, projects, products).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <ProgressiveLoading
            loading={loading}
            data={schemasList}
            skeleton={<SchemaListSkeleton count={3} />}
            error={error}
            onRetry={refreshSchemas}
          >
            <SchemaList
              schemas={schemasList}
              onCreateSchema={handleCreateSchema}
              onEditSchema={handleEditSchema}
              onDeleteSchema={handleDeleteSchema}
              onImportSchemas={handleImportSchemas}
            />
          </ProgressiveLoading>

          <SchemaImportModal
            isOpen={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            onImport={handleImport}
          />
        </>
      )}

      {(state.view === 'create' || state.view === 'edit') && (
        <>
          <div className="mb-6">
            <button
              onClick={handleCancel}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Schemas
            </button>
            <PageHeader title={state.view === 'create' ? 'Create Schema' : 'Edit Schema'} />
            <div className="mb-4">
              <p className="text-gray-600">
                {state.view === 'create'
                  ? 'Define a new content type schema with custom fields and validation rules'
                  : 'Modify the existing content type schema'}
              </p>
            </div>
          </div>
          <SchemaEditor
            schema={state.selectedSchema}
            onSave={handleSaveSchema}
            onCancel={handleCancel}
            repoInfo={repoInfo}
            onSchemaListChange={handleSchemaListChange}
          />
        </>
      )}
    </div>
  );
}
