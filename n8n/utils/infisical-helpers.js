/**
 * Infisical Helper Functions for N8N Workflows
 * Provides secure secret fetching for N8N automation workflows
 */

/**
 * Fetch a secret from Infisical with environment fallback
 * @param {string} secretKey - The key of the secret to fetch
 * @param {string} environment - The environment (development, staging, production)
 * @returns {Promise<string|null>} The secret value or null if not found
 */
async function getInfisicalSecret(secretKey, environment = 'development') {
  const baseUrl = process.env.INFISICAL_URL || 'http://infisical:8080';
  const tokenKey = `INFISICAL_TOKEN_${environment.toUpperCase()}`;
  const token = process.env[tokenKey];

  if (!token) {
    console.warn(`Infisical token not found for environment: ${environment}`);
    return process.env[secretKey] || null;
  }

  try {
    const response = await fetch(`${baseUrl}/api/v2/secrets/${secretKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch secret ${secretKey}: ${response.status}`);
      return process.env[secretKey] || null;
    }

    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error(`Error fetching secret ${secretKey}:`, error);
    return process.env[secretKey] || null;
  }
}

/**
 * Fetch multiple secrets from Infisical
 * @param {string[]} secretKeys - Array of secret keys to fetch
 * @param {string} environment - The environment (development, staging, production)
 * @returns {Promise<Object>} Object with secret keys and values
 */
async function getInfisicalSecrets(secretKeys, environment = 'development') {
  const promises = secretKeys.map(async (key) => {
    const value = await getInfisicalSecret(key, environment);
    return { key, value };
  });

  const results = await Promise.all(promises);
  const secrets = {};

  results.forEach(({ key, value }) => {
    if (value !== null) {
      secrets[key] = value;
    }
  });

  return secrets;
}

/**
 * Get AI provider credentials for dynamic model selection
 * @param {string} environment - The environment (development, staging, production)
 * @returns {Promise<Object>} AI provider credentials
 */
async function getAICredentials(environment = 'development') {
  return await getInfisicalSecrets([
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_AI_API_KEY',
  ], environment);
}

/**
 * Get data source credentials for market intelligence
 * @param {string} environment - The environment (development, staging, production)
 * @returns {Promise<Object>} Data source credentials
 */
async function getDataSourceCredentials(environment = 'development') {
  return await getInfisicalSecrets([
    'APOLLO_API_KEY',
    'PLAUSIBLE_API_KEY',
    'RESEND_API_KEY',
    'REDDIT_CLIENT_ID',
    'REDDIT_CLIENT_SECRET',
    'TWITTER_BEARER_TOKEN',
    'G2_API_KEY',
  ], environment);
}

/**
 * Execute AI task with dynamic credential fetching
 * @param {string} taskType - Type of AI task (analysis, creative, etc.)
 * @param {string} content - Content for the AI task
 * @param {Object} options - Task options and preferences
 * @param {string} environment - The environment for credentials
 * @returns {Promise<Object>} AI execution result
 */
async function executeAITaskWithSecrets(taskType, content, options = {}, environment = 'development') {
  const nextjsApiUrl = process.env.NEXTJS_API_URL || 'http://localhost:3000/api';
  const internalApiKey = await getInfisicalSecret('INTERNAL_API_KEY', environment);

  if (!internalApiKey) {
    throw new Error('INTERNAL_API_KEY not found in secrets');
  }

  const taskRequest = {
    taskType,
    content,
    priority: options.priority || 'medium',
    maxCost: options.maxCost,
    maxLatency: options.maxLatency,
    capabilities: options.capabilities,
    modelPreferences: options.modelPreferences,
    parameters: options.parameters,
    metadata: {
      workflow: 'n8n',
      environment,
      timestamp: new Date().toISOString(),
      ...options.metadata
    }
  };

  try {
    const response = await fetch(`${nextjsApiUrl}/internal/ai/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${internalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskRequest),
    });

    if (!response.ok) {
      throw new Error(`AI execution failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI task execution error:', error);
    throw error;
  }
}

/**
 * Get available AI providers and models
 * @param {string} environment - The environment for credentials
 * @returns {Promise<Object>} Available providers and models
 */
async function getAvailableAIProviders(environment = 'development') {
  const nextjsApiUrl = process.env.NEXTJS_API_URL || 'http://localhost:3000/api';
  const internalApiKey = await getInfisicalSecret('INTERNAL_API_KEY', environment);

  if (!internalApiKey) {
    throw new Error('INTERNAL_API_KEY not found in secrets');
  }

  try {
    const response = await fetch(`${nextjsApiUrl}/internal/ai/providers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${internalApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AI providers: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching AI providers:', error);
    throw error;
  }
}

/**
 * Fetch data source credentials via internal API
 * @param {string} sourceId - Data source ID or name
 * @param {string} environment - The environment for credentials
 * @returns {Promise<Object>} Decrypted data source credentials
 */
async function getDataSourceCredentialsViaAPI(sourceId, environment = 'development') {
  const nextjsApiUrl = process.env.NEXTJS_API_URL || 'http://localhost:3000/api';
  const internalApiKey = await getInfisicalSecret('INTERNAL_API_KEY', environment);

  if (!internalApiKey) {
    throw new Error('INTERNAL_API_KEY not found in secrets');
  }

  try {
    const response = await fetch(`${nextjsApiUrl}/internal/credentials/decrypt/${sourceId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${internalApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch credentials for ${sourceId}: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching credentials for ${sourceId}:`, error);
    throw error;
  }
}

/**
 * Test Infisical connectivity
 * @param {string} environment - The environment to test
 * @returns {Promise<boolean>} True if Infisical is accessible
 */
async function testInfisicalConnectivity(environment = 'development') {
  const baseUrl = process.env.INFISICAL_URL || 'http://infisical:8080';
  
  try {
    const response = await fetch(`${baseUrl}/api/status`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.error('Infisical connectivity test failed:', error);
    return false;
  }
}

// Export functions for use in N8N workflows
module.exports = {
  getInfisicalSecret,
  getInfisicalSecrets,
  getAICredentials,
  getDataSourceCredentials,
  executeAITaskWithSecrets,
  getAvailableAIProviders,
  getDataSourceCredentialsViaAPI,
  testInfisicalConnectivity,

  // Convenience aliases
  getSecret: getInfisicalSecret,
  getSecrets: getInfisicalSecrets,
  executeAI: executeAITaskWithSecrets,
  getAIProviders: getAvailableAIProviders,
  getDataSourceCreds: getDataSourceCredentialsViaAPI,
  testConnection: testInfisicalConnectivity,
};