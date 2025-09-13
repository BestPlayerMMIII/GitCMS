'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { SchemaList } from '@/components/schemas/schema-list';
import { SchemaEditor } from '@/components/schemas/schema-editor';
import type { GitCMSSchema } from '@gitcms/core';

interface SchemaPageState {
  view: 'list' | 'edit' | 'create';
  selectedSchema?: GitCMSSchema;
}

export default function SchemasPage() {
  const [state, setState] = useState<SchemaPageState>({ view: 'list' });
  const [schemas, setSchemas] = useState<GitCMSSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load schemas from the registry
  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/schemas?action=list');
      if (!response.ok) {
        throw new Error(`Failed to load schemas: ${response.statusText}`);
      }

      const data = await response.json();
      setSchemas(data.schemas || []);
    } catch (error) {
      console.error('Failed to load schemas:', error);
      setError(error instanceof Error ? error.message : 'Failed to load schemas');
    } finally {
      setLoading(false);
    }
  };

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
      const response = await fetch(`/api/schemas?action=delete&schemaId=${schemaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete schema: ${response.statusText}`);
      }

      // Reload schemas
      await loadSchemas();
    } catch (error) {
      console.error('Failed to delete schema:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete schema');
    }
  };

  const handleSaveSchema = async (schema: GitCMSSchema) => {
    try {
      const response = await fetch('/api/schemas?action=save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save schema: ${response.statusText}`);
      }

      // Reload schemas and return to list view
      await loadSchemas();
      setState({ view: 'list' });
    } catch (error) {
      console.error('Failed to save schema:', error);
      setError(error instanceof Error ? error.message : 'Failed to save schema');
    }
  };

  const handleCancel = () => {
    setState({ view: 'list' });
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

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        {schemasPageHeader}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        {schemasPageHeader}
        <div className="mb-4">
          <p className="text-gray-600">Define and manage content types for your repository</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
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
              <h3 className="text-sm font-medium text-red-800">Error loading schemas</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={loadSchemas}
                  className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            {schemas.length === 0 && (
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
          <SchemaList
            schemas={schemas}
            onCreateSchema={handleCreateSchema}
            onEditSchema={handleEditSchema}
            onDeleteSchema={handleDeleteSchema}
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
          />
        </>
      )}
    </div>
  );
}
