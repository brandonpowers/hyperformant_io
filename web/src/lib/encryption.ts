/**
 * Encryption utilities for secure credential storage
 * Uses AES-256-GCM for symmetric encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Get the master encryption key from environment
 */
function getMasterKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;
  
  if (!keyString) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  if (keyString.length !== 64) { // 32 bytes as hex = 64 characters
    throw new Error('ENCRYPTION_KEY must be 64 characters (32 bytes as hex)');
  }
  
  return Buffer.from(keyString, 'hex');
}

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt sensitive data
 */
export function encrypt(plaintext: string): string {
  try {
    const masterKey = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipher(ALGORITHM, masterKey, { iv });
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'hex'),
      tag
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  try {
    const masterKey = getMasterKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(-TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, -TAG_LENGTH);
    
    const decipher = crypto.createDecipher(ALGORITHM, masterKey, { iv });
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt credential data for storage
 */
export function encryptCredentials(credentials: Record<string, any>): string {
  const jsonString = JSON.stringify(credentials);
  return encrypt(jsonString);
}

/**
 * Decrypt credential data from storage
 */
export function decryptCredentials(encryptedData: string): Record<string, any> {
  const jsonString = decrypt(encryptedData);
  return JSON.parse(jsonString);
}

/**
 * Validate encryption key format
 */
export function validateEncryptionKey(key: string): boolean {
  try {
    if (key.length !== 64) return false;
    Buffer.from(key, 'hex');
    return true;
  } catch {
    return false;
  }
}

/**
 * Hash a value for comparison (one-way)
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Credential type definitions
 */
export interface CredentialData {
  // Common authentication types
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  username?: string;
  password?: string;
  
  // Custom headers or additional data
  customHeaders?: Record<string, string>;
  customData?: Record<string, any>;
  
  // OAuth2 specific
  tokenUrl?: string;
  authUrl?: string;
  scopes?: string[];
  
  // Metadata
  environment?: 'sandbox' | 'production';
  provider?: string;
  description?: string;
}

/**
 * Encrypt credential data with type safety
 */
export function encryptCredentialData(data: CredentialData): string {
  return encryptCredentials(data);
}

/**
 * Decrypt credential data with type safety
 */
export function decryptCredentialData(encryptedData: string): CredentialData {
  return decryptCredentials(encryptedData) as CredentialData;
}

/**
 * Sanitize credentials for logging (remove sensitive fields)
 */
export function sanitizeCredentials(credentials: CredentialData): Record<string, any> {
  const sanitized = { ...credentials };
  
  // Remove sensitive fields
  delete sanitized.apiKey;
  delete sanitized.clientSecret;
  delete sanitized.accessToken;
  delete sanitized.refreshToken;
  delete sanitized.password;
  
  // Mask partial values for debugging
  if (credentials.apiKey) {
    sanitized.apiKey = `${credentials.apiKey.substring(0, 8)}...`;
  }
  
  if (credentials.clientId) {
    sanitized.clientId = credentials.clientId; // Client ID is usually not sensitive
  }
  
  return sanitized;
}

/**
 * Validate credential data structure
 */
export function validateCredentialData(data: any): data is CredentialData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  // At least one authentication method must be present
  const hasAuth = !!(
    data.apiKey ||
    data.accessToken ||
    (data.clientId && data.clientSecret) ||
    (data.username && data.password)
  );
  
  return hasAuth;
}