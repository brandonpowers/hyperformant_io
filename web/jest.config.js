const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.ts?(x)',
    '**/__tests__/**/*.test.ts?(x)',
  ],
  
  // Ensure Jest can find modules in node_modules
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  
  // File extensions Jest should resolve
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Ensure Jest runs from the web directory
  rootDir: './',
  
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/.next/',
    '/coverage/',
    // Exclude dashboard/reporting (WIP)
    'dashboard',
    'reports',
    'ReportsDashboard',
    'CompanyCard',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
  // Use maximum 50% of available CPU cores for parallel test execution
  maxWorkers: '50%',
  // Let Next.js handle transformations
  // Transform ESM modules that need it
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|nanoid|@auth/prisma-adapter|jose|next-auth)/)',
  ],
  // Coverage collection settings
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/generated/**',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config)