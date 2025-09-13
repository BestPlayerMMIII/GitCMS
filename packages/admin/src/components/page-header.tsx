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
}

export function PageHeader({ title, leftElement, rightElement, className = '' }: PageHeaderProps) {
  return (
    <header className={`bg-white shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center py-4">
          {/* Left Element - Absolutely positioned to not affect centering */}
          {leftElement && <div className="absolute left-0">{leftElement}</div>}

          {/* Centered Title */}
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

          {/* Right Element - Absolutely positioned to not affect centering */}
          {rightElement && <div className="absolute right-0">{rightElement}</div>}
        </div>
      </div>
    </header>
  );
}
