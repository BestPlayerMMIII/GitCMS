'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  label: string;
  description?: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'content', name: 'content', label: 'Content', description: 'General content types' },
  { id: 'page', name: 'page', label: 'Page', description: 'Static pages and layouts' },
  { id: 'blog', name: 'blog', label: 'Blog', description: 'Blog posts and articles' },
  { id: 'product', name: 'product', label: 'Product', description: 'Product catalog items' },
  {
    id: 'portfolio',
    name: 'portfolio',
    label: 'Portfolio',
    description: 'Portfolio pieces and projects',
  },
  {
    id: 'documentation',
    name: 'documentation',
    label: 'Documentation',
    description: 'Documentation pages',
  },
  { id: 'other', name: 'other', label: 'Other', description: 'Miscellaneous content types' },
];

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('gitcms-categories');
    if (stored) {
      try {
        setCategories(JSON.parse(stored));
      } catch {
        setCategories(DEFAULT_CATEGORIES);
      }
    } else {
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  const updateCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    localStorage.setItem('gitcms-categories', JSON.stringify(newCategories));
  };

  return {
    categories,
    updateCategories,
  };
}

export type { Category };
