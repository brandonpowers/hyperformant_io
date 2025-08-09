import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright Global Teardown...');
  
  try {
    // Clean up any global test data
    // Reset test database if needed
    // Close any persistent connections
    
    console.log('✅ Global teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the test suite
  }
}

export default globalTeardown;