'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  /** The main title to display in the center */
  title: string;
  /** Optional left button/element */
  leftElement?: ReactNode;
  /** Optional right button/element */
  rightElement?: ReactNode;
  /** Additional CSS classes for the header */
  className?: string;
  /** Size variant for the header */
  size?: 'normal' | 'large';
  /** Whether this header should be stacked below navigation (affects styling) */
  isStacked?: boolean;
}

export function PageHeader({
  title,
  leftElement,
  rightElement,
  className = '',
  size = 'normal',
  isStacked = false,
}: PageHeaderProps) {
  const paddingClass = size === 'large' ? 'py-6' : 'py-4';
  const titleClass = size === 'large' ? 'text-2xl font-bold' : 'text-xl font-semibold';
  const backgroundClass = isStacked ? 'bg-gray-50' : 'bg-white';
  const borderClass = isStacked ? 'border-b border-gray-100' : 'shadow-sm';

  return (
    <header className={`${backgroundClass} ${borderClass} ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`relative flex items-center justify-center ${paddingClass}`}>
          {/* Left Element - Absolutely positioned to not affect centering */}
          {leftElement && <div className="absolute left-0">{leftElement}</div>}

          {/* Centered Title */}
          <h1 className={`${titleClass} text-gray-900`}>{title}</h1>

          {/* Right Element - Absolutely positioned to not affect centering */}
          {rightElement && <div className="absolute right-0">{rightElement}</div>}
        </div>
      </div>
    </header>
  );
}
