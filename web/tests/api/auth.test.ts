import { NextRequest } from 'next/server'
import { POST } from '../../src/app/api/auth/register/route'
import { authOptions } from '../../src/app/api/auth/[...nextauth]/route'
import bcrypt from 'bcryptjs'
import * as emailLib from '../../src/lib/email'
import * as entityAssociationLib from '../../src/lib/entity-association'

// Mock external dependencies
jest.mock('../../src/lib/email')
jest.mock('../../src/lib/entity-association')
jest.mock('bcryptjs')

const mockSendEmail = emailLib.sendEmail as jest.MockedFunction<typeof emailLib.sendEmail>
const mockEmailTemplates = emailLib.emailTemplates as jest.Mocked<typeof emailLib.emailTemplates>
const mockAssociateUserWithEntity = entityAssociationLib.associateUserWithEntity as jest.MockedFunction<typeof entityAssociationLib.associateUserWithEntity>
const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>

describe('Auth API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockEmailTemplates.verificationCode = jest.fn().mockReturnValue({
      subject: 'Verify your email',
      html: '<p>Your code is: 123456</p>',
      text: 'Your code is: 123456'
    })
    
    mockSendEmail.mockResolvedValue(undefined)
    mockBcryptHash.mockResolvedValue('hashed_password')
    mockBcryptCompare.mockResolvedValue(true)
  })

  describe('POST /api/auth/register', () => {
    const validRegisterData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    }

    it('should successfully register a new user', async () => {
      // Mock Prisma responses
      global.prismaMock.user.findUnique.mockResolvedValue(null) // No existing user
      global.prismaMock.user.create.mockResolvedValue({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed_password',
        verificationCode: '123456',
        verificationExpiry: new Date(),
        emailVerified: null,
        image: null,
        isAdmin: false,
        subscriptionStatus: 'INACTIVE',
        subscriptionPlan: 'FREE',
        credits: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Mock entity association
      mockAssociateUserWithEntity.mockResolvedValue({
        entity: {
          id: 'company-123',
          name: 'Example Inc',
          domain: 'example.com',
        },
        needsAccessRequest: false,
        membershipCreated: true,
        role: 'ADMIN',
      })

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegisterData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        message: 'Account created successfully! Please check your email.',
        requiresVerification: true,
        needsAccessRequest: false,
        membershipCreated: true,
        role: 'ADMIN',
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        company: {
          id: 'company-123',
          name: 'Example Inc',
          domain: 'example.com',
        },
      })

      // Verify Prisma calls
      expect(global.prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      })
      
      expect(global.prismaMock.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'hashed_password',
          verificationCode: expect.stringMatching(/^\d{6}$/),
          verificationExpiry: expect.any(Date),
          emailVerified: null,
          image: null,
        }),
      })

      // Verify email was sent
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: 'Verify your email',
        html: '<p>Your code is: 123456</p>',
        text: 'Your code is: 123456',
      })
    })

    it('should reject registration with existing email', async () => {
      // Mock existing user
      global.prismaMock.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'john@example.com',
        name: 'Existing User',
        password: 'hashed_password',
        verificationCode: null,
        verificationExpiry: null,
        emailVerified: new Date(),
        image: null,
        isAdmin: false,
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: 'PREMIUM',
        credits: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegisterData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('User with this email already exists')
      
      // Should not attempt to create user
      expect(global.prismaMock.user.create).not.toHaveBeenCalled()
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const invalidData = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
        password: '123', // Too short
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toContain('First name is required')
    })

    it('should handle database errors gracefully', async () => {
      global.prismaMock.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegisterData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toBe('Internal server error')
    })
  })

  describe('NextAuth Configuration', () => {
    it('should have correct providers configured', () => {
      expect(authOptions.providers).toHaveLength(3)
      
      const providerIds = authOptions.providers.map(p => p.id)
      expect(providerIds).toContain('google')
      expect(providerIds).toContain('azure-ad-b2c')
      expect(providerIds).toContain('credentials')
    })

    it('should use JWT strategy', () => {
      expect(authOptions.session?.strategy).toBe('jwt')
    })

    it('should have custom pages configured', () => {
      expect(authOptions.pages?.signIn).toBe('/sign-in')
      expect(authOptions.pages?.signUp).toBe('/sign-up')
      expect(authOptions.pages?.error).toBe('/auth/error')
    })
  })

  describe('Credentials Provider', () => {
    const credentialsProvider = authOptions.providers.find(p => p.id === 'credentials')

    it('should authorize valid credentials', async () => {
      if (!credentialsProvider || !('authorize' in credentialsProvider)) {
        fail('Credentials provider not found or missing authorize method')
      }

      // Mock user lookup
      global.prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
        password: 'hashed_password',
        emailVerified: new Date(),
        image: null,
        verificationCode: null,
        verificationExpiry: null,
        isAdmin: false,
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: 'PREMIUM',
        credits: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockBcryptCompare.mockResolvedValue(true)

      const result = await credentialsProvider.authorize({
        email: 'john@example.com',
        password: 'password123',
      }, {} as any)

      expect(result).toEqual({
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
        image: null,
        emailVerified: expect.any(Date),
      })
    })

    it('should reject invalid credentials', async () => {
      if (!credentialsProvider || !('authorize' in credentialsProvider)) {
        fail('Credentials provider not found or missing authorize method')
      }

      global.prismaMock.user.findUnique.mockResolvedValue(null)

      const result = await credentialsProvider.authorize({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      }, {} as any)

      expect(result).toBeNull()
    })

    it('should reject when password comparison fails', async () => {
      if (!credentialsProvider || !('authorize' in credentialsProvider)) {
        fail('Credentials provider not found or missing authorize method')
      }

      global.prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
        password: 'hashed_password',
        emailVerified: new Date(),
        image: null,
        verificationCode: null,
        verificationExpiry: null,
        isAdmin: false,
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: 'PREMIUM',
        credits: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockBcryptCompare.mockResolvedValue(false)

      const result = await credentialsProvider.authorize({
        email: 'john@example.com',
        password: 'wrongpassword',
      }, {} as any)

      expect(result).toBeNull()
    })
  })
})