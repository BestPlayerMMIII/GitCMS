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
import { Node, mergeAttributes } from '@tiptap/core';
import { createLowlight } from 'lowlight';
import katex from 'katex';
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
  Zap,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useMediaPicker } from '../media/media-picker-modal';
import { GitCMSToolcall } from '@/lib/tiptap-toolcall-extension';
import { ToolcallDialog, type ToolcallParameter } from './toolcall-dialog';
import {
  type GitCMSMediaFile,
  fetchAuthenticatedThumbnail,
  getMediaTypeFromFilename,
  getDefaultThumbnail,
} from '@git-cms/core';
import { createGitHubClient } from '@/lib/client-github';

// Custom TipTap extension for GitCMS media embedding
const GitCMSMedia = Node.create({
  name: 'gitcmsMedia',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      'data-path': {
        default: null,
      },
      'data-filename': {
        default: null,
      },
      'data-thumbnail': {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'gitcms-media',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['gitcms-media', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('gitcms-media-wrapper');

      const img = document.createElement('img');
      img.src = node.attrs['data-thumbnail'] || '';
      img.alt = node.attrs.alt || node.attrs['data-filename'] || '';
      img.title = node.attrs.title || node.attrs['data-filename'] || '';
      img.classList.add('gitcms-media-thumbnail');
      img.draggable = false;

      // Add media info overlay
      const overlay = document.createElement('div');
      overlay.classList.add('gitcms-media-overlay');
      overlay.innerHTML = `
        <div class="gitcms-media-info">
          <span class="gitcms-media-filename">${node.attrs['data-filename'] || 'Media File'}</span>
          <span class="gitcms-media-badge">GitCMS Media</span>
        </div>
      `;

      wrapper.appendChild(img);
      wrapper.appendChild(overlay);

      return {
        dom: wrapper,
      };
    };
  },
});

