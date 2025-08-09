import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// Mock Prisma Client - create a global mock instance
const prismaMock = mockDeep<PrismaClient>()

jest.mock('@prisma/client', () => ({
  __esModule: true,
  PrismaClient: jest.fn(() => prismaMock),
}))

// Mock NextAuth
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/next', () => ({
  __esModule: true,
  NextAuthHandler: jest.fn(),
  getServerSession: jest.fn(),
}))

// Mock Stripe
jest.mock('stripe', () => {
  const mockStripe = {
    webhooks: {
      constructEvent: jest.fn(),
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      list: jest.fn(),
    },
    prices: {
      list: jest.fn(),
      retrieve: jest.fn(),
    },
    products: {
      list: jest.fn(),
      retrieve: jest.fn(),
    },
    paymentMethods: {
      attach: jest.fn(),
      detach: jest.fn(),
      list: jest.fn(),
    },
    setupIntents: {
      create: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
      confirm: jest.fn(),
    },
  }
  
  return {
    __esModule: true,
    default: jest.fn(() => mockStripe),
  }
})

// Mock Resend/Email service
jest.mock('resend', () => ({
  __esModule: true,
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}))

// Mock OpenAI/AI services
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}))

// Mock N8N webhooks - commented out until N8N lib is implemented
// jest.mock('@/lib/n8n', () => ({
//   __esModule: true,
//   triggerWorkflow: jest.fn(),
//   sendWebhook: jest.fn(),
// }))

// Global test setup
declare global {
  var prismaMock: DeepMockProxy<PrismaClient>
}

global.prismaMock = prismaMock

// Reset mocks before each test
beforeEach(() => {
  mockReset(global.prismaMock)
})

// Global test environment setup
beforeAll(() => {
  // Set environment variables for testing
  process.env.NODE_ENV = 'test'
  process.env.NEXTAUTH_SECRET = 'test-secret'
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/hyperformant_test'
  process.env.STRIPE_SECRET_KEY = 'sk_test_12345'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_12345'
  process.env.RESEND_API_KEY = 'test_resend_key'
})

// Cleanup after all tests
afterAll(() => {
  jest.clearAllMocks()
})