/**
 * Schema Reference Selector Component
 *
 * A dropdown component for selecting schema references that prevents circular dependencies
 */

'use client';

import React, { useMemo } from 'react';
import {
  type GitCMSSchema,
  getSafeSchemaReferences,
  buildDependencyGraph,
  wouldCreateCircularDependency,
} from '@gitcms/core';

interface SchemaReferenceSelectorProps {
  currentSchemaId: string;
  availableSchemas: GitCMSSchema[];
  selectedSchemaRef?: string;
  onSchemaRefChange: (schemaRef: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SchemaReferenceSelector({
  currentSchemaId,
  availableSchemas,
  selectedSchemaRef,
  onSchemaRefChange,
  disabled = false,
  placeholder = 'Select a schema to reference...',
}: SchemaReferenceSelectorProps) {
  // Get schemas that can be safely referenced (no circular dependencies)
  const safeSchemas = useMemo(() => {
    return getSafeSchemaReferences(currentSchemaId, availableSchemas);
  }, [currentSchemaId, availableSchemas]);

  // Get schemas that would create circular dependencies for warnings
  const problematicSchemas = useMemo(() => {
    const dependencyGraph = buildDependencyGraph(availableSchemas);
    return availableSchemas.filter(schema => {
      if (schema.id === currentSchemaId) return true; // Self-reference
      return wouldCreateCircularDependency(currentSchemaId, schema.id, dependencyGraph);
    });
  }, [currentSchemaId, availableSchemas]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onSchemaRefChange(value);
  };

  return (
    <div className="space-y-2">
      <select
        value={selectedSchemaRef || ''}
        onChange={handleChange}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>

        {/* Safe schemas */}
        {safeSchemas.length > 0 && (
          <optgroup label="Available Schemas">
            {safeSchemas.map(schema => (
              <option key={schema.id} value={schema.id}>
                {schema.metadata.name} ({schema.id})
              </option>
            ))}
          </optgroup>
        )}

        {/* Problematic schemas (disabled with explanation) */}
        {problematicSchemas.length > 0 && (
          <optgroup label="Cannot Reference (Circular Dependency)">
            {problematicSchemas.map(schema => (
              <option key={schema.id} value={schema.id} disabled>
                {schema.metadata.name} ({schema.id}) - Would create circular dependency
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Show helpful information */}
      <div className="space-y-1">
        {safeSchemas.length === 0 && (
          <p className="text-sm text-yellow-600">
            ⚠️ No schemas available for reference. This could be because all other schemas would
            create circular dependencies.
          </p>
        )}

        {selectedSchemaRef && problematicSchemas.some(s => s.id === selectedSchemaRef) && (
          <p className="text-sm text-red-600">
            🚫 This reference would create a circular dependency and cannot be used.
          </p>
        )}

        {safeSchemas.length > 0 && (
          <p className="text-sm text-gray-500">
            {safeSchemas.length} schema{safeSchemas.length !== 1 ? 's' : ''} available for
            reference.
            {problematicSchemas.length > 0 && (
              <span className="ml-1">
                {problematicSchemas.length} schema{problematicSchemas.length !== 1 ? 's' : ''} would
                create circular dependencies.
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// Hook for managing schema reference state with validation
export function useSchemaReferenceSelector(
  currentSchemaId: string,
  availableSchemas: GitCMSSchema[],
  initialSchemaRef?: string
) {
  const [selectedSchemaRef, setSelectedSchemaRef] = React.useState<string>(initialSchemaRef || '');

  const safeSchemas = useMemo(() => {
    return getSafeSchemaReferences(currentSchemaId, availableSchemas);
  }, [currentSchemaId, availableSchemas]);

  const isValidSelection = useMemo(() => {
    if (!selectedSchemaRef) return true; // Empty selection is valid
    return safeSchemas.some(schema => schema.id === selectedSchemaRef);
  }, [selectedSchemaRef, safeSchemas]);

  const handleSchemaRefChange = (schemaRef: string) => {
    setSelectedSchemaRef(schemaRef);
  };

  return {
    selectedSchemaRef,
    setSelectedSchemaRef,
    handleSchemaRefChange,
    safeSchemas,
    isValidSelection,
  };
}
