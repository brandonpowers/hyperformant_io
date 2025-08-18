/**
 * Infisical SDK Integration
 * Provides secure secret management for the application
 */

interface InfisicalConfig {
  token: string;
  environment: 'development' | 'staging' | 'production';
  projectId?: string;
}

interface SecretResponse {
  key: string;
  value: string;
  environment: string;
  type: 'shared' | 'personal';
}

/**
 * Infisical client for fetching secrets
 */
export class InfisicalClient {
  private config: InfisicalConfig;
  private baseUrl: string;

  constructor(config: InfisicalConfig) {
    this.config = config;
    this.baseUrl = process.env.INFISICAL_URL || 'http://localhost:8080';
  }

  /**
   * Fetch a single secret by key
   */
  async getSecret(key: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/secrets/${key}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch secret ${key}: ${response.status}`);
        return null;
      }

      const data: SecretResponse = await response.json();
      return data.value;
    } catch (error) {
      console.error(`Error fetching secret ${key}:`, error);
      return null;
    }
  }

  /**
   * Fetch multiple secrets at once
   */
  async getSecrets(keys: string[]): Promise<Record<string, string>> {
    const promises = keys.map(async (key) => {
      const value = await this.getSecret(key);
      return { key, value };
    });

    const results = await Promise.all(promises);
    const secrets: Record<string, string> = {};

    results.forEach(({ key, value }) => {
      if (value !== null) {
        secrets[key] = value;
      }
    });

    return secrets;
  }

  /**
   * Check if Infisical is available and configured
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`, {
        method: 'GET',
        timeout: 2000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Create Infisical client from environment
 */
export function createInfisicalClient(): InfisicalClient | null {
  const nodeEnv = process.env.NODE_ENV || 'development';
  let environment: 'development' | 'staging' | 'production';
  
  switch (nodeEnv) {
    case 'production':
      environment = 'production';
      break;
    case 'staging':
      environment = 'staging';
      break;
    default:
      environment = 'development';
      break;
  }

  // Try to get the appropriate token for the environment
  const tokenKey = `INFISICAL_TOKEN_${environment.toUpperCase()}`;
  const token = process.env[tokenKey];

  if (!token) {
    console.warn(`Infisical token not found for environment: ${environment}`);
    return null;
  }

  return new InfisicalClient({
    token,
    environment,
  });
}

/**
 * Cached secret manager with fallback to environment variables
 */
class SecretManager {
  private infisical: InfisicalClient | null = null;
  private cache: Map<string, { value: string; expiry: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.infisical = createInfisicalClient();
  }

  /**
   * Get a secret with fallback to environment variable
   */
  async getSecret(key: string): Promise<string | null> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    let value: string | null = null;

    // Try Infisical first
    if (this.infisical) {
      try {
        value = await this.infisical.getSecret(key);
      } catch (error) {
        console.warn(`Failed to fetch secret ${key} from Infisical:`, error);
      }
    }

    // Fallback to environment variable
    if (value === null) {
      value = process.env[key] || null;
      if (value) {
        console.info(`Using environment fallback for secret: ${key}`);
      }
    }

    // Cache the result
    if (value !== null) {
      this.cache.set(key, {
        value,
        expiry: Date.now() + this.cacheTTL,
      });
    }

    return value;
  }

  /**
   * Get multiple secrets with fallback
   */
  async getSecrets(keys: string[]): Promise<Record<string, string>> {
    const promises = keys.map(async (key) => {
      const value = await this.getSecret(key);
      return { key, value };
    });

    const results = await Promise.all(promises);
    const secrets: Record<string, string> = {};

    results.forEach(({ key, value }) => {
      if (value !== null) {
        secrets[key] = value;
      }
    });

    return secrets;
  }

  /**
   * Clear the secret cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if Infisical is being used
   */
  isUsingInfisical(): boolean {
    return this.infisical !== null;
  }
}

// Export singleton instance
export const secretManager = new SecretManager();

/**
 * Helper function to get secrets commonly used in the application
 */
export async function getAIProviderSecrets() {
  return await secretManager.getSecrets([
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_AI_API_KEY',
  ]);
}

export async function getDataSourceSecrets() {
  return await secretManager.getSecrets([
    'APOLLO_API_KEY',
    'PLAUSIBLE_API_KEY', 
    'RESEND_API_KEY',
  ]);
}

export async function getInfrastructureSecrets() {
  return await secretManager.getSecrets([
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'N8N_API_KEY',
  ]);
}