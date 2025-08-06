module.exports = {
  // TypeScript files in src directory only - run ESLint with auto-fix
  'src/**/*.{ts,tsx}': ['eslint --fix', 'prettier --write'],

  // JSON, Markdown, and other files (excluding app/) - run Prettier only
  '*.{json,md,yml,yaml}': ['prettier --write'],

  // Package.json files - run Prettier
  'package.json': ['prettier --write'],

  // Config files - run Prettier
  '*.{js,jsx}': ['prettier --write'],
};
