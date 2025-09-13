'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import CharacterCount from '@tiptap/extension-character-count';
import { createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
  Minus,
  Type,
  Highlighter,
} from 'lucide-react';
import { useCallback, useState } from 'react';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center gap-1 p-2 rounded-md text-sm font-medium transition-all duration-200
        hover:bg-gray-100 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${
          isActive
            ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
            : 'text-gray-700 border border-transparent hover:border-gray-200'
        }
      `}
    >
      {children}
    </button>
  );
};

const ToolbarSeparator: React.FC = () => <div className="w-px h-6 bg-gray-300 mx-1" />;

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  readOnly = false,
  className = '',
}) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Create lowlight instance for code highlighting
  const lowlight = createLowlight();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-100 rounded-lg p-4 font-mono text-sm border',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-200 px-1 rounded',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      CharacterCount,
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
  });

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setShowLinkDialog(false);
      setLinkUrl('');
    }
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={`border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm ${className}`}
    >
      {!readOnly && (
        <div className="border-b border-gray-200 px-4 py-3 bg-gray-50/80">
          <div className="flex flex-wrap gap-2">
            {/* Headings */}
            <div className="flex gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
              >
                <Type size={16} className="font-bold" />
                <span className="text-xs">H1</span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
              >
                <Type size={14} className="font-semibold" />
                <span className="text-xs">H2</span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
              >
                <Type size={12} />
                <span className="text-xs">H3</span>
              </ToolbarButton>
            </div>

            <ToolbarSeparator />

            {/* Text Formatting */}
            <div className="flex gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold (Ctrl+B)"
              >
                <Bold size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic (Ctrl+I)"
              >
                <Italic size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
              >
                <Strikethrough size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                title="Inline Code"
              >
                <Code size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                isActive={editor.isActive('highlight')}
                title="Highlight"
              >
                <Highlighter size={16} />
              </ToolbarButton>
            </div>

            <ToolbarSeparator />

            {/* Lists */}
            <div className="flex gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
              >
                <List size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
              >
                <ListOrdered size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Quote"
              >
                <Quote size={16} />
              </ToolbarButton>
            </div>

            <ToolbarSeparator />

            {/* Text Alignment */}
            <div className="flex gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
              >
                <AlignLeft size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
              >
                <AlignCenter size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
              >
                <AlignRight size={16} />
              </ToolbarButton>
            </div>

            <ToolbarSeparator />

            {/* Media and Links */}
            <div className="flex gap-1">
              <ToolbarButton
                onClick={() => setShowLinkDialog(true)}
                isActive={editor.isActive('link')}
                title="Add Link"
              >
                <LinkIcon size={16} />
              </ToolbarButton>
              <ToolbarButton onClick={addImage} title="Add Image">
                <ImageIcon size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive('codeBlock')}
                title="Code Block"
              >
                <Code size={16} />
              </ToolbarButton>
            </div>

            <ToolbarSeparator />

            {/* Undo/Redo */}
            <div className="flex gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo (Ctrl+Z)"
              >
                <Undo size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo (Ctrl+Y)"
              >
                <Redo size={16} />
              </ToolbarButton>
            </div>

            <ToolbarSeparator />

            {/* Misc */}
            <div className="flex gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Rule"
              >
                <Minus size={16} />
              </ToolbarButton>
            </div>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="border-b border-gray-300 p-4 bg-blue-50">
          <div className="flex gap-3 items-center">
            <input
              type="url"
              placeholder="Enter URL..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  addLink();
                } else if (e.key === 'Escape') {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                }
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={addLink}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLinkDialog(false);
                setLinkUrl('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="px-6 py-4">
        <EditorContent editor={editor} className="prose prose-lg max-w-none focus:outline-none" />
        <style jsx global>{`
          .ProseMirror {
            outline: none;
            min-height: ${readOnly ? 'auto' : '300px'};
            padding: 1.5rem 0;
            line-height: 1.6;
            font-size: 16px;
            color: #1f2937;
          }

          .ProseMirror:focus {
            outline: none;
          }

          .ProseMirror h1 {
            font-size: 2.25rem;
            font-weight: 700;
            line-height: 1.1;
            margin: 2rem 0 1rem 0;
            color: #111827;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 0.5rem;
          }

          .ProseMirror h1:first-child {
            margin-top: 0;
          }

          .ProseMirror h2 {
            font-size: 1.75rem;
            font-weight: 600;
            line-height: 1.2;
            margin: 1.75rem 0 0.75rem 0;
            color: #111827;
          }

          .ProseMirror h3 {
            font-size: 1.375rem;
            font-weight: 600;
            line-height: 1.3;
            margin: 1.5rem 0 0.5rem 0;
            color: #111827;
          }

          .ProseMirror h4 {
            font-size: 1.125rem;
            font-weight: 600;
            line-height: 1.4;
            margin: 1.25rem 0 0.5rem 0;
            color: #374151;
          }

          .ProseMirror p {
            margin: 1rem 0;
            line-height: 1.75;
            color: #374151;
          }

          .ProseMirror p:first-child {
            margin-top: 0;
          }

          .ProseMirror p:last-child {
            margin-bottom: 0;
          }

          .ProseMirror ul,
          .ProseMirror ol {
            margin: 1.25rem 0;
            padding-left: 2rem;
          }

          .ProseMirror ul {
            list-style-type: none;
          }

          .ProseMirror ul li {
            position: relative;
            margin: 0.5rem 0;
            padding-left: 0;
          }

          .ProseMirror ul li::before {
            content: '•';
            color: #6b7280;
            font-weight: bold;
            position: absolute;
            left: -1.5rem;
            top: 0;
          }

          .ProseMirror ol {
            list-style-type: none;
            counter-reset: list-counter;
          }

          .ProseMirror ol li {
            position: relative;
            margin: 0.5rem 0;
            padding-left: 0;
            counter-increment: list-counter;
          }

          .ProseMirror ol li::before {
            content: counter(list-counter) '.';
            color: #6b7280;
            font-weight: 600;
            position: absolute;
            left: -2rem;
            top: 0;
            width: 1.5rem;
            text-align: right;
          }

          .ProseMirror li p {
            margin: 0.25rem 0;
          }

          .ProseMirror ul ul,
          .ProseMirror ol ol,
          .ProseMirror ul ol,
          .ProseMirror ol ul {
            margin: 0.5rem 0;
          }

          .ProseMirror blockquote {
            border-left: 4px solid #3b82f6;
            padding-left: 1.5rem;
            margin: 2rem 0;
            font-style: italic;
            color: #6b7280;
            background-color: #f8fafc;
            padding: 1rem 1.5rem;
            border-radius: 0 0.5rem 0.5rem 0;
          }

          .ProseMirror blockquote p {
            margin: 0.5rem 0;
          }

          .ProseMirror code {
            background-color: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 0.125rem 0.375rem;
            border-radius: 0.375rem;
            font-family:
              'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
            font-size: 0.875em;
            color: #dc2626;
            font-weight: 500;
          }

          .ProseMirror pre {
            background-color: #1e293b;
            color: #e2e8f0;
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin: 1.5rem 0;
            overflow-x: auto;
            font-family:
              'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
            line-height: 1.5;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }

          .ProseMirror pre code {
            background: none;
            border: none;
            color: inherit;
            padding: 0;
            font-size: 0.875rem;
            font-weight: normal;
          }

          .ProseMirror hr {
            margin: 3rem 0;
            border: none;
            border-top: 2px solid #e5e7eb;
            border-radius: 2px;
          }

          .ProseMirror a {
            color: #2563eb;
            text-decoration: underline;
            text-decoration-color: #93c5fd;
            text-underline-offset: 2px;
            transition: all 0.2s ease;
          }

          .ProseMirror a:hover {
            color: #1d4ed8;
            text-decoration-color: #3b82f6;
          }

          .ProseMirror img {
            max-width: 100%;
            height: auto;
            border-radius: 0.75rem;
            margin: 1.5rem 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }

          .ProseMirror table {
            border-collapse: collapse;
            margin: 2rem 0;
            width: 100%;
            border-radius: 0.5rem;
            overflow: hidden;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          }

          .ProseMirror table td,
          .ProseMirror table th {
            border: 1px solid #e5e7eb;
            padding: 0.75rem 1rem;
            vertical-align: top;
            text-align: left;
          }

          .ProseMirror table th {
            background-color: #f8fafc;
            font-weight: 600;
            color: #374151;
          }

          .ProseMirror table tbody tr:nth-child(even) {
            background-color: #f9fafb;
          }

          .ProseMirror table tbody tr:hover {
            background-color: #f3f4f6;
          }

          .ProseMirror mark {
            background-color: #fef3c7;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            color: #92400e;
          }

          .ProseMirror .is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #9ca3af;
            pointer-events: none;
            height: 0;
            font-style: italic;
          }

          /* Focus states and transitions */
          .ProseMirror * {
            transition: all 0.15s ease;
          }

          /* Better spacing for nested elements */
          .ProseMirror li > p + *,
          .ProseMirror li > * + p {
            margin-top: 0.5rem;
          }
        `}</style>
      </div>

      {/* Character/Word Count */}
      {!readOnly && editor && (
        <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-500 bg-gray-50/50 flex justify-between items-center">
          <div>
            {editor.storage.characterCount?.characters() || 0} characters,{' '}
            {editor.storage.characterCount?.words() || 0} words
          </div>
          <div className="text-xs text-gray-400">
            Visual formatting and markdown syntax supported
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
