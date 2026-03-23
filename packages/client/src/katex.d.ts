declare module 'katex' {
  export interface KatexRenderOptions {
    displayMode?: boolean;
    throwOnError?: boolean;
    output?: 'html' | 'mathml' | 'htmlAndMathml';
  }

  export function renderToString(expression: string, options?: KatexRenderOptions): string;

  const katex: {
    renderToString: typeof renderToString;
  };

  export default katex;
}
