'use client';

import { useState, useEffect } from 'react';
import type { GitCMSSchema, FieldDefinition, FieldType } from '@gitcms/core';
import { SchemaReferenceSelector } from './schema-reference-selector';
import { useRegistrySchemas, useRepoSchemas } from '../../lib/api-hooks';
import { ProgressiveLoading } from '../ui/loading';
import { CategoryManager } from './category-manager';
import { useCategories } from '@/hooks/use-categories';

// Extended object field definition to support schema references
interface ObjectFieldWithSchemaRef {
  type: 'object';
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  hidden?: boolean;
  readonly?: boolean;
  group?: string;
  order?: number;
  properties?: Record<string, FieldDefinition>;
  schemaRef?: string; // Reference to another schema ID
}

interface SchemaEditorProps {
  schema?: GitCMSSchema;
  onSave: (schema: GitCMSSchema) => void;
  onCancel: () => void;
  repoInfo?: { owner: string; repo: string } | null;
  onSchemaListChange?: () => void; // Callback to trigger schema list refresh
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
  'rich-text',
  'select',
  'color',
  'reference',
] as const;
type FieldTypeValue = (typeof FIELD_TYPES)[number];

// Predefined validation patterns
const VALIDATION_PATTERNS = [
  {
    label: 'None (No validation)',
    value: '',
    description: 'No pattern validation',
  },
  {
    label: 'Email',
    value: '^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$',
    description: 'Valid email address format',
  },
  {
    label: 'URL',
    value: '^https?://.*$',
    description: 'Valid URL starting with http:// or https://',
  },
  {
    label: 'Phone (US)',
    value: '^\\+?1?[-.\\s]?\\(?[0-9]{3}\\)?[-.\\s]?[0-9]{3}[-.\\s]?[0-9]{4}$',
    description: 'US phone number format',
  },
  {
    label: 'Slug',
    value: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    description: 'URL-friendly slug (lowercase, hyphens)',
  },
  {
    label: 'Alphanumeric',
    value: '^[a-zA-Z0-9]+$',
    description: 'Only letters and numbers',
  },
  {
    label: 'Alphanumeric + Spaces',
    value: '^[a-zA-Z0-9\\s]+$',
    description: 'Letters, numbers, and spaces',
  },
  {
    label: 'Custom',
    value: 'custom',
    description: 'Enter your own regex pattern',
  },
] as const;

// Helper function to get validation rule for pattern
const getValidationRuleForPattern = (patternValue: string, patternLabel: string) => {
  if (!patternValue || patternValue === 'custom') return null;

  const pattern = VALIDATION_PATTERNS.find(p => p.value === patternValue);
  return {
    type: 'pattern' as const,
    value: patternValue,
    message: pattern ? `Must match ${pattern.label.toLowerCase()} format` : 'Invalid format',
  };
};

