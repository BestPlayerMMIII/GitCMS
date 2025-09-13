module.exports = {
  root: true,
  extends: [
    '@next/next/core-web-vitals',
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-console': 'warn'
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    '*.config.js'
  ],
  env: {
    browser: true,
    node: true,
    es6: true
  }
}