'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { validateContentId, validateSchemaId } from '@/lib/api-hooks';
import { useRepository } from '@/contexts/repository-context';
import { LoadingSpinner } from './loading';

interface IdValidationInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean, message: string) => void;
  type: 'content' | 'schema';
  schemaId?: string; // Required for content validation
  currentId?: string; // For editing existing items
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface ValidationResult {
  valid: boolean;
  exists: boolean;
  message: string;
}

export function IdValidationInput({
  value,
  onChange,
  onValidationChange,
  type,
  schemaId,
  currentId,
  placeholder,
  disabled = false,
  className = '',
}: IdValidationInputProps) {
  const { repositoryInfo } = useRepository();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  const validateId = useCallback(
    async (idToValidate: string) => {
      if (!repositoryInfo || !idToValidate.trim()) {
        setValidation(null);
        onValidationChange?.(true, '');
        return;
      }

      setIsValidating(true);

      try {
        let result: ValidationResult;

        if (type === 'content') {
          if (!schemaId) {
            throw new Error('Schema ID is required for content validation');
          }
          result = await validateContentId(
            repositoryInfo.owner,
            repositoryInfo.repo,
            schemaId,
            idToValidate,
            currentId
          );
        } else {
          result = await validateSchemaId(
            repositoryInfo.owner,
            repositoryInfo.repo,
            idToValidate,
            currentId
          );
        }

        setValidation(result);
        onValidationChange?.(result.valid, result.message);
      } catch (error) {
        console.error('ID validation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Validation failed';
        setValidation({
          valid: false,
          exists: false,
          message: errorMessage,
        });
        onValidationChange?.(false, errorMessage);
      } finally {
        setIsValidating(false);
      }
    },
    [repositoryInfo, type, schemaId, currentId, onValidationChange]
  );

  // Debounced validation
  useEffect(() => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    if (value.trim()) {
      const timeout = setTimeout(() => {
        validateId(value.trim());
      }, 500); // 500ms debounce
      setValidationTimeout(timeout);
    } else {
      setValidation(null);
      onValidationChange?.(true, '');
    }

    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [value, validateId]);

  const getValidationIcon = () => {
    if (isValidating) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <LoadingSpinner size="sm" color="gray" />
        </div>
      );
    }

    if (!validation || !value.trim()) {
      return null;
    }

    if (validation.valid) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }
  };

  const getInputClassName = () => {
    let baseClassName = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10`;

    if (validation && value.trim()) {
      if (validation.valid) {
        baseClassName += ' border-green-300 bg-green-50';
      } else {
        baseClassName += ' border-red-300 bg-red-50';
      }
    } else {
      baseClassName += ' border-gray-300';
    }

    if (disabled) {
      baseClassName += ' bg-gray-100 cursor-not-allowed';
    }

    return baseClassName;
  };

  return (
    <div>
      <div className={`relative flex items-center ${className}`}>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={getInputClassName()}
        />
        {getValidationIcon()}
      </div>
      {validation && value.trim() && (
        <div className={`mt-1 text-xs ${validation.valid ? 'text-green-600' : 'text-red-600'}`}>
          {validation.message}
        </div>
      )}
    </div>
  );
}
