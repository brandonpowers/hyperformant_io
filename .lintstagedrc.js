module.exports = {
  // All TypeScript/JavaScript files (CLI and web) - run unified ESLint and Prettier
  '{src,web/src}/**/*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],

  // JSON, Markdown, and other files - run Prettier only
  '*.{json,md,yml,yaml}': ['prettier --write'],
  '{src,web}/**/*.{json,md}': ['prettier --write'],

  // Package.json files - run Prettier
  'package.json': ['prettier --write'],
  'web/package.json': ['prettier --write'],

  // Config files - run Prettier
  '*.{js,jsx}': ['prettier --write'],
};
