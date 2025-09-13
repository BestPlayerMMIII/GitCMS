'use client';

import { useState } from 'react';
import RichTextEditor from '../../../components/content/rich-text-editor';
import MarkdownPreview from '../../../components/content/markdown-preview';

export default function RichEditorDemo() {
  const [content, setContent] = useState(
    '<h1>Welcome to GitCMS Rich Text Editor</h1><p>This is a demonstration of the TipTap-powered rich text editor with comprehensive formatting capabilities.</p>'
  );
  const [markdownContent, setMarkdownContent] = useState(
    '# Markdown Editor\n\nThis editor is configured for **markdown** content with *rich text* features.\n\n- Lists\n- Links\n- And more!'
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rich Text Editor Demo</h1>
        <p className="text-gray-600">
          Demonstrating the TipTap integration for GitCMS content editing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rich Text Editor */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Rich Text Editor</h2>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing your rich content..."
            className="min-h-[400px]"
          />
          <div className="bg-gray-50 p-4 rounded border">
            <h3 className="font-medium text-gray-700 mb-2">Generated HTML:</h3>
            <pre className="text-sm text-gray-600 overflow-auto max-h-32">{content}</pre>
          </div>
        </div>

        {/* Markdown Editor */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Markdown Editor</h2>
          <RichTextEditor
            value={markdownContent}
            onChange={setMarkdownContent}
            placeholder="Write your markdown content..."
            enableMarkdown={true}
            className="min-h-[400px]"
          />
          <div className="bg-gray-50 p-4 rounded border">
            <h3 className="font-medium text-gray-700 mb-2">Live Preview:</h3>
            <div className="bg-white p-3 rounded border max-h-64 overflow-auto">
              <MarkdownPreview content={markdownContent} />
            </div>
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
            <h3 className="font-medium text-blue-800 mb-2">Developer Features</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• HTML Output</li>
              <li>• Markdown Support</li>
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
          <p>• Use the toolbar to format your text with various styles and structures</p>
          <p>
            • Click "Add Link" to insert hyperlinks - supports both text selection and URL entry
          </p>
          <p>• Click "Add Image" to insert images from URLs</p>
          <p>• Click "Add Table" to insert a 3x3 table with headers</p>
          <p>
            • Use keyboard shortcuts:{' '}
            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+B</kbd> for bold,{' '}
            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+I</kbd> for italic, etc.
          </p>
          <p>• The character and word count is displayed at the bottom of each editor</p>
        </div>
      </div>
    </div>
  );
}
