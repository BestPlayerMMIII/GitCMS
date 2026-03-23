import { resolveMath } from './math';

/**
 * Represents a toolcall extracted from content
 */
export interface ToolcallReference {
  /** Unique identifier for this toolcall */
  id: string;
  /** Parameters passed to the toolcall (key-value pairs) */
  parameters: Record<string, string>;
  /** Original HTML tag for replacement */
  originalTag: string;
}

/**
 * Toolcall renderer function type
 * Takes the toolcall reference and returns HTML string or element to replace it
 */
export type ToolcallRenderer = (
  id: string,
  parameters: Record<string, string>
) => string | HTMLElement | Promise<string | HTMLElement>;

/**
 * Map of toolcall IDs to their renderer functions
 */
export type ToolcallRenderers = Record<string, ToolcallRenderer>;

/**
 * Options for toolcall resolution
 */
export interface ResolveToolcallsOptions {
  /** Whether to process async renderers (default: true) */
  async?: boolean;
  /** Whether to also resolve GitCMS LaTeX tags (default: true) */
  resolveMath?: boolean;
  /** Fallback renderer for unknown toolcall IDs */
  fallback?: ToolcallRenderer;
  /** Whether to keep original tags if renderer is not found (default: false) */
  keepUnresolved?: boolean;
}

/**
 * Extract toolcall references from HTML content
 * Parses all <gitcms-toolcall> tags and their parameters
 */
export function extractToolcalls(html: string): ToolcallReference[] {
  const references: ToolcallReference[] = [];
  const regex = /<gitcms-toolcall([^>]*)>\s*<\/gitcms-toolcall>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const attributes = match[1];
    const originalTag = match[0];

    // Extract id attribute
    const idMatch = attributes.match(/\bid=["']([^"']+)["']/i);
    if (!idMatch) continue;

    const id = idMatch[1];

    // Extract all parameters (attributes starting with _)
    const parameters: Record<string, string> = {};
    const paramRegex = /\b_([a-zA-Z0-9_-]+)=["']([^"']*)["']/gi;
    let paramMatch;

    while ((paramMatch = paramRegex.exec(attributes)) !== null) {
      const key = paramMatch[1];
      const value = paramMatch[2].replace(/&quot;/g, '"'); // Unescape quotes
      parameters[key] = value;
    }

    references.push({
      id,
      parameters,
      originalTag,
    });
  }

  return references;
}

/**
 * Resolve toolcalls in HTML content by replacing them with rendered output
 *
 * @param content - HTML content containing <gitcms-toolcall> tags
 * @param toolcalls - Map of toolcall IDs to renderer functions
 * @param options - Resolution options
 * @returns Processed HTML with toolcalls replaced by their rendered output
 *
 * @example
 * ```typescript
 * const content = '<p>Click here: <gitcms-toolcall id="BUTTON" _text="Subscribe" _color="blue"></gitcms-toolcall></p>';
 *
 * const renderers = {
 *   BUTTON: (id, params) => {
 *     return `<button class="btn btn-${params.color}">${params.text}</button>`;
 *   }
 * };
 *
 * const result = resolveToolcalls(content, renderers);
 * // Result: '<p>Click here: <button class="btn btn-blue">Subscribe</button></p>'
 * ```
 */
export function resolveToolcalls(
  content: string,
  toolcalls: ToolcallRenderers,
  options: ResolveToolcallsOptions = {}
): string {
  const { fallback, keepUnresolved = false, resolveMath: shouldResolveMath = true } = options;

  const references = extractToolcalls(content);
  let result = content;

  for (const ref of references) {
    const renderer = toolcalls[ref.id] || fallback;

    if (!renderer) {
      if (!keepUnresolved) {
        // Remove unresolved toolcalls
        result = result.replace(ref.originalTag, '');
      }
      continue;
    }

    try {
      const rendered = renderer(ref.id, ref.parameters);

      // Handle both strings and HTMLElements
      let replacement: string;
      if (typeof rendered === 'string') {
        replacement = rendered;
      } else if (rendered instanceof HTMLElement) {
        replacement = rendered.outerHTML;
      } else {
        console.warn(`Renderer for "${ref.id}" returned invalid type:`, typeof rendered);
        replacement = keepUnresolved ? ref.originalTag : '';
      }

      // Replace the toolcall tag with the rendered output
      result = result.replace(ref.originalTag, replacement);
    } catch (error) {
      console.error(`Error rendering toolcall "${ref.id}":`, error);
      if (!keepUnresolved) {
        result = result.replace(ref.originalTag, '');
      }
    }
  }

  if (shouldResolveMath) {
    return resolveMath(result, { keepUnresolved });
  }

  return result;
}

