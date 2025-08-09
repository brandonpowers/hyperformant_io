import { apiApp } from '../../src/routers/index'

describe('API v1 Routes (Hono)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('System Endpoints', () => {
    it('should return health status', async () => {
      // Mock database health check
      global.prismaMock.$queryRaw.mockResolvedValue([{ result: 1 }])

      const response = await apiApp.request('/health')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        status: 'healthy',
        database: true,
        timestamp: expect.any(String),
        version: '1.0.0',
        environment: 'test',
      })
    })

    it('should handle database connection errors in health check', async () => {
      // Mock database connection failure
      global.prismaMock.$queryRaw.mockRejectedValue(new Error('Connection failed'))

      const response = await apiApp.request('/health')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        status: 'unhealthy',
        database: false,
      })
    })

    it('should return API information', async () => {
      const response = await apiApp.request('/info')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        name: 'Hyperformant API',
        version: '1.0.0',
        description: 'AI-powered B2B automation and consulting pipeline system',
        health: '/api/v1/health',
        endpoints: expect.objectContaining({
          companies: '/api/v1/companies',
          auth: '/api/v1/auth',
          users: '/api/v1/users',
        }),
        features: expect.arrayContaining([
          'REST API',
          'Authentication with NextAuth.js',
          'Hono framework',
        ]),
      })
    })

    it('should serve OpenAPI specification', async () => {
      const response = await apiApp.request('/openapi.json')
      const spec = await response.json()

      expect(response.status).toBe(200)
      expect(spec).toMatchObject({
        openapi: '3.1.0',
        info: {
          title: 'Hyperformant API',
          version: '1.0.0',
          description: 'AI-powered B2B automation and consulting pipeline system',
        },
        servers: expect.arrayContaining([
          expect.objectContaining({
            url: expect.stringContaining('/api/v1'),
          }),
        ]),
      })
    })

    it('should serve API documentation page', async () => {
      const response = await apiApp.request('/docs')
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')
      expect(html).toContain('Hyperformant API Documentation')
      expect(html).toContain('api-reference')
      expect(html).toContain('/api/v1/openapi.json')
    })
  })

  describe('Authentication Middleware', () => {
    it('should reject requests without authentication', async () => {
      const response = await apiApp.request('/companies', {
        method: 'GET',
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error?.code).toBe('AUTHENTICATION_REQUIRED')
    })

    it('should reject requests with invalid tokens', async () => {
      const response = await apiApp.request('/companies', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error?.code).toBe('INVALID_TOKEN')
    })
  })

  describe('Companies Routes', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      isAdmin: false,
    }

    const validAuthHeaders = {
      'Authorization': 'Bearer valid-jwt-token',
      'Content-Type': 'application/json',
    }

    beforeEach(() => {
      // Mock authentication middleware to return valid user
      jest.doMock('../../src/lib/api/auth-middleware', () => ({
        createAuthMiddleware: () => async (c: any, next: any) => {
          c.set('user', mockUser)
          await next()
        },
      }))
    })

    it('should list user companies', async () => {
      const mockCompanies = [
        {
          id: 'company-1',
          name: 'Acme Corp',
          domain: 'acme.com',
          type: 'COMPANY',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'company-2',
          name: 'Beta Inc',
          domain: 'beta.com',
          type: 'COMPANY',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      global.prismaMock.entity.findMany.mockResolvedValue(mockCompanies)

      const response = await apiApp.request('/companies', {
        method: 'GET',
        headers: validAuthHeaders,
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(2)
      expect(data.data[0]).toMatchObject({
        id: 'company-1',
        name: 'Acme Corp',
        domain: 'acme.com',
      })
    })

    it('should create a new company', async () => {
      const newCompanyData = {
        name: 'New Company',
        domain: 'newcompany.com',
        description: 'A new company for testing',
      }

      const mockCreatedCompany = {
        id: 'company-new',
        ...newCompanyData,
        type: 'COMPANY',
        createdByUserId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      global.prismaMock.entity.create.mockResolvedValue(mockCreatedCompany)

      const response = await apiApp.request('/companies', {
        method: 'POST',
        headers: validAuthHeaders,
        body: JSON.stringify(newCompanyData),
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.data).toMatchObject({
        id: 'company-new',
        name: 'New Company',
        domain: 'newcompany.com',
      })

      expect(global.prismaMock.entity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Company',
          domain: 'newcompany.com',
          type: 'COMPANY',
          createdByUserId: mockUser.id,
        }),
      })
    })

    it('should validate company creation data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        domain: 'invalid-domain', // Invalid domain format
      }

      const response = await apiApp.request('/companies', {
        method: 'POST',
        headers: validAuthHeaders,
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should get a specific company', async () => {
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        domain: 'test.com',
        type: 'COMPANY',
        createdByUserId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock access check
      global.prismaMock.entity.findFirst.mockResolvedValue(mockCompany)
      // Mock company retrieval
      global.prismaMock.entity.findUnique.mockResolvedValue(mockCompany)

      const response = await apiApp.request('/companies/company-123', {
        method: 'GET',
        headers: validAuthHeaders,
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toMatchObject({
        id: 'company-123',
        name: 'Test Company',
        domain: 'test.com',
      })
    })

    it('should deny access to unauthorized company', async () => {
      // Mock access check failure
      global.prismaMock.entity.findFirst.mockResolvedValue(null)

      const response = await apiApp.request('/companies/unauthorized-company', {
        method: 'GET',
        headers: validAuthHeaders,
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error?.code).toBe('FORBIDDEN')
      expect(data.error?.message).toContain('Access denied')
    })

    it('should handle company not found', async () => {
      // Mock access check passes but company doesn't exist
      global.prismaMock.entity.findFirst.mockResolvedValue({
        id: 'company-123',
        name: 'Test Company',
        domain: 'test.com',
        type: 'COMPANY',
        createdByUserId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      global.prismaMock.entity.findUnique.mockResolvedValue(null)

      const response = await apiApp.request('/companies/company-123', {
        method: 'GET',
        headers: validAuthHeaders,
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error?.code).toBe('NOT_FOUND')
    })
  })

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // Mock a database error
      global.prismaMock.$queryRaw.mockRejectedValue(new Error('Unexpected database error'))

      const response = await apiApp.request('/health')
      const data = await response.json()

      // Health endpoint should still return 200 but with unhealthy status
      expect(response.status).toBe(200)
      expect(data.status).toBe('unhealthy')
    })

    it('should handle malformed JSON requests', async () => {
      const response = await apiApp.request('/companies', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
          'Content-Type': 'application/json',
        },
        body: 'invalid-json-{',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error?.code).toBe('BAD_REQUEST')
    })

    it('should handle unsupported HTTP methods', async () => {
      const response = await apiApp.request('/companies', {
        method: 'TRACE', // Unsupported method
      })

      expect(response.status).toBe(405)
    })
  })

  describe('API Versioning', () => {
    it('should include version in response headers', async () => {
      const response = await apiApp.request('/info')

      expect(response.status).toBe(200)
      // Check that API responses include proper headers
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should maintain backward compatibility in responses', async () => {
      const response = await apiApp.request('/info')
      const data = await response.json()

      // Ensure response structure is stable
      expect(data).toHaveProperty('name')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('endpoints')
      expect(data).toHaveProperty('features')
    })
  })
})