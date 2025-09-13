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
  enableMarkdown?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive,
  disabled,
  children,
  title,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      p-2 rounded border transition-colors
      ${
        isActive
          ? 'bg-blue-100 border-blue-300 text-blue-700'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
    `}
  >
    {children}
  </button>
);

const ToolbarSeparator = () => <div className="w-px h-6 bg-gray-300 mx-1" />;

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  readOnly = false,
  className = '',
  enableMarkdown = false,
}) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const lowlight = createLowlight();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
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
          class: 'bg-gray-100 rounded p-4 font-mono text-sm',
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
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const content = enableMarkdown
          ? editor.getText() // Simplified for now - could add markdown plugin later
          : editor.getHTML();
        onChange(content);
      }
    },
  });

  const addLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkDialog(false);
    }
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const url = prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;

    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) {
    return <div className="animate-pulse bg-gray-100 h-48 rounded"></div>;
  }

  return (
    <div
      className={`border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm ${className}`}
    >
      {!readOnly && (
        <div className="border-b border-gray-200 px-3 py-3 flex flex-wrap gap-1 bg-gray-50/50">
          {/* Headings */}
          <div className="flex gap-1 pr-2 border-r border-gray-300">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Type size={16} className="font-bold" />
              <span className="text-xs ml-1">H1</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Type size={14} className="font-semibold" />
              <span className="text-xs ml-1">H2</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Type size={12} />
              <span className="text-xs ml-1">H3</span>
            </ToolbarButton>
          </div>

          {/* Text Formatting */}
          <div className="flex gap-1 pr-2 border-r border-gray-300">
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

          {/* Lists and Blocks */}
          <div className="flex gap-1 pr-2 border-r border-gray-300">
            <Highlighter size={16} />
          </div>

          <ToolbarSeparator />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Type size={16} />
            <span className="text-xs ml-1">H1</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Type size={16} />
            <span className="text-xs ml-1">H2</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Type size={16} />
            <span className="text-xs ml-1">H3</span>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Lists */}
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

          <ToolbarSeparator />

          {/* Media & Links */}
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
          <ToolbarButton onClick={addTable} title="Add Table">
            <TableIcon size={16} />
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Code Block */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code size={16} />
            <span className="text-xs ml-1">Block</span>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo size={16} />
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Alignment */}
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

          <ToolbarSeparator />

          {/* Horizontal Rule */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            <Minus size={16} />
          </ToolbarButton>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="border-b border-gray-300 p-3 bg-blue-50">
          <div className="flex gap-2 items-center">
            <input
              type="url"
              placeholder="Enter URL..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLinkDialog(false);
                setLinkUrl('');
              }}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="p-4">
        <EditorContent
          editor={editor}
          className={`
            prose prose-sm max-w-none
            focus:outline-none
            ${readOnly ? 'cursor-default' : 'min-h-[200px]'}
          `}
        />
      </div>

      {/* Character/Word Count */}
      {!readOnly && (
        <div className="border-t border-gray-300 px-4 py-2 text-xs text-gray-500 bg-gray-50">
          {editor.storage.characterCount?.characters() || 0} characters,{' '}
          {editor.storage.characterCount?.words() || 0} words
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
