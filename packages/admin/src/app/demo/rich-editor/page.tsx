'use client';

import { useState } from 'react';
import RichTextEditor from '../../../components/content/rich-text-editor';
import MarkdownPreview from '../../../components/content/markdown-preview';

export default function RichEditorDemo() {
  const [content, setContent] = useState(
    '<h1>Welcome to GitCMS Rich Text Editor</h1><p>This is a demonstration of the TipTap-powered rich text editor with comprehensive formatting capabilities.</p><p>You can use both <strong>visual formatting</strong> and <em>markdown syntax</em> like **bold** and *italic*!</p>'
  );
  const [secondContent, setSecondContent] = useState(
    '<h1>Another Editor Instance</h1><p>Multiple editors can work independently on the same page.</p><ul><li>Bullet points work great</li><li>Numbered lists too</li></ul><blockquote><p>Blockquotes for important notes</p></blockquote>'
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rich Text Editor Demo</h1>
        <p className="text-gray-600">
          TipTap-powered editor with both visual formatting and markdown syntax support
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Primary Rich Text Editor */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Primary Editor</h2>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing... You can use markdown syntax like **bold** or ## headings!"
            className="min-h-[400px]"
          />
          <div className="bg-gray-50 p-4 rounded border">
            <h3 className="font-medium text-gray-700 mb-2">Generated HTML:</h3>
            <pre className="text-sm text-gray-600 overflow-auto max-h-32">{content}</pre>
          </div>
        </div>

        {/* Secondary Rich Text Editor */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Secondary Editor</h2>
          <RichTextEditor
            value={secondContent}
            onChange={setSecondContent}
            placeholder="Another editor instance for comparison..."
            className="min-h-[400px]"
          />
          <div className="bg-gray-50 p-4 rounded border">
            <h3 className="font-medium text-gray-700 mb-2">Generated HTML:</h3>
            <pre className="text-sm text-gray-600 overflow-auto max-h-32">{secondContent}</pre>
          </div>
        </div>
      </div>

      {/* Feature Showcase */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Rich Text Editor Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-3 rounded shadow-sm">
            <h3 className="font-medium text-blue-800 mb-2">Text Formatting</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• Bold, Italic, Strikethrough</li>
              <li>• Headings (H1, H2, H3)</li>
              <li>• Inline Code</li>
              <li>• Text Highlighting</li>
            </ul>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <h3 className="font-medium text-blue-800 mb-2">Content Structure</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• Bullet Lists</li>
              <li>• Numbered Lists</li>
              <li>• Blockquotes</li>
              <li>• Code Blocks</li>
            </ul>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <h3 className="font-medium text-blue-800 mb-2">Media & Links</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• Links</li>
              <li>• Images</li>
              <li>• Tables</li>
              <li>• Horizontal Rules</li>
            </ul>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <h3 className="font-medium text-blue-800 mb-2">Editing Features</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• Undo/Redo</li>
              <li>• Text Alignment</li>
              <li>• Live Character Count</li>
              <li>• Keyboard Shortcuts</li>
            </ul>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <h3 className="font-medium text-blue-800 mb-2">Unified Approach</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• Visual formatting via toolbar</li>
              <li>• Markdown syntax support</li>
              <li>• Both produce same HTML output</li>
              <li>• Type **bold** or use button</li>
            </ul>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <h3 className="font-medium text-blue-800 mb-2">Developer Features</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• Consistent HTML Output</li>
              <li>• Auto-markdown Detection</li>
              <li>• Custom Styling</li>
              <li>• Read-only Mode</li>
            </ul>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <h3 className="font-medium text-blue-800 mb-2">Accessibility</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• Keyboard Navigation</li>
              <li>• Screen Reader Support</li>
              <li>• Focus Management</li>
              <li>• ARIA Labels</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Usage Instructions</h2>
        <div className="space-y-2 text-gray-700">
          <p>
            • <strong>Two ways to format:</strong> Use the toolbar buttons OR type markdown syntax
            directly
          </p>
          <p>
            • <strong>Markdown shortcuts:</strong> Type **bold**, *italic*, # heading, - list item,
            etc.
          </p>
          <p>
            • <strong>Links:</strong> Click "Add Link" button or type [text](url) in markdown
          </p>
          <p>
            • <strong>Images:</strong> Click "Add Image" button or type ![alt](url) in markdown
          </p>
          <p>
            • <strong>Keyboard shortcuts:</strong>{' '}
            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+B</kbd> for bold,{' '}
            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+I</kbd> for italic, etc.
          </p>
          <p>
            • <strong>Live conversion:</strong> Markdown syntax automatically converts to formatted
            text
          </p>
          <p>
            • <strong>Consistent output:</strong> Both visual and markdown input produce the same
            HTML
          </p>
        </div>
      </div>
    </div>
  );
}
