import katex from 'katex';

export interface ResolveMathOptions {
  /**
   * Preserve unresolved tags as-is when rendering fails.
   * Default: false
   */
  keepUnresolved?: boolean;
  /**
   * KaTeX output mode. Default uses MathML so no stylesheet is required.
   */
  output?: 'htmlAndMathml' | 'mathml';
}

function extractAttribute(attributes: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedName}=["']([^"']*)["']`, 'i');
  const match = attributes.match(regex);
  return match ? decodeAttribute(match[1]) : null;
}

function decodeAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Resolve GitCMS LaTeX nodes into renderable math markup.
 *
 * Converts:
 * <gitcms-math data-latex="\\frac{a}{b}" data-display-mode="true"></gitcms-math>
 *
 * into:
 * <div class="gitcms-math gitcms-math-display" data-latex="...">...</div>
 */
export function resolveMath(content: string, options: ResolveMathOptions = {}): string {
  const { keepUnresolved = false, output = 'mathml' } = options;

  return content.replace(
    /<gitcms-math([^>]*?)(?:\/>|>[\s\S]*?<\/gitcms-math>)/gi,
    (fullMatch, attrs: string) => {
      const latex = extractAttribute(attrs, 'data-latex') || '';
      const displayModeAttr = extractAttribute(attrs, 'data-display-mode') || 'false';
      const normalizedDisplayMode = displayModeAttr.toLowerCase();
      const displayMode = normalizedDisplayMode === 'true' || normalizedDisplayMode === '1';

      if (!latex.trim()) {
        return keepUnresolved ? fullMatch : '';
      }

      try {
        const rendered = katex.renderToString(latex, {
          throwOnError: false,
          displayMode,
          output,
        });

        const element = displayMode ? 'div' : 'span';
        const modeClass = displayMode ? 'gitcms-math-display' : 'gitcms-math-inline';
        return `<${element} class="gitcms-math ${modeClass}" data-latex="${escapeHtml(latex)}">${rendered}</${element}>`;
      } catch (error) {
        console.error('Failed to render GitCMS math:', error);
        if (keepUnresolved) {
          return fullMatch;
        }
        const safeLatex = escapeHtml(latex);
        const fallbackElement = displayMode ? 'div' : 'span';
        return `<${fallbackElement} class="gitcms-math gitcms-math-error" data-latex="${safeLatex}">${safeLatex}</${fallbackElement}>`;
      }
    }
  );
}
