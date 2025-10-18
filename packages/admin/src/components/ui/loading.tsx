/**
 * Loading Components and Skeleton Loaders
 *
 * Consistent loading states across the GitCMS admin interface
 */

import React from 'react';

// Base skeleton component
interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
  rounded?: boolean;
}

export function Skeleton({
  className = '',
  height = '1rem',
  width = '100%',
  rounded = false,
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ height, width }}
    />
  );
}

// Schema list skeleton loader
export function SchemaListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-3">
                <Skeleton width="2rem" height="2rem" rounded />
                <div className="space-y-1">
                  <Skeleton width="12rem" height="1.25rem" />
                  <Skeleton width="8rem" height="0.875rem" />
                </div>
              </div>
              <Skeleton width="100%" height="1rem" />
              <div className="flex items-center space-x-2">
                <Skeleton width="4rem" height="1.5rem" rounded />
                <Skeleton width="3rem" height="0.75rem" />
              </div>
            </div>
            <div className="flex space-x-2 ml-4">
              <Skeleton width="4rem" height="2rem" />
              <Skeleton width="4rem" height="2rem" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Content grid skeleton loader
export function ContentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton width="80%" height="1.25rem" />
                <Skeleton width="60%" height="0.875rem" />
              </div>
              <Skeleton width="4rem" height="1.5rem" rounded />
            </div>

            <div className="space-y-2">
              <Skeleton width="100%" height="0.875rem" />
              <Skeleton width="85%" height="0.875rem" />
              <Skeleton width="70%" height="0.875rem" />
            </div>

            <div className="flex items-center justify-between">
              <Skeleton width="7rem" height="0.75rem" />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Skeleton width="50%" height="2rem" />
              <Skeleton width="25%" height="2rem" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Schema form skeleton loader
export function SchemaFormSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        {/* Schema metadata section */}
        <div className="space-y-6">
          <Skeleton width="12rem" height="1.5rem" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton width="6rem" height="1rem" />
              <Skeleton width="100%" height="2.5rem" />
            </div>
            <div className="space-y-2">
              <Skeleton width="8rem" height="1rem" />
              <Skeleton width="100%" height="2.5rem" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton width="6rem" height="1rem" />
            <Skeleton width="100%" height="6rem" />
          </div>

          <div className="space-y-2">
            <Skeleton width="5rem" height="1rem" />
            <Skeleton width="100%" height="2.5rem" />
          </div>
        </div>

        {/* Fields section */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton width="4rem" height="1.5rem" />
            <Skeleton width="6rem" height="2rem" />
          </div>

          {/* Field items */}
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Skeleton width="4rem" height="1rem" />
                  <Skeleton width="100%" height="2.5rem" />
                </div>
                <div className="space-y-2">
                  <Skeleton width="3rem" height="1rem" />
                  <Skeleton width="100%" height="2.5rem" />
                </div>
                <div className="space-y-2">
                  <Skeleton width="3rem" height="1rem" />
                  <Skeleton width="100%" height="2.5rem" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Skeleton width="4rem" height="1rem" />
                </div>
                <Skeleton width="1.5rem" height="1.5rem" />
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          <Skeleton width="4rem" height="2.5rem" />
          <Skeleton width="6rem" height="2.5rem" />
        </div>
      </div>
    </div>
  );
}

// Content form skeleton loader
export function ContentFormSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Skeleton width="8rem" height="1.5rem" />
          <Skeleton width="60%" height="1rem" />
        </div>

        {/* Form fields */}
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton width="6rem" height="1rem" />
              {index === 2 ? (
                <Skeleton width="100%" height="8rem" />
              ) : (
                <Skeleton width="100%" height="2.5rem" />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          <Skeleton width="4rem" height="2.5rem" />
          <Skeleton width="6rem" height="2.5rem" />
        </div>
      </div>
    </div>
  );
}

// Table skeleton loader
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} width="80%" height="1rem" />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} width={colIndex === 0 ? '90%' : '70%'} height="1rem" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading spinner component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white';
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  color = 'blue',
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-32 w-32',
  };

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white',
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    />
  );
}

// Page loading component
interface PageLoadingProps {
  message?: string;
  options?: {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    color?: 'blue' | 'gray' | 'white';
    vcenter?: boolean;
  };
  className?: string;
}

// Full page loading component
export function PageLoading({
  message = 'Loading...',
  options = {},
  className = '',
}: PageLoadingProps) {
  options = { size: 'lg', color: 'blue', vcenter: true, ...options };
  return (
    <div
      className={`bg-gray-50 flex items-center justify-center${options.vcenter ? ' min-h-screen' : ''} ${className}`}
    >
      <div className="text-center">
        <LoadingSpinner size={options.size} color={options.color} className="mx-auto" />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Inline loading component for buttons
export function ButtonLoading({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return <LoadingSpinner size={size} color="white" />;
}

// Empty state with loading option
interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function EmptyState({ title, description, action, icon, loading = false }: EmptyStateProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      {icon && <div className="mx-auto h-12 w-12 text-gray-400 mb-4">{icon}</div>}
      <h3 className="mt-2 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-500 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Progressive loading wrapper
interface ProgressiveLoadingProps {
  loading: boolean;
  data: any;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  error?: Error | null;
  onRetry?: () => void;
}

export function ProgressiveLoading({
  loading,
  data,
  skeleton,
  children,
  error,
  onRetry,
}: ProgressiveLoadingProps) {
  if (error) {
    return (
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
            <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error.message}</p>
            </div>
            {onRetry && (
              <div className="mt-4">
                <button
                  onClick={onRetry}
                  className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return <>{skeleton}</>;
  }

  return <>{children}</>;
}