// Custom TipTap extension for inline/block LaTeX math equations
const GitCMSMath = Node.create({
  name: 'gitcmsMath',

  group: 'inline',

  inline: true,

  atom: true,

  selectable: true,

  addAttributes() {
    return {
      'data-latex': {
        default: '',
      },
      'data-display-mode': {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'gitcms-math',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['gitcms-math', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('span');
      const latex = String(node.attrs['data-latex'] || '');
      const displayMode =
        node.attrs['data-display-mode'] === true || node.attrs['data-display-mode'] === 'true';

      wrapper.classList.add('gitcms-math-wrapper');
      if (displayMode) {
        wrapper.classList.add('gitcms-math-display');
      }

      let renderedMath = '';
      try {
        // Render as MathML so equations are visible even without loading KaTeX CSS globally.
        renderedMath = katex.renderToString(latex, {
          throwOnError: false,
          displayMode,
          output: 'mathml',
        });
      } catch {
        renderedMath = `<code>${latex}</code>`;
      }

      wrapper.innerHTML = `
        <span class="gitcms-math-label">LaTeX</span>
        <span class="gitcms-math-content">${renderedMath}</span>
      `;

      return {
        dom: wrapper,
      };
    };
  },
});

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  // Media picker configuration
  owner?: string;
  repo?: string;
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
  owner,
  repo,
}) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showMathDialog, setShowMathDialog] = useState(false);
  const [mathLatex, setMathLatex] = useState('');
  const [mathDisplayMode, setMathDisplayMode] = useState(false);
  const [editingMath, setEditingMath] = useState<{ pos: number } | null>(null);
  const [showToolcallDialog, setShowToolcallDialog] = useState(false);
  const [editingToolcall, setEditingToolcall] = useState<{
    pos: number;
    id: string;
    parameters: ToolcallParameter[];
  } | null>(null);
  const { openPicker, MediaPicker } = useMediaPicker();

  /**
   * Fetch thumbnail with authentication and convert to base64 data URL
   * Uses the centralized fetchAuthenticatedThumbnail from @git-cms/core
   * For images: fetches actual thumbnail from thumbnails/ subfolder
   * For videos/audio/documents: returns appropriate placeholder SVG automatically
   */
  const getThumbnailForMedia = useCallback(
    async (mediaPath: string, filename: string): Promise<string> => {
      if (!owner || !repo) {
        // Fallback to default placeholder if no repo info
        const mediaType = getMediaTypeFromFilename(filename);
        return getDefaultThumbnail(mediaType);
      }

      try {
        // Create GitHub client with OAuth
        const githubClient = createGitHubClient(owner, repo);
        const token = await (githubClient as any).getAccessToken();

        // Use centralized thumbnail fetching (handles all media types and caching)
        return await fetchAuthenticatedThumbnail(owner, repo, mediaPath, token);
      } catch (error) {
        console.error('Failed to fetch thumbnail:', error);
        // Return appropriate placeholder based on media type
        const mediaType = getMediaTypeFromFilename(filename);
        return getDefaultThumbnail(mediaType);
      }
    },
    [owner, repo]
  );

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
      GitCMSMedia, // Add our custom media extension
      GitCMSMath, // Add custom LaTeX math extension
      GitCMSToolcall, // Add our custom toolcall extension
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class:
            'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-4 font-mono text-sm border border-gray-300 dark:border-gray-600',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 px-1 rounded',
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
    onCreate: ({ editor }) => {
      // Add double-click handler for toolcalls and math equations
      editor.view.dom.addEventListener('dblclick', event => {
        const target = event.target as HTMLElement;
        const toolcallWrapper = target.closest('.gitcms-toolcall-wrapper');
        const mathWrapper = target.closest('.gitcms-math-wrapper');

        if (mathWrapper && editor) {
          const pos = editor.view.posAtDOM(mathWrapper, 0);
          const node = editor.state.doc.nodeAt(pos);

          if (node && node.type.name === 'gitcmsMath') {
            setEditingMath({ pos });
            setMathLatex(String(node.attrs['data-latex'] || ''));
            setMathDisplayMode(
              node.attrs['data-display-mode'] === true || node.attrs['data-display-mode'] === 'true'
            );
            setShowMathDialog(true);
            return;
          }
        }

        if (toolcallWrapper && editor) {
          // Find the node position
          const pos = editor.view.posAtDOM(toolcallWrapper, 0);
          const node = editor.state.doc.nodeAt(pos);

          if (node && node.type.name === 'gitcmsToolcall') {
            // Parse parameters
            let params: Record<string, string> = {};
            try {
              if (node.attrs['data-params']) {
                params = JSON.parse(node.attrs['data-params']);
              }
            } catch (error) {
              console.error('Failed to parse params:', error);
            }

            // Convert to ToolcallParameter array
            const parameters: ToolcallParameter[] = Object.entries(params).map(([key, value]) => ({
              key,
              value,
            }));

            // Set editing state and open dialog
            setEditingToolcall({
              pos,
              id: node.attrs.id,
              parameters: parameters.length > 0 ? parameters : [{ key: '', value: '' }],
            });
            setShowToolcallDialog(true);
          }
        }
      });
    },
  });

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setShowLinkDialog(false);
      setLinkUrl('');
    }
  }, [editor, linkUrl]);

  const saveMathEquation = useCallback(() => {
    if (!editor || !mathLatex.trim()) {
      return;
    }

    const attrs = {
      'data-latex': mathLatex.trim(),
      'data-display-mode': mathDisplayMode,
    };

    if (editingMath) {
      const tr = editor.state.tr;
      tr.setNodeMarkup(editingMath.pos, undefined, attrs);
      editor.view.dispatch(tr);
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'gitcmsMath',
          attrs,
        })
        .run();
    }

    setShowMathDialog(false);
    setMathLatex('');
    setMathDisplayMode(false);
    setEditingMath(null);
  }, [editor, editingMath, mathLatex, mathDisplayMode]);

  const addMedia = useCallback(() => {
    if (owner && repo) {
      openPicker({
        onSelect: handleMediaSelect,
        owner,
        repo,
        multiple: false,
        acceptedTypes: ['image', 'video', 'audio', 'document'],
        title: 'Insert Media',
      });
    } else {
      // Fallback to URL prompt if no repository info
      const url = window.prompt('Media URL:');
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
  }, [editor, owner, repo]);

  const handleMediaSelect = useCallback(
    async (selectedMedia: GitCMSMediaFile | GitCMSMediaFile[]) => {
      if (editor && owner && repo) {
        // Handle both single media and array (take first if array)
        const media = Array.isArray(selectedMedia) ? selectedMedia[0] : selectedMedia;
        if (!media) return;

        try {
          // Fetch thumbnail with authentication and get base64 data URL
          // For images: fetches actual thumbnail from repository
          // For videos/documents/audio: returns appropriate placeholder SVG
          const thumbnailDataUrl = await getThumbnailForMedia(media.path, media.filename);

          // Create custom media embedding tag
          // - data-thumbnail: base64 data URL for immediate display in editor and client
          // - data-path: reference to original media file
          const mediaEmbed = `<gitcms-media data-path="${media.path}" data-filename="${media.filename}" data-thumbnail="${thumbnailDataUrl}" alt="${media.metadata.alt || media.filename}" title="${media.metadata.title || media.filename}"></gitcms-media>`;

          editor.chain().focus().insertContent(mediaEmbed).run();
        } catch (error) {
          console.error('Failed to insert media:', error);
          // Fallback to regular image tag with placeholder
          editor
            .chain()
            .focus()
            .setImage({
              src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23ddd" width="300" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E',
              alt: media.metadata.alt || media.filename,
            })
            .run();
        }
      }
    },
    [editor, owner, repo, getThumbnailForMedia]
  );

  const handleToolcallInsert = useCallback(
    (id: string, parameters: ToolcallParameter[]) => {
      if (editor) {
        // Build the parameters object
        const params: Record<string, string> = {};
        parameters.forEach(param => {
          if (param.key.trim()) {
            params[param.key.trim()] = param.value;
          }
        });

        // Create the toolcall tag
        let toolcallTag = `<gitcms-toolcall id="${id}"`;

        // Add all parameters with _ prefix
        Object.entries(params).forEach(([key, value]) => {
          // Escape quotes in the value
          const escapedValue = value.replace(/"/g, '&quot;');
          toolcallTag += ` _${key}="${escapedValue}"`;
        });

        toolcallTag += '></gitcms-toolcall>';

        // Insert into editor
        editor.chain().focus().insertContent(toolcallTag).run();

        // Clear editing state
        setEditingToolcall(null);
      }
    },
    [editor]
  );

  const handleToolcallUpdate = useCallback(
    (id: string, parameters: ToolcallParameter[]) => {
      if (editor && editingToolcall) {
        // Build the parameters object
        const params: Record<string, string> = {};
        parameters.forEach(param => {
          if (param.key.trim()) {
            params[param.key.trim()] = param.value;
          }
        });

        // Update the node at the stored position
        const tr = editor.state.tr;
        tr.setNodeMarkup(editingToolcall.pos, undefined, {
          id,
          'data-params': JSON.stringify(params),
        });

        editor.view.dispatch(tr);

        // Clear editing state
        setEditingToolcall(null);
      }
    },
    [editor, editingToolcall]
  );

  if (!editor) {
    return null;
  }

  return (
    <div
      className={`border border-gray-300 rounded-lg overflow-visible bg-white shadow-sm ${className}`}
    >
      {!readOnly && (
        <div
          className="sticky z-30 border-b border-gray-200 px-4 py-3 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/90"
          style={{ top: 'var(--gitcms-sticky-offset, 0px)' }}
        >
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
              <ToolbarButton onClick={addMedia} title="Add Media">
                <ImageIcon size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive('codeBlock')}
                title="Code Block"
              >
                <Code size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => setShowToolcallDialog(true)}
                isActive={editor.isActive('gitcmsToolcall')}
                title="Insert Tool Call"
              >
                <Zap size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => {
                  setEditingMath(null);
                  setMathLatex('');
                  setMathDisplayMode(false);
                  setShowMathDialog(true);
                }}
                isActive={editor.isActive('gitcmsMath')}
                title="Insert LaTeX Equation"
              >
                <span className="text-xs font-semibold">TeX</span>
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

      {/* Math Dialog */}
      {showMathDialog && (
        <div className="border-b border-gray-300 p-4 bg-indigo-50">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium text-indigo-900">
              {editingMath ? 'Edit LaTeX Equation' : 'Insert LaTeX Equation'}
            </div>
            <textarea
              placeholder="Example: \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
              value={mathLatex}
              onChange={e => setMathLatex(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              autoFocus
            />
            <label className="inline-flex items-center gap-2 text-sm text-indigo-900">
              <input
                type="checkbox"
                checked={mathDisplayMode}
                onChange={e => setMathDisplayMode(e.target.checked)}
                className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
              Display mode (block equation)
            </label>
            <div className="flex gap-3 items-center">
              <button
                type="button"
                onClick={saveMathEquation}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                disabled={!mathLatex.trim()}
              >
                {editingMath ? 'Update' : 'Insert'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMathDialog(false);
                  setMathLatex('');
                  setMathDisplayMode(false);
                  setEditingMath(null);
                }}
                className="px-4 py-2 border border-indigo-200 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                Cancel
              </button>
              <div className="text-xs text-indigo-700">
                Tip: double-click an existing equation to edit it
              </div>
            </div>
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
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            padding: 0.125rem 0.375rem;
            border-radius: 0.375rem;
            font-family:
              'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
            font-size: 0.875em;
            color: #dc2626;
            font-weight: 500;
          }

          .ProseMirror pre {
            background-color: #f3f4f6;
            color: #1f2937;
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin: 1.5rem 0;
            overflow-x: auto;
            font-family:
              'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
            line-height: 1.5;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          }

          .ProseMirror pre code {
            background: none;
            border: none;
            color: inherit;
            padding: 0;
            font-size: 0.875rem;
            font-weight: normal;
          }

          /* Dark mode support for code blocks */
          .dark .ProseMirror code {
            background-color: #1f2937;
            border-color: #374151;
            color: #f87171;
          }

          .dark .ProseMirror pre {
            background-color: #1f2937;
            color: #e5e7eb;
            border-color: #374151;
          }

          .dark .ProseMirror pre code {
            color: inherit;
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

          /* GitCMS Media Embedding Styles */
          .gitcms-media-wrapper {
            position: relative;
            display: inline-block;
            margin: 1.5rem 0;
            border-radius: 0.75rem;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            background-color: #f8fafc;
            border: 2px solid #e2e8f0;
            transition: all 0.2s ease;
          }

          .gitcms-media-wrapper:hover {
            box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.15);
            border-color: #3b82f6;
          }

          .gitcms-media-thumbnail {
            width: 100%;
            max-width: 400px;
            height: auto;
            display: block;
            border-radius: 0.5rem;
          }

          .gitcms-media-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.2));
            color: white;
            padding: 0.75rem;
            border-radius: 0 0 0.5rem 0.5rem;
          }

          .gitcms-media-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.5rem;
          }

          .gitcms-media-filename {
            font-size: 0.875rem;
            font-weight: 500;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
          }

          .gitcms-media-badge {
            font-size: 0.75rem;
            background-color: #3b82f6;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            white-space: nowrap;
          }

          /* Editor state styles for GitCMS media */
          .ProseMirror .gitcms-media-wrapper.ProseMirror-selectednode {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          /* GitCMS Toolcall Styles */
          .gitcms-toolcall-wrapper {
            display: inline-block;
            vertical-align: baseline;
            user-select: none;
            cursor: pointer;
            margin: 0 0.125rem;
          }

          .gitcms-toolcall-container {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.125rem 0.5rem;
            border: 1.5px solid #8b5cf6;
            border-radius: 0.375rem;
            background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(139, 92, 246, 0.2);
            font-size: 0.875rem;
            line-height: 1.5;
            white-space: nowrap;
            position: relative;
          }

          .gitcms-toolcall-container:hover {
            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
            border-color: #7c3aed;
            transform: translateY(-1px);
          }

          .gitcms-toolcall-container:hover::after {
            content: '✏️ Double-click';
            position: absolute;
            bottom: calc(100% + 0.25rem);
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.6875rem;
            color: white;
            background: #7c3aed;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            white-space: nowrap;
            pointer-events: none;
            font-weight: 600;
            z-index: 10;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .gitcms-toolcall-icon {
            font-size: 0.875rem;
            line-height: 1;
            display: inline-flex;
            align-items: center;
          }

          .gitcms-toolcall-id {
            font-weight: 600;
            font-size: 0.8125rem;
            color: #7c3aed;
            font-family:
              'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
            letter-spacing: 0.025em;
          }

          .gitcms-toolcall-badge {
            font-size: 0.625rem;
            background: #7c3aed;
            color: white;
            padding: 0.125rem 0.375rem;
            border-radius: 9999px;
            font-weight: 700;
            line-height: 1;
            min-width: 1.25rem;
            text-align: center;
          }

          /* Editor state styles for GitCMS toolcall */
          .ProseMirror
            .gitcms-toolcall-wrapper.ProseMirror-selectednode
            .gitcms-toolcall-container {
            border-color: #6d28d9;
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
          }

          /* GitCMS Math Styles */
          .gitcms-math-wrapper {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.125rem 0.5rem;
            border: 1px solid #c7d2fe;
            border-radius: 0.375rem;
            background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
            cursor: pointer;
            margin: 0 0.125rem;
            vertical-align: middle;
          }

          .gitcms-math-wrapper:hover {
            border-color: #818cf8;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.18);
          }

          .gitcms-math-display {
            display: flex;
            width: 100%;
            justify-content: center;
            margin: 0.75rem 0;
            padding: 0.75rem;
          }

          .gitcms-math-label {
            font-size: 0.6875rem;
            font-weight: 700;
            color: #4338ca;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .gitcms-math-content {
            color: #312e81;
            font-family:
              'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
            font-size: 0.875rem;
          }

          .ProseMirror .gitcms-math-wrapper.ProseMirror-selectednode {
            border-color: #6366f1;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
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

      {/* Toolcall Dialog */}
      <ToolcallDialog
        isOpen={showToolcallDialog}
        onClose={() => {
          setShowToolcallDialog(false);
          setEditingToolcall(null);
        }}
        onInsert={handleToolcallInsert}
        onUpdate={handleToolcallUpdate}
        editMode={editingToolcall !== null}
        initialId={editingToolcall?.id}
        initialParameters={editingToolcall?.parameters}
      />

      {/* Media Picker Modal */}
      <MediaPicker />
    </div>
  );
};

export default RichTextEditor;
