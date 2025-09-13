'use client';

import { useState, useEffect } from 'react';
import type { GitCMSSchema, FieldDefinition, FieldType } from '@gitcms/core';

interface SchemaEditorProps {
  schema?: GitCMSSchema;
  onSave: (schema: GitCMSSchema) => void;
  onCancel: () => void;
}

const FIELD_TYPES = [
  'string',
  'text',
  'number',
  'boolean',
  'date',
  'datetime',
  'array',
  'object',
  'media',
  'reference',
  'rich-text',
  'select',
] as const;

type FieldTypeValue = (typeof FIELD_TYPES)[number];

export function SchemaEditor({ schema, onSave, onCancel }: SchemaEditorProps) {
  const [formData, setFormData] = useState<GitCMSSchema>(() => ({
    id: '',
    metadata: {
      name: '',
      version: '1.0.0',
      description: '',
      category: 'content',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    fields: {},
    ...schema,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (schema) {
      setFormData({ ...schema });
    }
  }, [schema]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = 'Schema ID is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = 'Schema ID must contain only lowercase letters, numbers, and hyphens';
    }

    if (!formData.metadata?.name?.trim()) {
      newErrors.name = 'Schema name is required';
    }

    if (Object.keys(formData.fields || {}).length === 0) {
      newErrors.fields = 'At least one field is required';
    }

    // Validate individual fields
    Object.entries(formData.fields || {}).forEach(([fieldKey, field]) => {
      if (!fieldKey.trim()) {
        newErrors[`field-${fieldKey}-key`] = 'Field key is required';
      }
      if (!field.type) {
        newErrors[`field-${fieldKey}-type`] = 'Field type is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const addField = () => {
    const fieldKey = `field_${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldKey]: {
          type: 'string',
          label: '',
          required: false,
        },
      },
    }));
  };

  const removeField = (fieldKey: string) => {
    setFormData(prev => {
      const newFields = { ...prev.fields };
      delete newFields[fieldKey];
      return {
        ...prev,
        fields: newFields,
      };
    });
  };

  const updateField = (fieldKey: string, updates: Partial<FieldDefinition>) => {
    setFormData(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldKey]: {
          ...prev.fields?.[fieldKey],
          ...updates,
        },
      },
    }));
  };

  const renameField = (oldKey: string, newKey: string) => {
    if (oldKey === newKey || !newKey.trim()) return;

    setFormData(prev => {
      const newFields = { ...prev.fields };
      const field = newFields[oldKey];
      delete newFields[oldKey];
      newFields[newKey] = field;
      return {
        ...prev,
        fields: newFields,
      };
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-6 p-6"
        >
          {/* Schema Metadata */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Schema Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="schema-id" className="block text-sm font-medium text-gray-700">
                  Schema ID *
                </label>
                <input
                  type="text"
                  id="schema-id"
                  value={formData.id}
                  onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., blog-post"
                />
                {errors.id && <p className="mt-1 text-sm text-red-600">{errors.id}</p>}
              </div>

              <div>
                <label htmlFor="schema-name" className="block text-sm font-medium text-gray-700">
                  Display Name *
                </label>
                <input
                  type="text"
                  id="schema-name"
                  value={formData.metadata?.name || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, name: e.target.value },
                    }))
                  }
                  className={`mt-1 block w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Blog Post"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
            </div>

            <div>
              <label
                htmlFor="schema-description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="schema-description"
                rows={3}
                value={formData.metadata?.description || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, description: e.target.value },
                  }))
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this content type is used for..."
              />
            </div>

            <div>
              <label htmlFor="schema-category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="schema-category"
                value={formData.metadata?.category || 'content'}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, category: e.target.value },
                  }))
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="content">Content</option>
                <option value="page">Page</option>
                <option value="blog">Blog</option>
                <option value="product">Product</option>
                <option value="portfolio">Portfolio</option>
                <option value="documentation">Documentation</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Fields Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Fields</h3>
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Add Field
              </button>
            </div>

            {errors.fields && <p className="mb-4 text-sm text-red-600">{errors.fields}</p>}

            <div className="space-y-4">
              {Object.entries(formData.fields || {}).map(([fieldKey, field]) => (
                <div key={fieldKey} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Field Key</label>
                      <input
                        type="text"
                        value={fieldKey}
                        onChange={e => renameField(fieldKey, e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="field_name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={field.type}
                        onChange={e => updateField(fieldKey, { type: e.target.value as any })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {FIELD_TYPES.map(type => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Label</label>
                      <input
                        type="text"
                        value={field.label || ''}
                        onChange={e => updateField(fieldKey, { label: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Display label"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={e => updateField(fieldKey, { required: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">Required</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.hidden || false}
                          onChange={e => updateField(fieldKey, { hidden: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">Hidden</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeField(fieldKey)}
                      className="text-red-600 hover:text-red-500"
                      title="Remove field"
                    >
                      <svg
                        className="w-5 h-5"
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

                  {field.description && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={field.description}
                        onChange={e => updateField(fieldKey, { description: e.target.value })}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Field description"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {schema ? 'Update Schema' : 'Create Schema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