export function SchemaEditor({
  schema,
  onSave,
  onCancel,
  repoInfo,
  onSchemaListChange,
}: SchemaEditorProps) {
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
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState<Record<string, boolean>>({});
  const [editingFieldNames, setEditingFieldNames] = useState<Record<string, string>>({});
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  // Category management
  const { categories, updateCategories } = useCategories();

  // Use cached hooks for schema fetching
  const { data: registrySchemas = [], loading: registryLoading } = useRegistrySchemas();

  const { data: repoSchemas = [], loading: repoLoading } = useRepoSchemas(
    repoInfo?.owner || null,
    repoInfo?.repo || null,
    { fallbackToRegistry: true }
  );

  // Determine which schemas to use (repo schemas with registry fallback)
  const availableSchemas = repoInfo ? repoSchemas : registrySchemas;
  const schemasLoading = repoInfo ? repoLoading : registryLoading;

  useEffect(() => {
    if (schema) {
      setFormData({ ...schema });
      // Initialize advanced settings state for existing fields
      const initialAdvancedSettings: Record<string, boolean> = {};
      Object.keys(schema.fields || {}).forEach(fieldKey => {
        initialAdvancedSettings[fieldKey] = false;
      });
      setAdvancedSettingsOpen(initialAdvancedSettings);
    }
  }, [schema]);

  // Real-time ID validation
  const validateSchemaId = (newId: string): string | null => {
    if (!newId.trim()) {
      return null; // Don't show error for empty field until form submission
    }

    if (!/^[a-z0-9-]+$/.test(newId)) {
      return 'Schema ID must contain only lowercase letters, numbers, and hyphens';
    }

    // Check for ID conflicts with existing schemas (only when creating or changing ID)
    const isNewSchema = !schema || schema.id !== newId;
    if (isNewSchema && availableSchemas) {
      const existingSchema = availableSchemas.find(s => s.id === newId);
      if (existingSchema) {
        return `A schema with ID "${newId}" already exists. Please choose a different ID.`;
      }
    }

    return null;
  };

  const handleIdChange = (newId: string) => {
    setFormData(prev => ({ ...prev, id: newId }));

    // Update real-time validation
    const idError = validateSchemaId(newId);
    setErrors(prev => ({
      ...prev,
      id: idError || '',
    }));
  };

  // Helper function to get available schemas for object field references
  const getAvailableSchemas = (): Array<{ id: string; name: string }> => {
    // Filter out the current schema to prevent direct self-reference
    return (availableSchemas || [])
      .filter(schema => schema.id !== formData.id)
      .map(schema => ({
        id: schema.id,
        name: schema.metadata?.name || schema.id,
      }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = 'Schema ID is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = 'Schema ID must contain only lowercase letters, numbers, and hyphens';
    } else {
      // Check for ID conflicts with existing schemas (only when creating or changing ID)
      const isNewSchema = !schema || schema.id !== formData.id;
      if (isNewSchema && availableSchemas) {
        const existingSchema = availableSchemas.find(s => s.id === formData.id);
        if (existingSchema) {
          newErrors.id = `A schema with ID "${formData.id}" already exists. Please choose a different ID.`;
        }
      }
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

      // Validate object field schema references
      if (field.type === 'object') {
        const fieldObj = field as any;
        if (fieldObj.schemaRef) {
          const availableSchemas = getAvailableSchemas();
          const schemaExists = availableSchemas.some(schema => schema.id === fieldObj.schemaRef);
          if (!schemaExists) {
            newErrors[`field-${fieldKey}-schemaRef`] =
              'Referenced schema does not exist or would create circular dependency';
          }
        }
        // Note: We allow object fields without schemaRef (they can use inline properties)
      }

      // Validate array items that are objects
      if (field.type === 'array') {
        const arrayField = field as any;
        if (arrayField.items?.type === 'object' && arrayField.items?.schemaRef) {
          const availableSchemas = getAvailableSchemas();
          const schemaExists = availableSchemas.some(
            schema => schema.id === arrayField.items.schemaRef
          );
          if (!schemaExists) {
            newErrors[`field-${fieldKey}-items-schemaRef`] =
              'Referenced schema for array items does not exist';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      // Trigger schema list refresh after save
      if (onSchemaListChange) {
        onSchemaListChange();
      }
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
    setAdvancedSettingsOpen(prev => ({
      ...prev,
      [fieldKey]: false,
    }));
  };

  const toggleAdvancedSettings = (fieldKey: string) => {
    setAdvancedSettingsOpen(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }));
  };

  const renderAdvancedSettings = (fieldKey: string, field: FieldDefinition) => {
    const isOpen = advancedSettingsOpen[fieldKey] || false;

    return (
      <div className="mt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => toggleAdvancedSettings(fieldKey)}
          className="flex items-center justify-between w-full pt-3 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>Advanced Settings</span>
          <svg
            className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="mt-3 space-y-3">
            {/* Description - common to all fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={2}
                value={field.description || ''}
                onChange={e => updateField(fieldKey, { description: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Field description or help text"
              />
            </div>

            {/* Placeholder - common to input fields */}
            {['string', 'text', 'number'].includes(field.type) && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Placeholder</label>
                <input
                  type="text"
                  value={(field as any).placeholder || ''}
                  onChange={e => updateField(fieldKey, { placeholder: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Placeholder text"
                />
              </div>
            )}

            {/* Default Value */}
            {!['array', 'object', 'media', 'rich-text', 'reference', 'select'].includes(
              field.type
            ) && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Default Value</label>
                {field.type === 'boolean' ? (
                  <select
                    value={field.defaultValue === undefined ? '' : field.defaultValue.toString()}
                    onChange={e =>
                      updateField(fieldKey, {
                        defaultValue: e.target.value === '' ? undefined : e.target.value === 'true',
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No default</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={field.defaultValue || ''}
                    onChange={e =>
                      updateField(fieldKey, {
                        defaultValue: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Default value"
                  />
                ) : field.type === 'color' ? (
                  <input
                    type="color"
                    value={field.defaultValue || '#000000'}
                    onChange={e => updateField(fieldKey, { defaultValue: e.target.value })}
                    className="mt-1 block w-20 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    value={field.defaultValue || ''}
                    onChange={e =>
                      updateField(fieldKey, { defaultValue: e.target.value || undefined })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : field.type === 'datetime' ? (
                  <input
                    type="datetime-local"
                    value={field.defaultValue || ''}
                    onChange={e =>
                      updateField(fieldKey, { defaultValue: e.target.value || undefined })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={field.defaultValue || ''}
                    onChange={e =>
                      updateField(fieldKey, { defaultValue: e.target.value || undefined })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Default value"
                  />
                )}
              </div>
            )}

            {/* Type-specific settings */}
            {renderTypeSpecificSettings(fieldKey, field)}
          </div>
        )}
      </div>
    );
  };

  const renderFieldTypeSettings = (
    field: any,
    updateCallback: (updates: any) => void
  ): React.ReactNode => {
    switch (field.type) {
      case 'string':
      case 'text':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Min Length</label>
                <input
                  type="number"
                  value={field.minLength || ''}
                  onChange={e =>
                    updateCallback({
                      minLength: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Length</label>
                <input
                  type="number"
                  value={field.maxLength || ''}
                  onChange={e =>
                    updateCallback({
                      maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Validation Pattern</label>
              <select
                value={
                  field.pattern
                    ? VALIDATION_PATTERNS.find(p => p.value === field.pattern)?.value || 'custom'
                    : ''
                }
                onChange={e => {
                  const selectedPattern = e.target.value;
                  if (selectedPattern === '') {
                    updateCallback({ pattern: undefined });
                  } else if (selectedPattern === 'custom') {
                    // Keep existing pattern but user can now edit it
                    return;
                  } else {
                    // Set the pattern and add validation rule
                    const validationRule = getValidationRuleForPattern(
                      selectedPattern,
                      VALIDATION_PATTERNS.find(p => p.value === selectedPattern)?.label || ''
                    );
                    const currentValidation = field.validation || [];

                    // Remove any existing pattern validation
                    const filteredValidation = currentValidation.filter(
                      (rule: any) => rule.type !== 'pattern'
                    );

                    // Add new pattern validation if we have one
                    const newValidation = validationRule
                      ? [...filteredValidation, validationRule]
                      : filteredValidation;

                    updateCallback({
                      pattern: selectedPattern,
                      validation: newValidation.length > 0 ? newValidation : undefined,
                    });
                  }
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {VALIDATION_PATTERNS.map(pattern => (
                  <option key={pattern.value} value={pattern.value}>
                    {pattern.label}
                  </option>
                ))}
              </select>

              {/* Show custom pattern input when custom is selected or when there's a pattern that doesn't match presets */}
              {field.pattern &&
                !VALIDATION_PATTERNS.find(
                  p => p.value === field.pattern && p.value !== 'custom'
                ) && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Custom Pattern (RegEx)
                    </label>
                    <input
                      type="text"
                      value={field.pattern || ''}
                      onChange={e => updateCallback({ pattern: e.target.value || undefined })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your custom regex pattern"
                    />
                  </div>
                )}

              {/* Show description for selected pattern */}
              {field.pattern && (
                <p className="mt-1 text-xs text-gray-500">
                  {VALIDATION_PATTERNS.find(p => p.value === field.pattern)?.description ||
                    'Custom validation pattern'}
                </p>
              )}
            </div>
          </>
        );

      case 'number':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum</label>
                <input
                  type="number"
                  value={field.min ?? ''}
                  onChange={e =>
                    updateCallback({
                      min: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="any"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum</label>
                <input
                  type="number"
                  value={field.max ?? ''}
                  onChange={e =>
                    updateCallback({
                      max: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="any"
                />
              </div>
            </div>
            <div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Precision</label>
                <input
                  type="number"
                  value={field.precision || ''}
                  onChange={e =>
                    updateCallback({
                      precision: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>
          </>
        );

      case 'date':
      case 'datetime':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Min Date</label>
              <input
                type={field.type === 'datetime' ? 'datetime-local' : 'date'}
                value={field.min || ''}
                onChange={e => updateCallback({ min: e.target.value || undefined })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Date</label>
              <input
                type={field.type === 'datetime' ? 'datetime-local' : 'date'}
                value={field.max || ''}
                onChange={e => updateCallback({ max: e.target.value || undefined })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'media':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max File Size (MB)</label>
              <input
                type="number"
                value={field.maxSize || ''}
                onChange={e =>
                  updateCallback({
                    maxSize: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Accepted File Types</label>
              <input
                type="text"
                value={field.accept?.join(', ') || ''}
                onChange={e =>
                  updateCallback({
                    accept: e.target.value
                      ? e.target.value.split(',').map((s: string) => s.trim())
                      : undefined,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., .jpg, .png, .pdf"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={field.multiple || false}
                  onChange={e => updateCallback({ multiple: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Allow multiple files</span>
              </label>
            </div>
          </>
        );

      case 'rich-text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Length</label>
            <input
              type="number"
              value={field.maxLength || ''}
              onChange={e =>
                updateCallback({
                  maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
        );

      case 'select':
        return (
          <>
            <div>
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={field.multiple || false}
                  onChange={e => updateCallback({ multiple: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Allow multiple selections</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <div className="space-y-2">
                {(field.options || []).map((option: any, index: number) => {
                  // Normalize option to object format
                  const optionObj =
                    typeof option === 'string' ? { label: option, value: option } : option;

                  return (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={optionObj.label || ''}
                        onChange={e => {
                          const newOptions = [...(field.options || [])];
                          newOptions[index] = {
                            label: e.target.value,
                            value: e.target.value,
                          };
                          updateCallback({ options: newOptions });
                        }}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Option value"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = [...(field.options || [])];
                          newOptions.splice(index, 1);
                          updateCallback({ options: newOptions });
                        }}
                        className="px-3 py-2 text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const newOptions = [...(field.options || [])];
                    const newOptionValue = `option-${newOptions.length + 1}`;
                    const newOption = {
                      label: newOptionValue,
                      value: newOptionValue,
                    };
                    newOptions.push(newOption);
                    updateCallback({ options: newOptions });
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Option
                </button>
              </div>
            </div>
            {field.multiple && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Selections</label>
                  <input
                    type="number"
                    value={field.minSelections || ''}
                    onChange={e =>
                      updateCallback({
                        minSelections: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Selections</label>
                  <input
                    type="number"
                    value={field.maxSelections || ''}
                    onChange={e =>
                      updateCallback({
                        maxSelections: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>
            )}
          </>
        );

      case 'reference':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Collection</label>
              <select
                value={field.collection || ''}
                onChange={e => updateCallback({ collection: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a collection...</option>
                {repoSchemas?.map(schema => (
                  <option key={schema.id} value={schema.id}>
                    {schema.metadata.name} ({schema.id})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose from available schemas/collections in this repository
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Field</label>
              <input
                type="text"
                value={field.displayField || ''}
                onChange={e => updateCallback({ displayField: e.target.value || undefined })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Field to display (e.g., title)"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={field.multiple || false}
                  onChange={e => updateCallback({ multiple: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Allow multiple selections</span>
              </label>
            </div>
          </>
        );

      case 'object': {
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schema Reference
              </label>
              <SchemaReferenceSelector
                currentSchemaId={formData.id}
                availableSchemas={availableSchemas || []}
                selectedSchemaRef={field.schemaRef}
                onSchemaRefChange={schemaRef =>
                  updateCallback({ schemaRef: schemaRef || undefined })
                }
                disabled={schemasLoading}
                placeholder={
                  schemasLoading ? 'Loading schemas...' : 'Select a schema to reference...'
                }
              />
            </div>
            {field.schemaRef && !schemasLoading && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Referenced Schema:</strong>{' '}
                  {(availableSchemas || []).find(s => s.id === field.schemaRef)?.metadata?.name ||
                    field.schemaRef}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Objects using this field will follow the structure defined in the "
                  {field.schemaRef}" schema.
                </p>
              </div>
            )}
            {!field.schemaRef && !schemasLoading && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>Alternative:</strong> Define inline properties
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Without a schema reference, you can define this object's structure using inline
                  properties (not yet implemented in this UI).
                </p>
              </div>
            )}
          </>
        );
      }

      case 'color':
        return null;

      default:
        return null;
    }
  };

  const renderTypeSpecificSettings = (fieldKey: string, field: FieldDefinition) => {
    if (field.type === 'array') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">Item Type</label>
            <select
              value={(field as any).items?.type || 'string'}
              onChange={e => {
                const newItemType = e.target.value;
                const updates: any = {
                  items: {
                    ...(field as any).items,
                    type: newItemType,
                    label: (field as any).items?.label || 'Item',
                  },
                };

                // Add required properties for specific item types
                switch (newItemType) {
                  case 'object':
                    updates.items.properties = {};
                    updates.items.schemaRef = undefined; // Initialize as undefined, user will select
                    break;
                  case 'select':
                    updates.items.options = [{ label: 'option-1', value: 'option-1' }];
                    break;
                  case 'reference':
                    updates.items.collection = '';
                    break;
                  case 'color':
                    updates.items.defaultValue = '#000000';
                    break;
                }

                updateField(fieldKey, updates);
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FIELD_TYPES.filter(type => type !== 'array').map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Item type specific configuration */}
          {(field as any).items?.type && (
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Item Configuration ({(field as any).items.type})
              </h4>
              <div className="space-y-3">
                {/* Description - common to all item types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Item Description
                  </label>
                  <textarea
                    rows={2}
                    value={(field as any).items?.description || ''}
                    onChange={e =>
                      updateField(fieldKey, {
                        items: {
                          ...(field as any).items,
                          description: e.target.value,
                        },
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description for array items"
                  />
                </div>

                {/* Placeholder - for input item types */}
                {['string', 'text', 'number'].includes((field as any).items?.type) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Item Placeholder
                    </label>
                    <input
                      type="text"
                      value={(field as any).items?.placeholder || ''}
                      onChange={e =>
                        updateField(fieldKey, {
                          items: {
                            ...(field as any).items,
                            placeholder: e.target.value,
                          },
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Placeholder text for items"
                    />
                  </div>
                )}

                {/* Default Value - for appropriate item types */}
                {!['array', 'object', 'file', 'rich-text', 'reference', 'select'].includes(
                  (field as any).items?.type
                ) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Item Default Value
                    </label>
                    {(field as any).items?.type === 'boolean' ? (
                      <select
                        value={
                          (field as any).items?.defaultValue === undefined
                            ? ''
                            : (field as any).items?.defaultValue?.toString()
                        }
                        onChange={e =>
                          updateField(fieldKey, {
                            items: {
                              ...(field as any).items,
                              defaultValue:
                                e.target.value === '' ? undefined : e.target.value === 'true',
                            },
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No default</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : (field as any).items?.type === 'number' ? (
                      <input
                        type="number"
                        value={(field as any).items?.defaultValue || ''}
                        onChange={e =>
                          updateField(fieldKey, {
                            items: {
                              ...(field as any).items,
                              defaultValue: e.target.value ? parseFloat(e.target.value) : undefined,
                            },
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Default value for items"
                      />
                    ) : (field as any).items?.type === 'color' ? (
                      <input
                        type="color"
                        value={(field as any).items?.defaultValue || '#000000'}
                        onChange={e =>
                          updateField(fieldKey, {
                            items: {
                              ...(field as any).items,
                              defaultValue: e.target.value,
                            },
                          })
                        }
                        className="mt-1 block w-20 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (field as any).items?.type === 'date' ? (
                      <input
                        type="date"
                        value={(field as any).items?.defaultValue || ''}
                        onChange={e =>
                          updateField(fieldKey, {
                            items: {
                              ...(field as any).items,
                              defaultValue: e.target.value || undefined,
                            },
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (field as any).items?.type === 'datetime' ? (
                      <input
                        type="datetime-local"
                        value={(field as any).items?.defaultValue || ''}
                        onChange={e =>
                          updateField(fieldKey, {
                            items: {
                              ...(field as any).items,
                              defaultValue: e.target.value || undefined,
                            },
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={(field as any).items?.defaultValue || ''}
                        onChange={e =>
                          updateField(fieldKey, {
                            items: {
                              ...(field as any).items,
                              defaultValue: e.target.value || undefined,
                            },
                          })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Default value for items"
                      />
                    )}
                  </div>
                )}

                {/* Type-specific settings */}
                {(field as any).items?.type !== 'boolean' &&
                  renderFieldTypeSettings((field as any).items, (updates: any) =>
                    updateField(fieldKey, {
                      items: {
                        ...(field as any).items,
                        ...updates,
                      },
                    })
                  )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Min Items</label>
              <input
                type="number"
                value={(field as any).minItems || ''}
                onChange={e =>
                  updateField(fieldKey, {
                    minItems: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Items</label>
              <input
                type="number"
                value={(field as any).maxItems || ''}
                onChange={e =>
                  updateField(fieldKey, {
                    maxItems: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={(field as any).uniqueItems || false}
                onChange={e => updateField(fieldKey, { uniqueItems: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Unique items only</span>
            </label>
          </div>
        </>
      );
    }

    return renderFieldTypeSettings(field, (updates: any) => updateField(fieldKey, updates));
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
    setAdvancedSettingsOpen(prev => {
      const newState = { ...prev };
      delete newState[fieldKey];
      return newState;
    });
    setEditingFieldNames(prev => {
      const newState = { ...prev };
      delete newState[fieldKey];
      return newState;
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

  const handleFieldTypeChange = (fieldKey: string, newType: string) => {
    const updates: any = { type: newType };

    // Add required properties for specific field types
    switch (newType) {
      case 'array':
        updates.items = {
          type: 'string',
          label: 'Item',
        };
        break;
      case 'object':
        updates.properties = {};
        updates.schemaRef = undefined; // Initialize as undefined, user will select
        break;
      case 'select':
        updates.options = [{ label: 'option-1', value: 'option-1' }];
        break;
      case 'reference':
        updates.collection = '';
        break;
    }

    updateField(fieldKey, updates);
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

    setAdvancedSettingsOpen(prev => {
      const newState = { ...prev };
      const isOpen = newState[oldKey] || false;
      delete newState[oldKey];
      newState[newKey] = isOpen;
      return newState;
    });

    setEditingFieldNames(prev => {
      const newState = { ...prev };
      // If the old key was being edited, remove it from editing state
      delete newState[oldKey];
      return newState;
    });
  };

  // Helper functions for field name editing
  const startEditingFieldName = (fieldKey: string) => {
    setEditingFieldNames(prev => ({
      ...prev,
      [fieldKey]: fieldKey,
    }));
  };

  const updateEditingFieldName = (originalKey: string, newValue: string) => {
    setEditingFieldNames(prev => ({
      ...prev,
      [originalKey]: newValue,
    }));
  };

  const commitFieldNameChange = (originalKey: string) => {
    const newKey = editingFieldNames[originalKey];
    if (newKey && newKey !== originalKey && newKey.trim()) {
      renameField(originalKey, newKey.trim());
    }
    setEditingFieldNames(prev => {
      const newState = { ...prev };
      delete newState[originalKey];
      return newState;
    });
  };

  const cancelFieldNameEdit = (originalKey: string) => {
    setEditingFieldNames(prev => {
      const newState = { ...prev };
      delete newState[originalKey];
      return newState;
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
                  onChange={e => handleIdChange(e.target.value)}
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
              <div className="flex items-center justify-between">
                <label
                  htmlFor="schema-category"
                  className="block text-sm font-medium text-gray-700"
                >
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setCategoryManagerOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Manage Categories
                </button>
              </div>
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
                {categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.label}
                  </option>
                ))}
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
              {Object.entries(formData.fields || {}).map(([fieldKey, field], index) => (
                <div
                  key={`field-${index}-${fieldKey}`}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Field Key</label>
                      <input
                        type="text"
                        value={editingFieldNames[fieldKey] ?? fieldKey}
                        onFocus={() => startEditingFieldName(fieldKey)}
                        onChange={e => updateEditingFieldName(fieldKey, e.target.value)}
                        onBlur={() => commitFieldNameChange(fieldKey)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          } else if (e.key === 'Escape') {
                            cancelFieldNameEdit(fieldKey);
                            e.currentTarget.blur();
                          }
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="field_name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={field.type}
                        onChange={e => handleFieldTypeChange(fieldKey, e.target.value)}
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

                  {/* Advanced Settings Section */}
                  {renderAdvancedSettings(fieldKey, field)}
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

      {/* Category Manager Modal */}
      <CategoryManager
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        onCategoriesChange={updateCategories}
      />
    </div>
  );
}
