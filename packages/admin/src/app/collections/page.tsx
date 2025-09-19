'use client';

import React, { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRepository } from '@/contexts/repository-context';
import { PageSubHeader } from '@/components/page-header';
import { useRepoSchemas } from '@/lib/api-hooks';
import { Plus, Archive, Trash2, Users, FileText, Settings } from 'lucide-react';
import { useNavigationHeader } from '@/contexts/navigation-context';

interface Collection {
  id: string;
  name: string;
  description?: string;
  schemaId: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CollectionsPage() {
  const { setHeader } = useNavigationHeader();
  useEffect(() => {
    setHeader(
      'collections',
      <PageSubHeader title="Collections" backName="Back to Dashboard" onBack="/" />
    );
    return () => setHeader('collections', null);
  }, [setHeader]);

  const searchParams = useSearchParams();
  const { repositoryInfo, setRepositoryInfo } = useRepository();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get available schemas
  const { data: schemas = [], loading: schemasLoading } = useRepoSchemas(
    repositoryInfo?.owner || null,
    repositoryInfo?.repo || null
  );

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

  // Load collections
  useEffect(() => {
    if (!repositoryInfo) {
      setLoading(false);
      return;
    }

    loadCollections();
  }, [repositoryInfo]);

  const loadCollections = async () => {
    if (!repositoryInfo) return;

    try {
      setLoading(true);
      setError(null);

      // For now, we'll derive collections from schemas
      // In a real implementation, this would come from a collections API
      const derivedCollections: Collection[] = (schemas || []).map(schema => ({
        id: schema.id,
        name: schema.metadata.name,
        description: schema.metadata.description,
        schemaId: schema.id,
        itemCount: 0, // TODO: Get actual count from content API
        createdAt: schema.metadata.createdAt,
        updatedAt: schema.metadata.updatedAt,
      }));

      setCollections(derivedCollections);
    } catch (err) {
      console.error('Error loading collections:', err);
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = () => {
    setShowCreateModal(true);
  };

  const handleDeleteCollection = async (collection: Collection) => {
    if (!window.confirm(`Are you sure you want to delete collection "${collection.name}"?`)) {
      return;
    }

    // TODO: Implement collection deletion
    console.log('Delete collection:', collection.id);
  };

  if (!repositoryInfo) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center">
            <Archive className="h-12 w-12 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Collections</h1>
          <p className="text-gray-600 mb-4">Connect a repository to manage your collections.</p>
          <Link
            href="/repositories/connect"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Connect Repository
          </Link>
        </div>
      </div>
    );
  }

  if (loading || schemasLoading) {
    return (
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading collections...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">Error: {error}</div>
            <button
              onClick={loadCollections}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
            <p className="text-gray-600">Organize and manage your content with collections</p>
          </div>
          <button
            onClick={handleCreateCollection}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Collection
          </button>
        </div>

        {/* Collections Grid */}
        {collections.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No collections</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new collection.</p>
            <div className="mt-6">
              <button
                onClick={handleCreateCollection}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Collection
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map(collection => (
              <div
                key={collection.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Archive className="h-8 w-8 text-blue-600" />
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900">{collection.name}</h3>
                        <p className="text-sm text-gray-500">Schema: {collection.schemaId}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/content?schemaId=${collection.schemaId}&collection=${collection.id}`}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Content"
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/schemas/edit?id=${collection.schemaId}`}
                        className="text-gray-600 hover:text-gray-800"
                        title="Edit Schema"
                      >
                        <Settings className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteCollection(collection)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Collection"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {collection.description && (
                    <p className="text-sm text-gray-600 mb-4">{collection.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {collection.itemCount} items
                    </div>
                    <div>Updated {new Date(collection.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-3">
                  <div className="flex space-x-3">
                    <Link
                      href={`/content?schemaId=${collection.schemaId}&collection=${collection.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View Content
                    </Link>
                    <Link
                      href={`/content/edit?schemaId=${collection.schemaId}&collection=${collection.id}`}
                      className="text-sm font-medium text-green-600 hover:text-green-800"
                    >
                      Add Content
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Collection Modal - TODO: Implement */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Collection</h3>
            <p className="text-sm text-gray-600 mb-4">
              Collections are created automatically based on your schemas. To create a new
              collection, first create a schema.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <Link
                href="/schemas"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                onClick={() => setShowCreateModal(false)}
              >
                Create Schema
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
