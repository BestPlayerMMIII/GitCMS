'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  label: string;
  description?: string;
}

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChange: (categories: Category[]) => void;
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

export function CategoryManager({ isOpen, onClose, onCategoriesChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', label: '', description: '' });
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Load categories from localStorage on mount
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

  // Save categories to localStorage and notify parent
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem('gitcms-categories', JSON.stringify(categories));
      onCategoriesChange(categories);
    }
  }, [categories, onCategoriesChange]);

  const addCategory = () => {
    if (!newCategory.name || !newCategory.label) return;

    const category: Category = {
      id: newCategory.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: newCategory.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      label: newCategory.label,
      description: newCategory.description,
    };

    setCategories(prev => [...prev, category]);
    setNewCategory({ name: '', label: '', description: '' });
    setIsAddingNew(false);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(cat => (cat.id === id ? { ...cat, ...updates } : cat)));
    setEditingId(null);
  };

  const deleteCategory = (id: string) => {
    // Prevent deleting if it's the only category
    if (categories.length <= 1) return;

    setCategories(prev => prev.filter(cat => cat.id !== id));
  };

  const resetToDefaults = () => {
    setCategories(DEFAULT_CATEGORIES);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage Categories</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {categories.map(category => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                {editingId === category.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={category.label}
                      onChange={e => updateCategory(category.id, { label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Category label"
                    />
                    <input
                      type="text"
                      value={category.description || ''}
                      onChange={e => updateCategory(category.id, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Category description (optional)"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{category.label}</h3>
                      <p className="text-sm text-gray-500 mt-1">ID: {category.name}</p>
                      {category.description && (
                        <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(category.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {categories.length > 1 && (
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isAddingNew && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newCategory.label}
                    onChange={e => setNewCategory(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Category label (e.g., 'E-commerce')"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Category ID (e.g., 'ecommerce')"
                  />
                  <input
                    type="text"
                    value={newCategory.description}
                    onChange={e =>
                      setNewCategory(prev => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Description (optional)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addCategory}
                      disabled={!newCategory.name || !newCategory.label}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Add Category
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewCategory({ name: '', label: '', description: '' });
                      }}
                      className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddingNew(true)}
              disabled={isAddingNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              Reset to Defaults
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