/**
 * Async version of resolveToolcalls that handles async renderers
 *
 * @param content - HTML content containing <gitcms-toolcall> tags
 * @param toolcalls - Map of toolcall IDs to renderer functions (can be async)
 * @param options - Resolution options
 * @returns Promise resolving to processed HTML with toolcalls replaced
 *
 * @example
 * ```typescript
 * const content = '<gitcms-toolcall id="USER_CARD" _userId="123"></gitcms-toolcall>';
 *
 * const renderers = {
 *   USER_CARD: async (id, params) => {
 *     const user = await fetchUser(params.userId);
 *     return `<div class="user-card"><h3>${user.name}</h3></div>`;
 *   }
 * };
 *
 * const result = await resolveToolcallsAsync(content, renderers);
 * ```
 */
export async function resolveToolcallsAsync(
  content: string,
  toolcalls: ToolcallRenderers,
  options: ResolveToolcallsOptions = {}
): Promise<string> {
  const { fallback, keepUnresolved = false, resolveMath: shouldResolveMath = true } = options;

  const references = extractToolcalls(content);
  let result = content;

  for (const ref of references) {
    const renderer = toolcalls[ref.id] || fallback;

    if (!renderer) {
      if (!keepUnresolved) {
        result = result.replace(ref.originalTag, '');
      }
      continue;
    }

    try {
      const rendered = await Promise.resolve(renderer(ref.id, ref.parameters));

      let replacement: string;
      if (typeof rendered === 'string') {
        replacement = rendered;
      } else if (rendered instanceof HTMLElement) {
        replacement = rendered.outerHTML;
      } else {
        console.warn(`Renderer for "${ref.id}" returned invalid type:`, typeof rendered);
        replacement = keepUnresolved ? ref.originalTag : '';
      }

      result = result.replace(ref.originalTag, replacement);
    } catch (error) {
      console.error(`Error rendering toolcall "${ref.id}":`, error);
      if (!keepUnresolved) {
        result = result.replace(ref.originalTag, '');
      }
    }
  }

  if (shouldResolveMath) {
    return resolveMath(result, { keepUnresolved });
  }

  return result;
}

/**
 * Create a toolcall renderer that generates a DOM element
 * Useful for React/Vue/other frameworks where you want to create actual DOM elements
 *
 * @example
 * ```typescript
 * const buttonRenderer = createElementRenderer((id, params) => {
 *   const button = document.createElement('button');
 *   button.textContent = params.text || 'Click me';
 *   button.className = `btn btn-${params.color || 'primary'}`;
 *   button.onclick = () => alert('Clicked!');
 *   return button;
 * });
 *
 * const renderers = {
 *   BUTTON: buttonRenderer
 * };
 * ```
 */
export function createElementRenderer(
  factory: (id: string, parameters: Record<string, string>) => HTMLElement
): ToolcallRenderer {
  return (id, parameters) => {
    const element = factory(id, parameters);
    return element.outerHTML;
  };
}

/**
 * Batch process multiple toolcalls with the same renderer
 * Useful when you want to apply the same rendering logic to multiple toolcall types
 *
 * @example
 * ```typescript
 * const linkRenderer = (id, params) => `<a href="${params.url}">${params.text}</a>`;
 *
 * const renderers = batchToolcallRenderers(
 *   ['LINK', 'EXTERNAL_LINK', 'DOWNLOAD_LINK'],
 *   linkRenderer
 * );
 * ```
 */
export function batchToolcallRenderers(
  ids: string[],
  renderer: ToolcallRenderer
): ToolcallRenderers {
  const result: ToolcallRenderers = {};
  for (const id of ids) {
    result[id] = renderer;
  }
  return result;
}
