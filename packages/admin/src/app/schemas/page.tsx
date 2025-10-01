'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageSubHeader } from '@/components/page-header';
import { SchemaList } from '@/components/schemas/schema-list';
import { SchemaEditor } from '@/components/schemas/schema-editor';
import { SchemaImportModal } from '@/components/schemas/schema-import-modal';
import { ProgressiveLoading, SchemaListSkeleton } from '@/components/ui/loading';
import {
  useRepoSchemas,
  useSchemaMutations,
  useCacheInvalidation,
  useSchemaMapping,
  useSchemaMappingMutations,
  getUserSchemaId,
  getSystemSchemaId,
} from '@/lib/api-hooks';
import { convertSchemasToUserFormat } from '@/lib/schema-id-converter';
import { useRepository } from '@/contexts/repository-context';
import type { GitCMSSchema } from '@git-cms/core';
import { useNavigationHeader } from '@/contexts/navigation-context';

interface SchemaPageState {
  view: 'list' | 'edit' | 'create' | 'import';
  selectedSchema?: GitCMSSchema;
}

export default function SchemasPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<SchemaPageState>({ view: 'list' });
  const [importModalOpen, setImportModalOpen] = useState(false);
  const { repositoryInfo, setRepositoryInfo } = useRepository();
  const { setHeader } = useNavigationHeader();

  // State for converted schemas (system -> user friendly)
  const [displaySchemas, setDisplaySchemas] = useState<GitCMSSchema[]>([]);
  const [schemasLoading, setSchemasLoading] = useState(false);

  // Cache invalidation utilities
  const { invalidateRepoSchemas } = useCacheInvalidation();

  // Get schemas using cached hook (these use system IDs)
  const {
    data: systemSchemas,
    loading: systemSchemasLoading,
    error,
    refresh: refreshSchemas,
  } = useRepoSchemas(repositoryInfo?.owner || null, repositoryInfo?.repo || null, {
    enabled: Boolean(repositoryInfo),
    fallbackToRegistry: true,
  });

  // Schema mapping hooks
  const { data: schemaMapping } = useSchemaMapping(
    repositoryInfo?.owner || null,
    repositoryInfo?.repo || null,
    { enabled: Boolean(repositoryInfo) }
  );

  const { createMapping, updateMapping } = useSchemaMappingMutations(
    repositoryInfo?.owner || null,
    repositoryInfo?.repo || null
  );

  // Mutations with automatic cache invalidation
  const { saveSchema, deleteSchema } = useSchemaMutations(
    repositoryInfo?.owner || null,
    repositoryInfo?.repo || null
  );

  // Convert system schemas to user-friendly format whenever they change
  useEffect(() => {
    const convertSchemas = async () => {
      if (!systemSchemas || !repositoryInfo) {
        setDisplaySchemas([]);
        setSchemasLoading(false);
        return;
      }

      setSchemasLoading(true);
      try {
        const convertedSchemas = await convertSchemasToUserFormat(
          systemSchemas,
          repositoryInfo.owner,
          repositoryInfo.repo
        );
        setDisplaySchemas(convertedSchemas);
      } catch (error) {
        console.error('Failed to convert schemas:', error);
        setDisplaySchemas(systemSchemas); // Fallback to system schemas
      } finally {
        setSchemasLoading(false);
      }
    };

    convertSchemas();
  }, [systemSchemas, repositoryInfo]);

  // Initialize repository info from URL params if available
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

  const handleCreateSchema = () => {
    setState({ view: 'create' });
  };

  const handleEditSchema = async (schema: GitCMSSchema) => {
    // Convert system ID to user-friendly ID for editing
    if (repositoryInfo) {
      try {
        const userDefinedId = await getUserSchemaId(
          repositoryInfo.owner,
          repositoryInfo.repo,
          schema.id
        );
        const schemaForEditing = { ...schema, id: userDefinedId };
        setState({ view: 'edit', selectedSchema: schemaForEditing });
      } catch (error) {
        // Fallback to original ID if mapping fails
        setState({ view: 'edit', selectedSchema: schema });
      }
    } else {
      setState({ view: 'edit', selectedSchema: schema });
    }
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

  const handleDuplicateSchema = async (schema: GitCMSSchema) => {
    if (!repositoryInfo) {
      alert('Repository information not available. Please connect a repository first.');
      return;
    }

    // Generate a unique ID for the duplicated schema
    const generateUniqueId = (baseId: string): string => {
      const existingIds = displaySchemas?.map((s: GitCMSSchema) => s.id) || [];
      let counter = 1;
      let newId = `${baseId}-copy`;

      while (existingIds.includes(newId)) {
        counter++;
        newId = `${baseId}-copy-${counter}`;
      }

      return newId;
    };

    const newId = generateUniqueId(schema.id);
    const duplicatedSchema: GitCMSSchema = {
      ...schema,
      id: newId,
      metadata: {
        ...schema.metadata,
        name: `${schema.metadata?.name || schema.id} (Copy)`,
        description: schema.metadata?.description
          ? `Copy of: ${schema.metadata.description}`
          : `Copy of ${schema.id}`,
      },
    };

    try {
      await saveSchema(duplicatedSchema);
      // The list will be automatically refreshed via cache invalidation
    } catch (error) {
      console.error('Failed to duplicate schema:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        alert('A schema with this ID already exists. Please try again.');
        // Retry with a different ID
        handleDuplicateSchema(schema);
      } else {
        alert(error instanceof Error ? error.message : 'Failed to duplicate schema');
      }
    }
  };

  const handleSaveSchema = async (schema: GitCMSSchema, originalSchemaId?: string) => {
    if (!repositoryInfo) {
      alert('Repository information not available. Please connect a repository first.');
      return;
    }

    try {
      // Store the user-provided ID for mapping
      const userDefinedId = schema.id;

      // Create a copy of the schema to modify for storage
      const schemaToSave = { ...schema };

      // Create or update schema mapping
      if (!originalSchemaId) {
        // New schema - create mapping with user-defined ID
        const { systemId } = await createMapping(userDefinedId);
        // Use system ID for storage, but keep user ID in UI
        schemaToSave.id = systemId;
        await saveSchema(schemaToSave);
      } else {
        // Editing existing schema
        // Convert original user ID to system ID if needed
        const originalSystemId = await getSystemSchemaId(
          repositoryInfo.owner,
          repositoryInfo.repo,
          originalSchemaId
        );

        if (originalSchemaId !== userDefinedId) {
          // Schema ID changed - update mapping
          await updateMapping(originalSystemId, userDefinedId);
        }

        // Use system ID for storage
        schemaToSave.id = originalSystemId;
        await saveSchema(schemaToSave, originalSystemId);
      }

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
    if (!repositoryInfo) {
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

  const createHeader = () => {
    return state.view === 'list' ? (
      <PageSubHeader title="Schemas" backName="Back to Dashboard" onBack={'/'} />
    ) : (
      <PageSubHeader
        title={
          state.view === 'create'
            ? 'Create Schema'
            : state.view === 'edit'
              ? 'Edit Schema'
              : 'Schemas'
        }
        backName="Back to Schemas"
        onBack={handleCancel}
      />
    );
  };
  useEffect(() => {
    setHeader('schemas', createHeader());
    return () => setHeader('schemas', null);
  }, [setHeader, state]);

  return (
    <div className="container mx-auto py-8">
      {state.view === 'list' && (
        <>
          <div className="mb-6">
            <p className="text-gray-600">
              Content schemas define the structure and fields for your content types.
              <br />
              Create schemas first, then you can create content instances based on these templates.
            </p>
            {!systemSchemasLoading &&
              !schemasLoading &&
              displaySchemas &&
              displaySchemas.length === 0 &&
              !error &&
              repositoryInfo && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
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
                          Create your first content schema to define what types of content you want
                          to manage (e.g., blog posts, projects, products).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>

          <ProgressiveLoading
            loading={systemSchemasLoading || schemasLoading}
            data={displaySchemas}
            skeleton={<SchemaListSkeleton count={3} />}
            error={error}
            onRetry={refreshSchemas}
          >
            <SchemaList
              schemas={displaySchemas || []}
              onCreateSchema={handleCreateSchema}
              onEditSchema={handleEditSchema}
              onDeleteSchema={handleDeleteSchema}
              onDuplicateSchema={handleDuplicateSchema}
              onImportSchemas={handleImportSchemas}
              repoInfo={repositoryInfo}
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
          <SchemaEditor
            schema={state.selectedSchema}
            onSave={handleSaveSchema}
            onCancel={handleCancel}
            repoInfo={repositoryInfo}
            onSchemaListChange={handleSchemaListChange}
          />
        </>
      )}
    </div>
  );
}
