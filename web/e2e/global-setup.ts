import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Starting Playwright Global Setup...');
  
  const { baseURL } = config.projects[0].use;
  
  // Launch browser to prepare test environment
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the application to be ready
    console.log(`⏳ Waiting for application at ${baseURL}...`);
    await page.goto(baseURL || 'http://localhost:3000', { waitUntil: 'domcontentloaded' });
    console.log('✅ Application is ready');
    
    // Optionally: Set up test data, authenticate admin user, etc.
    // For now, we'll just verify the app is running
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global setup completed');
}

export default globalSetup;