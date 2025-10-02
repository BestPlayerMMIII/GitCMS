'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  createContext,
  useContext,
} from 'react';
import { MediaPickerModal } from '../media/media-picker-modal';
import { File as FileIcon } from 'lucide-react';
import { type FieldDefinition, type FieldOption, type GitCMSSchema } from '@git-cms/core';
import RichTextEditor from './rich-text-editor';

// Context for tracking schema rendering stack to prevent circular dependencies
interface SchemaRenderingContextValue {
  getCurrentStack: () => string[];
  pushSchema: (schemaId: string) => boolean;
  popSchema: (schemaId: string) => void;
}

const SchemaRenderingContext = createContext<SchemaRenderingContextValue | null>(null);

// Provider component to wrap the entire form
export function SchemaRenderingProvider({ children }: { children: React.ReactNode }) {
  const renderingStackRef = useRef<string[]>([]);

  const getCurrentStack = useCallback(() => {
    return [...renderingStackRef.current]; // Return copy to prevent mutations
  }, []);

  const pushSchema = useCallback((schemaId: string): boolean => {
    if (renderingStackRef.current.includes(schemaId)) {
      return false; // Would create circular dependency
    }
    renderingStackRef.current.push(schemaId);
    return true;
  }, []);

  const popSchema = useCallback((schemaId: string) => {
    renderingStackRef.current = renderingStackRef.current.filter(id => id !== schemaId);
  }, []);

  // Static context value to prevent re-renders
  const contextValue = useMemo(
    () => ({
      getCurrentStack,
      pushSchema,
      popSchema,
    }),
    [getCurrentStack, pushSchema, popSchema]
  );

  return (
    <SchemaRenderingContext.Provider value={contextValue}>
      {children}
    </SchemaRenderingContext.Provider>
  );
}

// Hook to access schema rendering context
function useSchemaRenderingContext() {
  const context = useContext(SchemaRenderingContext);
  if (!context) {
    // If no context provided, return a safe default that allows rendering
    return {
      getCurrentStack: () => [],
      pushSchema: () => true,
      popSchema: () => {},
    };
  }
  return context;
}

// Base props for all field components
export interface BaseFieldProps {
  field: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  availableSchemas?: GitCMSSchema[]; // For resolving schema references in object fields
  allErrors?: Record<string, string>; // All form errors for nested error handling
  fieldPath?: string; // Current field path for error resolution
  // Repository info for media integration
  owner?: string;
  repo?: string;
}

// String/Text Field Component
export function StringField({ field, value, onChange, error, disabled }: BaseFieldProps) {
  const stringField = field as any;
  const isTextarea = field.type === 'text';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;

    // Apply formatting
    if (stringField.format === 'lowercase') newValue = newValue.toLowerCase();
    if (stringField.format === 'uppercase') newValue = newValue.toUpperCase();
    if (stringField.format === 'capitalize') {
      newValue = newValue.charAt(0).toUpperCase() + newValue.slice(1).toLowerCase();
    }

    onChange(newValue);
  };

  const inputProps = {
    value: value || '',
    onChange: handleChange,
    placeholder: field.placeholder,
    disabled,
    className: `w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      error ? 'border-red-500' : ''
    }`,
    maxLength: stringField.maxLength,
    minLength: stringField.minLength,
    pattern: stringField.pattern,
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
      {isTextarea ? <textarea {...inputProps} rows={4} /> : <input {...inputProps} type={'text'} />}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {stringField.maxLength && (
        <p className="text-xs text-gray-400">
          {(value || '').length}/{stringField.maxLength} characters
        </p>
      )}
    </div>
  );
}

// Number Field Component
export function NumberField({ field, value, onChange, error, disabled }: BaseFieldProps) {
  const numberField = field as any;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === '' ? undefined : parseFloat(e.target.value);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
      <input
        type="number"
        value={value || ''}
        onChange={handleChange}
        placeholder={field.placeholder}
        disabled={disabled}
        min={numberField.min}
        max={numberField.max}
        step={numberField.step}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : ''
        }`}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Boolean Field Component
export function BooleanField({ field, value, onChange, error, disabled }: BaseFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={value || false}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label className="text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
      {field.description && <p className="text-sm text-gray-500 ml-6">{field.description}</p>}
      {error && <p className="text-sm text-red-500 ml-6">{error}</p>}
    </div>
  );
}

// Date/DateTime Field Component
export function DateField({ field, value, onChange, error, disabled }: BaseFieldProps) {
  const dateField = field as any;
  const inputType = field.type === 'datetime' ? 'datetime-local' : 'date';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value || undefined);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
      <input
        type={inputType}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        min={dateField.min}
        max={dateField.max}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : ''
        }`}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Select Field Component
