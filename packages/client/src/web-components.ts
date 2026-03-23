import katex from 'katex';

function isDisplayMode(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === 'true' || normalized === '1';
}

/**
 * Register GitCMS custom elements for raw rich-text tags rendered with v-html.
 * This allows <gitcms-math> to render even when resolveMath/resolveToolcalls is not called.
 */
export function registerGitCMSWebComponents(): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') {
    return;
  }

  if (!customElements.get('gitcms-math')) {
    class GitCMSMathElement extends HTMLElement {
      static get observedAttributes(): string[] {
        return ['data-latex', 'data-display-mode'];
      }

      connectedCallback(): void {
        this.renderMath();
      }

      attributeChangedCallback(): void {
        this.renderMath();
      }

      private renderMath(): void {
        const latex = this.getAttribute('data-latex') || '';
        const displayMode = isDisplayMode(this.getAttribute('data-display-mode'));

        if (!latex.trim()) {
          this.textContent = '';
          return;
        }

        try {
          const rendered = katex.renderToString(latex, {
            throwOnError: false,
            displayMode,
            output: 'mathml',
          });

          const wrapperTag = displayMode ? 'div' : 'span';
          const modeClass = displayMode ? 'gitcms-math-display' : 'gitcms-math-inline';
          this.innerHTML = `<${wrapperTag} class="gitcms-math ${modeClass}" data-latex="${latex.replace(/"/g, '&quot;')}">${rendered}</${wrapperTag}>`;
          this.style.display = displayMode ? 'block' : 'inline';
        } catch {
          this.textContent = latex;
        }
      }
    }

    customElements.define('gitcms-math', GitCMSMathElement);
  }
}

// Auto-register in browser environments for zero-config rendering.
registerGitCMSWebComponents();
