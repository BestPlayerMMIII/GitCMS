import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  // Base JS config
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',

        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        File: 'readonly',
        FileList: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        XMLHttpRequest: 'readonly',
        EventSource: 'readonly',
        TextEncoder: 'readonly',
        ReadableStream: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLImageElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        KeyboardEvent: 'readonly',
        Image: 'readonly',
        AbortSignal: 'readonly',
        React: 'readonly',
        performance: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'warn',
      'no-console': 'warn',
      'no-undef': 'error',
      'no-useless-escape': 'warn',
      'no-empty': 'warn',
      'no-redeclare': 'warn',
      'no-case-declarations': 'warn',
      'react-hooks/exhaustive-deps': 'off',
    },
  },

  // Prettier config (should be last)
  prettier,

  // Global ignores
  {
    ignores: ['node_modules/**', 'dist/**', '.next/**', '*.config.js', 'package-lock.json'],
  },
];