export function SelectField({ field, value, onChange, error, disabled }: BaseFieldProps) {
  const selectField = field as any;
  const isMultiple = selectField.multiple;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isMultiple) {
      const values = Array.from(e.target.selectedOptions, option => option.value);
      onChange(values);
    } else {
      onChange(e.target.value || undefined);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
      <select
        value={isMultiple ? (Array.isArray(value) ? value : []) : value || ''}
        multiple={isMultiple}
        onChange={handleChange}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : ''
        }`}
      >
        {!isMultiple && !field.required && <option value="">Select an option...</option>}
        {selectField.options?.map((option: any, index: number) => {
          // Handle both string arrays and FieldOption arrays
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;

          return (
            <option key={`${optionValue}-${index}`} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Array Field Component
export function ArrayField({
  field,
  value,
  onChange,
  error,
  disabled,
  availableSchemas,
}: BaseFieldProps) {
  const arrayField = field as any;
  const arrayValue = value || [];

  const addItem = () => {
    if (!arrayField.items) {
      console.warn('Array field items definition is missing:', field);
      // Fallback to string type if items is not defined
      const fallbackItem = { type: 'string', label: 'Item' } as any;
      const newItem = getDefaultValue(fallbackItem);
      onChange([...arrayValue, newItem]);
      return;
    }

    const newItem = getDefaultValue(arrayField.items);
    onChange([...arrayValue, newItem]);
  };

  const removeItem = (index: number) => {
    const newArray = arrayValue.filter((_: any, i: number) => i !== index);
    onChange(newArray);
  };

  const updateItem = (index: number, itemValue: any) => {
    const newArray = [...arrayValue];
    newArray[index] = itemValue;
    onChange(newArray);
  };

  const canAddMore = !arrayField.maxItems || arrayValue.length < arrayField.maxItems;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {canAddMore && (
          <button
            type="button"
            onClick={addItem}
            disabled={disabled}
            className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Add Item
          </button>
        )}
      </div>
      {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
      <div className="space-y-2">
        {arrayValue.map((item: any, index: number) => (
          <div
            key={index}
            className="flex items-start space-x-2 p-3 border border-gray-200 rounded"
          >
            <div className="flex-1">
              {arrayField.items ? (
                <FieldRenderer
                  field={arrayField.items}
                  value={item}
                  onChange={itemValue => updateItem(index, itemValue)}
                  disabled={disabled}
                  availableSchemas={availableSchemas}
                />
              ) : (
                <div className="text-red-500 text-sm">
                  Array items definition is missing. Please check your schema configuration.
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={disabled}
              className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {arrayField.minItems && arrayValue.length < arrayField.minItems && (
        <p className="text-sm text-orange-500">Minimum {arrayField.minItems} items required</p>
      )}
    </div>
  );
}

// Object Field Component
export function ObjectField({
  field,
  value,
  onChange,
  error,
  disabled,
  availableSchemas,
  allErrors,
  fieldPath,
}: BaseFieldProps) {
  const objectField = field as any;
  const objectValue = value || {};

  // Use context for circular dependency protection
  const { getCurrentStack, pushSchema, popSchema } = useSchemaRenderingContext();

  // Memoize schema reference resolution to avoid repeated lookups
  const { properties, circularDependencyError } = useMemo((): {
    properties: Record<string, FieldDefinition>;
    circularDependencyError?: string;
  } => {
    // If there's a schema reference, try to resolve it
    if (objectField.schemaRef && availableSchemas) {
      // Check for circular dependency at runtime
      const currentStack = getCurrentStack();
      if (currentStack.includes(objectField.schemaRef)) {
        const cyclePath = [...currentStack, objectField.schemaRef].join(' → ');
        return {
          properties: {},
          circularDependencyError: `Circular dependency detected: ${cyclePath}`,
        };
      }

      const referencedSchema = availableSchemas.find(schema => schema.id === objectField.schemaRef);
      if (referencedSchema) {
        return { properties: referencedSchema.fields };
      }
    }

    // Fall back to inline properties
    return { properties: objectField.properties || {} };
  }, [objectField.schemaRef, objectField.properties, availableSchemas]);

  // Update rendering stack when rendering schema reference
  useEffect(() => {
    if (objectField.schemaRef && !circularDependencyError) {
      const canPush = pushSchema(objectField.schemaRef);
      if (canPush) {
        return () => {
          popSchema(objectField.schemaRef);
        };
      }
    }
    // Note: pushSchema and popSchema are stable callbacks, don't include in deps
  }, [objectField.schemaRef, circularDependencyError]);

  const updateProperty = (key: string, propValue: any) => {
    onChange({
      ...objectValue,
      [key]: propValue,
    });
  };

  // Helper function to get nested field error
  const getNestedFieldError = (fieldKey: string): string | undefined => {
    if (!allErrors || !fieldPath) return undefined;

    // Look for nested error with the pattern: fieldPath.fieldKey
    const nestedErrorKey = `${fieldPath}.${fieldKey}`;
    return allErrors[nestedErrorKey];
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && <p className="text-sm text-gray-500">{field.description}</p>}

      {/* Show schema reference info if applicable */}
      {objectField.schemaRef && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <span className="text-blue-800">
            <strong>Schema Reference:</strong> {objectField.schemaRef}
            {availableSchemas && !availableSchemas.find(s => s.id === objectField.schemaRef) && (
              <span className="text-red-600 ml-2">(Schema not found)</span>
            )}
          </span>
        </div>
      )}

      <div className="space-y-4 p-4 border border-gray-200 rounded">
        {circularDependencyError ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <strong>Circular Dependency Error</strong>
            </div>
            <p className="mt-1">{circularDependencyError}</p>
            <p className="mt-1 text-xs">
              This field cannot be rendered due to a circular reference in schema definitions.
            </p>
          </div>
        ) : Object.keys(properties).length === 0 ? (
          <p className="text-gray-500 text-sm italic">
            {objectField.schemaRef
              ? `Schema "${objectField.schemaRef}" not found or has no fields.`
              : 'No properties defined for this object.'}
          </p>
        ) : (
          Object.entries(properties).map(([key, propField]) => (
            <FieldRenderer
              key={key}
              field={propField as FieldDefinition}
              value={objectValue[key]}
              onChange={propValue => updateProperty(key, propValue)}
              error={getNestedFieldError(key)}
              disabled={disabled}
              availableSchemas={availableSchemas}
              allErrors={allErrors}
              fieldPath={fieldPath ? `${fieldPath}.${key}` : key}
            />
          ))
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Color Field Component
export function ColorField({ field, value, onChange, error, disabled }: BaseFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-12 h-10 border border-gray-300 rounded cursor-pointer disabled:opacity-50"
        />
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          disabled={disabled}
          className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : ''
          }`}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Media Field Component
