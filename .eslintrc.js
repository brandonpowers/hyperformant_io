module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'next/core-web-vitals', // Next.js recommended rules
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    // React/Next.js specific
    'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    '@next/next/no-html-link-for-pages': ['error', 'web/src/app/'],
    
    // TypeScript rules
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // General rules
    'no-console': 'off', // Allow console.log in CLI tools
    'no-empty': 'warn',
  },
  ignorePatterns: [
    'dist/',
    'coverage/',
    'node_modules/',
    'web/node_modules/',
    'web/.next/',
    'web/out/',
    '*.config.js',
  ],
  overrides: [
    {
      // CLI TypeScript files (no React)
      files: ['src/**/*.ts'],
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
      },
    },
    {
      // Test files
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
