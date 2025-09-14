'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { type GitCMSSchema, type FieldDefinition, defaultValidationEngine } from '@gitcms/core';
import { FieldRenderer, SchemaRenderingProvider } from './field-components';
import { useRepoSchemas } from '../../lib/api-hooks';
import { LoadingSpinner } from '../ui/loading';

export interface SchemaFormProps {
  schema: GitCMSSchema;
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void;
  onSave?: (data: Record<string, any>) => void;
  onChange?: (data: Record<string, any>) => void;
  disabled?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
  showValidation?: boolean;
  submitLabel?: string;
  saveLabel?: string;
  onSaveSuccess?: () => void; // Callback when save is successful
  showIdField?: boolean; // Show custom ID field for content creation
  externalErrors?: Record<string, string>; // External field errors (e.g., from API)
  repoInfo?: { owner: string; repo: string } | null; // Repository info for fetching schemas
}

export interface ValidationError {
  field: string;
  message: string;
}

export function SchemaForm({
  schema,
  initialData = {},
  onSubmit,
  onSave,
  onChange,
  disabled = false,
  autoSave = false,
  autoSaveDelay = 2000,
  showValidation = true,
  submitLabel = 'Submit',
  saveLabel = 'Save',
  onSaveSuccess,
  showIdField = false,
  externalErrors = {},
  repoInfo,
}: SchemaFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save related state
  const lastSavedData = useRef<Record<string, any>>(initialData);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Use cached hook for schema fetching
  const {
    data: availableSchemasData,
    loading: schemasLoading,
    error: schemasError,
  } = useRepoSchemas(repoInfo?.owner || '', repoInfo?.repo || '', {
    enabled: !!repoInfo?.owner && !!repoInfo?.repo,
  });

  // Ensure availableSchemas is always an array
  const availableSchemas = availableSchemasData || [];

  // Update form data when initialData changes (e.g., when content loads from API)
  useEffect(() => {
    // Update form data when initialData is provided and has content
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
      lastSavedData.current = initialData;
    }
  }, [initialData]);

  // Merge external errors with internal errors
  const allErrors = useMemo(() => {
    return { ...errors, ...externalErrors };
  }, [errors, externalErrors]);

  // Clear external errors when user starts typing in that field
  useEffect(() => {
    if (Object.keys(externalErrors).length > 0) {
      // Clear external errors when form data changes
      const timer = setTimeout(() => {
        // This will be handled by the parent component
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [formData, externalErrors]);

  // Helper function to check if data has changed
  const hasDataChanged = useCallback((newData: Record<string, any>) => {
    return JSON.stringify(newData) !== JSON.stringify(lastSavedData.current);
  }, []);

  // Function to mark data as saved (called after successful save)
  const markAsSaved = useCallback(() => {
    lastSavedData.current = { ...formData };
    if (onSaveSuccess) {
      onSaveSuccess();
    }
  }, [formData, onSaveSuccess]);

  // Auto-save effect - separate from the main update effect
  useEffect(() => {
    if (!autoSave || !onSave || !hasDataChanged(formData)) {
      return;
    }

    // Clear any existing timeout
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeout.current = setTimeout(() => {
      setIsSaving(true);
      lastSavedData.current = { ...formData };
      onSave(formData);
      setTimeout(() => setIsSaving(false), 500);
    }, autoSaveDelay);

    // Cleanup function
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [formData, autoSave, onSave, autoSaveDelay, hasDataChanged]);

  // Helper function to get field error (including nested errors)
  const getFieldError = useCallback(
    (fieldKey: string): string | undefined => {
      if (!touched[fieldKey]) return undefined;

      // First check for direct field error
      if (allErrors[fieldKey]) {
        return allErrors[fieldKey];
      }

      // For object fields, collect nested errors
      const nestedErrors = Object.entries(allErrors)
        .filter(([errorKey]) => errorKey.startsWith(`${fieldKey}.`))
        .map(([, errorMessage]) => errorMessage);

      if (nestedErrors.length > 0) {
        return nestedErrors[0]; // Return first nested error for simplicity
      }

      return undefined;
    },
    [touched, allErrors]
  );

  // Group fields by group property
  const fieldGroups = useMemo(() => {
    const groups: Record<string, Array<[string, FieldDefinition]>> = { '': [] };

    Object.entries(schema.fields).forEach(([key, field]) => {
      const group = field.group || '';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push([key, field]);
    });

    // Sort fields within each group by order
    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => {
        const aOrder = a[1].order || 0;
        const bOrder = b[1].order || 0;
        return aOrder - bOrder;
      });
    });

    return groups;
  }, [schema.fields]);

  // Validate the entire form
  const validateForm = useCallback(async () => {
    if (!showValidation) return { valid: true, errors: {} };

    try {
      const result = await defaultValidationEngine.validateContent(
        formData,
        schema,
        'create',
        availableSchemas
      );

      if (result.valid) {
        setErrors({});
        return { valid: true, errors: {} };
      } else {
        const fieldErrors: Record<string, string> = {};
        result.errors?.forEach(error => {
          // Use the path array to create nested field keys, or fall back to field name
          const fieldKey = error.path && error.path.length > 0 ? error.path.join('.') : error.field;
          fieldErrors[fieldKey] = error.message;
        });
        setErrors(fieldErrors);
        return { valid: false, errors: fieldErrors };
      }
    } catch (error) {
      console.error('Validation error:', error);
      return { valid: false, errors: { _form: 'Validation failed' } };
    }
  }, [formData, schema, showValidation, availableSchemas]);

  // Handle field value changes
  const handleFieldChange = useCallback(
    (fieldKey: string, value: any) => {
      const newData = { ...formData, [fieldKey]: value };
      setFormData(newData);
      setTouched(prev => ({ ...prev, [fieldKey]: true }));

      // Clear field error when user starts typing
      if (allErrors[fieldKey]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldKey];
          return newErrors;
        });
      }

      // Call onChange if provided
      onChange?.(newData);
    },
    [formData, allErrors, onChange]
  );

  // Handle metadata field changes (like custom ID)
  const handleMetadataChange = useCallback(
    (metaKey: string, value: any) => {
      const newData = {
        ...formData,
        _metadata: {
          ...formData._metadata,
          [metaKey]: value,
        },
      };
      setFormData(newData);
      setTouched(prev => ({ ...prev, [`_metadata.${metaKey}`]: true }));

      // Clear field error when user starts typing
      if (allErrors[`_metadata.${metaKey}`]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`_metadata.${metaKey}`];
          return newErrors;
        });
      }

      // Call onChange if provided
      onChange?.(newData);
    },
    [formData, allErrors, onChange]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (disabled || isSubmitting) return;

      setIsSubmitting(true);

      try {
        const validation = await validateForm();

        if (validation.valid) {
          await onSubmit?.(formData);
        } else {
          // Mark all fields as touched to show validation errors
          const allFields = Object.keys(schema.fields);
          setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
        }
      } catch (error) {
        console.error('Submit error:', error);
        setErrors(prev => ({ ...prev, _form: 'Submission failed' }));
      } finally {
        setIsSubmitting(false);
      }
    },
    [disabled, isSubmitting, validateForm, onSubmit, formData, schema.fields]
  );

  // Handle save (draft)
  const handleSave = useCallback(async () => {
    if (disabled || isSaving || !onSave) return;

    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [disabled, isSaving, onSave, formData]);

  // Add keyboard shortcut for manual save (Ctrl+S / Cmd+S)
  useEffect(() => {
    if (!autoSave && onSave) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [autoSave, onSave, handleSave]);

  // Get default value for a field
  const getDefaultValue = useCallback((field: FieldDefinition) => {
    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    switch (field.type) {
      case 'string':
      case 'text':
      case 'email':
      case 'url':
      case 'color':
      case 'rich-text':
        return '';
      case 'number':
        return field.required ? 0 : undefined;
      case 'boolean':
        return false;
      case 'date':
      case 'datetime':
        return '';
      case 'array':
        return [];
      case 'object':
        return {};
      case 'select':
        return '';
      case 'multi-select':
        return [];
      default:
        return null;
    }
  }, []);

  // Initialize form data with default values
  React.useEffect(() => {
    const defaultData: Record<string, any> = {};
    Object.entries(schema.fields).forEach(([key, field]) => {
      if (!(key in initialData)) {
        defaultData[key] = getDefaultValue(field);
      }
    });

    if (Object.keys(defaultData).length > 0) {
      setFormData(prev => ({ ...defaultData, ...prev }));
    }
  }, [schema.fields, initialData, getDefaultValue]);

  return (
    <SchemaRenderingProvider>
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{schema.metadata.name}</h2>
                {schema.metadata.description && (
                  <p className="text-sm text-gray-600 mt-1">{schema.metadata.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {isSaving && (
                  <span className="text-sm text-green-600 flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </span>
                )}
                {autoSave ? (
                  <span className="text-xs text-gray-500">Auto-save enabled</span>
                ) : (
                  <span className="text-xs text-gray-500">Manual save • Press Ctrl+S to save</span>
                )}
              </div>
            </div>
          </div>

          {/* Show loading state for schemas if needed */}
          {schemasLoading && repoInfo && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-sm text-blue-700">Loading schema references...</span>
            </div>
          )}

          {/* Show error state for schemas if failed */}
          {schemasError && repoInfo && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-200">
              <p className="text-sm text-red-600">
                Failed to load schema references: {schemasError.message}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
            {/* Form-level errors */}
            {allErrors._form && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{allErrors._form}</p>
              </div>
            )}

            {/* Custom ID field for content creation */}
            {showIdField && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Content ID
                    <span className="text-gray-500 ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData._metadata?.id || ''}
                    onChange={e => handleMetadataChange('id', e.target.value)}
                    placeholder="e.g., my-awesome-post (leave empty to auto-generate)"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      allErrors['_metadata.id'] ? 'border-red-500' : ''
                    }`}
                    disabled={disabled}
                  />
                  {allErrors['_metadata.id'] && (
                    <p className="text-sm text-red-600">{allErrors['_metadata.id']}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Used as the filename for your content. Must contain only letters, numbers,
                    hyphens, and underscores. If not provided, an ID will be automatically generated
                    from the title or other fields.
                  </p>
                </div>
              </div>
            )}

            {/* Render field groups */}
            {Object.entries(fieldGroups).map(([groupName, fields]) => (
              <div key={groupName} className="space-y-6">
                {groupName && (
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-md font-medium text-gray-900">{groupName}</h3>
                  </div>
                )}

                <div className="space-y-6">
                  {fields.map(([fieldKey, field]) => (
                    <div key={fieldKey} className="space-y-2">
                      <FieldRenderer
                        field={field}
                        value={formData[fieldKey]}
                        onChange={value => handleFieldChange(fieldKey, value)}
                        error={getFieldError(fieldKey)}
                        disabled={disabled}
                        availableSchemas={availableSchemas}
                        allErrors={allErrors}
                        fieldPath={fieldKey}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Form actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
              <div className="text-sm text-gray-500">
                {Object.keys(touched).length > 0 && (
                  <span>
                    {Object.keys(errors).length === 0 ? (
                      <span className="text-green-600">✓ Form is valid</span>
                    ) : (
                      <span className="text-red-600">
                        {Object.keys(errors).length} error
                        {Object.keys(errors).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="flex space-x-3">
                {onSave && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled || isSaving}
                    className={`px-4 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      !autoSave
                        ? 'border-blue-600 text-white bg-blue-600 hover:bg-blue-700'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <svg
                          className={`animate-spin -ml-1 mr-2 h-4 w-4 ${!autoSave ? 'text-white' : 'text-gray-600'}`}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      saveLabel
                    )}
                  </button>
                )}

                {onSubmit && (
                  <button
                    type="submit"
                    disabled={disabled || isSubmitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      submitLabel
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </SchemaRenderingProvider>
  );
}

// Hook for form state management
export function useSchemaForm(schema: GitCMSSchema, initialData: Record<string, any> = {}) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const updateField = useCallback((fieldKey: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
    setIsDirty(true);
  }, []);

  const reset = useCallback(
    (data: Record<string, any> = initialData) => {
      setFormData(data);
      setErrors({});
      setIsDirty(false);
    },
    [initialData]
  );

  const validate = useCallback(async () => {
    try {
      const result = await defaultValidationEngine.validateContent(formData, schema);

      if (result.valid) {
        setErrors({});
        return { valid: true, errors: {} };
      } else {
        const fieldErrors: Record<string, string> = {};
        result.errors?.forEach(error => {
          fieldErrors[error.field] = error.message;
        });
        setErrors(fieldErrors);
        return { valid: false, errors: fieldErrors };
      }
    } catch (error) {
      return { valid: false, errors: { _form: 'Validation failed' } };
    }
  }, [formData, schema]);

  return {
    formData,
    errors,
    isDirty,
    updateField,
    reset,
    validate,
    setFormData,
    setErrors,
  };
}