export function MediaField({ field, value, onChange, error, disabled }: BaseFieldProps) {
  const mediaField = field as any;
  const [showPicker, setShowPicker] = useState(false);
  const [repositoryContext, setRepositoryContext] = useState<{
    owner: string;
    repo: string;
  } | null>(null);

  // Get repository context from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const owner = params.get('owner');
    const repo = params.get('repo');

    if (owner && repo && owner !== 'placeholder' && repo !== 'placeholder') {
      setRepositoryContext({ owner, repo });
    }
  }, []);

  // Get accepted media types from field configuration
  const acceptedTypes = mediaField.mediaTypes || undefined;
  const multiple = mediaField.multiple || false;

  // Parse current value
  const currentMedia = value ? (Array.isArray(value) ? value : [value]) : [];

  // Handle media selection
  const handleMediaSelect = (selectedMedia: any) => {
    if (Array.isArray(selectedMedia)) {
      onChange(multiple ? selectedMedia : selectedMedia[0]);
    } else {
      onChange(multiple ? [selectedMedia] : selectedMedia);
    }
    setShowPicker(false);
  };

  // Handle media removal
  const handleRemoveMedia = (index: number) => {
    if (multiple) {
      const newMedia = currentMedia.filter((_, i) => i !== index);
      onChange(newMedia.length > 0 ? newMedia : null);
    } else {
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && <p className="text-sm text-gray-500">{field.description}</p>}

      {/* Current Media Display */}
      {currentMedia.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
          {currentMedia.map((media: any, index: number) => (
            <div key={index} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {media.mediaType === 'image' ? (
                  <img
                    src={media.thumbnailUrl || media.url}
                    alt={media.filename || 'Media'}
                    className="w-full h-full object-cover"
                    onError={e => {
                      // Fallback to original URL if thumbnail fails
                      const target = e.target as HTMLImageElement;
                      if (target.src === media.thumbnailUrl && media.url) {
                        target.src = media.url;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <FileIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500 truncate">{media.filename || 'File'}</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveMedia(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Media Button */}
      {(!currentMedia.length || multiple) && (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          disabled={disabled || !repositoryContext}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <div className="text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {!repositoryContext ? (
              <div>
                <p className="text-sm font-medium text-gray-400">Repository context required</p>
                <p className="text-xs text-gray-400 mt-1">
                  Please navigate from a repository page to select media
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">
                  {currentMedia.length > 0 ? 'Add more media' : 'Select media'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {acceptedTypes
                    ? `Accepted: ${acceptedTypes.join(', ')}`
                    : 'All media types accepted'}
                </p>
              </div>
            )}
          </div>
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Media Picker Modal */}
      {showPicker && repositoryContext && (
        <MediaPickerModal
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={handleMediaSelect}
          owner={repositoryContext.owner}
          repo={repositoryContext.repo}
          multiple={multiple}
          acceptedTypes={acceptedTypes}
          title={`Select ${field.label}`}
        />
      )}
    </div>
  );
}

// Reference Field Component (placeholder for now)
export function ReferenceField({ field, value, onChange, error, disabled }: BaseFieldProps) {
  const refField = field as any;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
      <div className="p-4 border border-gray-300 rounded bg-gray-50">
        <p className="text-sm text-gray-600">Reference to: {refField.collection}</p>
        <p className="text-xs text-gray-500 mt-1">Reference field implementation coming soon</p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Rich Text Field Component (handles both rich-text and markdown the same way)
export function RichTextField({
  field,
  value,
  onChange,
  error,
  disabled,
  owner,
  repo,
}: BaseFieldProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{field.description}</p>
      )}
      <div className="relative">
        <RichTextEditor
          value={value || ''}
          onChange={onChange}
          placeholder={
            field.placeholder || 'Start writing... Use toolbar or markdown syntax like **bold**'
          }
          readOnly={disabled}
          owner={owner}
          repo={repo}
          className={`transition-all duration-200 ${
            error
              ? 'border-red-400 shadow-sm focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200'
              : 'focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100'
          }`}
        />
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          Supports both visual formatting and markdown syntax
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// Main Field Renderer Component
export function FieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled,
  availableSchemas,
  allErrors,
  fieldPath,
  owner,
  repo,
}: BaseFieldProps) {
  switch (field.type) {
    case 'string':
    case 'text':
      return (
        <StringField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'number':
      return (
        <NumberField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'boolean':
      return (
        <BooleanField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'date':
    case 'datetime':
      return (
        <DateField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'select':
      return (
        <SelectField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'array':
      return (
        <ArrayField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          availableSchemas={availableSchemas}
          allErrors={allErrors}
          fieldPath={fieldPath}
        />
      );

    case 'object':
      return (
        <ObjectField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          availableSchemas={availableSchemas}
          allErrors={allErrors}
          fieldPath={fieldPath}
        />
      );

    case 'color':
      return (
        <ColorField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'media':
      return (
        <MediaField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'reference':
      return (
        <ReferenceField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );

    case 'rich-text':
      return (
        <RichTextField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          owner={owner}
          repo={repo}
        />
      );

    default:
      return (
        <StringField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
  }
}

// Utility function to get default value for a field
function getDefaultValue(field: FieldDefinition | undefined): any {
  if (!field) {
    return null;
  }

  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  switch (field.type) {
    case 'string':
    case 'text':
    case 'color':
    case 'rich-text':
      return '';
    case 'number':
      return 0;
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
    default:
      return null;
  }
}
