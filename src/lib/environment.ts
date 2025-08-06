import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables (supports multiple .env files)
config({ path: '.env.local' });
config({ path: '.env.development' });
config({ path: '.env' });

// Define environment schema
const EnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default('8080'),

  // Database
  DATABASE_URL: z.string().url(),

  // Apollo.io
  APOLLO_API_KEY: z.string().min(1),

  // AI Services
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // Payment
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // n8n
  N8N_URL: z.string().url().default('http://localhost:5678'),
  N8N_API_KEY: z.string().optional(),

  // AWS
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // Security
  JWT_SECRET: z.string().min(32),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Validates and returns environment variables
 * Throws an error if required variables are missing or invalid
 */
export function validateEnvironment(): Environment {
  try {
    return EnvironmentSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((issue: any) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

/**
 * Get environment variables (validates on first call)
 */
let cachedEnv: Environment | null = null;

export function getEnvironment(): Environment {
  if (!cachedEnv) {
    cachedEnv = validateEnvironment();
  }
  return cachedEnv;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment().NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment().NODE_ENV === 'production';
}
