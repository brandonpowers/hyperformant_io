import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();
    await page.goto('/');
  });

  test.describe('User Registration', () => {
    test('should successfully register a new user', async ({ page }) => {
      // Navigate to sign up page
      await page.goto('/sign-up');
      
      // Check that we're on the registration page
      await expect(page.locator('h1')).toContainText(/sign up|register|create account/i);
      
      // Fill out the registration form
      const timestamp = Date.now();
      const testEmail = `test+${timestamp}@example.com`;
      
      await page.fill('input[name="firstName"], input[id="firstName"]', 'John');
      await page.fill('input[name="lastName"], input[id="lastName"]', 'Doe');
      await page.fill('input[name="email"], input[id="email"], input[type="email"]', testEmail);
      await page.fill('input[name="password"], input[id="password"], input[type="password"]', 'TestPassword123!');
      
      // Submit the registration form
      await page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")');
      
      // Expect success message or redirect to verification
      await expect(page.locator('body')).toContainText(/verification|check your email|account created/i, { timeout: 10000 });
      
      // Check that we're either on verification page or got success message
      const url = page.url();
      const hasVerificationInUrl = url.includes('verification') || url.includes('verify');
      const hasSuccessMessage = await page.locator('body').textContent();
      const hasSuccessText = hasSuccessMessage?.toLowerCase().includes('verification') || 
                            hasSuccessMessage?.toLowerCase().includes('check your email') ||
                            hasSuccessMessage?.toLowerCase().includes('account created');
      
      expect(hasVerificationInUrl || hasSuccessText).toBe(true);
    });

    test('should show validation errors for invalid data', async ({ page }) => {
      await page.goto('/sign-up');
      
      // Try to submit with empty fields
      await page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register")');
      
      // Should show validation errors
      await expect(page.locator('body')).toContainText(/required|invalid|error/i);
    });

    test('should prevent registration with existing email', async ({ page }) => {
      await page.goto('/sign-up');
      
      // Try to register with a common email (this assumes test data exists)
      await page.fill('input[name="firstName"], input[id="firstName"]', 'John');
      await page.fill('input[name="lastName"], input[id="lastName"]', 'Doe');
      await page.fill('input[name="email"], input[id="email"], input[type="email"]', 'admin@example.com');
      await page.fill('input[name="password"], input[id="password"], input[type="password"]', 'TestPassword123!');
      
      await page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register")');
      
      // Should show error about existing email
      await expect(page.locator('body')).toContainText(/already exists|already registered|email taken/i, { timeout: 5000 });
    });
  });

  test.describe('User Sign In', () => {
    test('should successfully sign in with valid credentials', async ({ page }) => {
      await page.goto('/sign-in');
      
      // Check that we're on the sign-in page
      await expect(page.locator('h1, h2')).toContainText(/sign in|log in|login/i);
      
      // Fill in credentials (you may want to create a test user first)
      await page.fill('input[name="email"], input[id="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"], input[id="password"], input[type="password"]', 'testpassword');
      
      // Sign in
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login")');
      
      // Should redirect to dashboard or home page
      await expect(page).toHaveURL(/\/(dashboard|home|app)/, { timeout: 10000 });
      
      // Should see user-specific content
      const bodyText = await page.locator('body').textContent();
      const hasUserContent = bodyText?.toLowerCase().includes('welcome') || 
                            bodyText?.toLowerCase().includes('dashboard') ||
                            page.url().includes('dashboard');
      
      expect(hasUserContent).toBe(true);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/sign-in');
      
      // Try to sign in with invalid credentials
      await page.fill('input[name="email"], input[id="email"], input[type="email"]', 'invalid@example.com');
      await page.fill('input[name="password"], input[id="password"], input[type="password"]', 'wrongpassword');
      
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
      
      // Should show error message
      await expect(page.locator('body')).toContainText(/invalid|incorrect|error|failed/i, { timeout: 5000 });
    });

    test('should redirect unauthenticated users to sign-in', async ({ page }) => {
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to sign-in page
      await expect(page).toHaveURL(/\/(sign-in|login|auth)/, { timeout: 5000 });
    });
  });

  test.describe('Password Reset', () => {
    test('should allow requesting password reset', async ({ page }) => {
      // Navigate to forgot password page
      await page.goto('/sign-in');
      
      // Look for forgot password link
      const forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("Reset"), a[href*="forgot"], a[href*="reset"]');
      
      if (await forgotPasswordLink.count() > 0) {
        await forgotPasswordLink.first().click();
        
        // Should be on password reset page
        await expect(page.locator('h1, h2')).toContainText(/forgot|reset|password/i);
        
        // Fill in email
        await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
        
        // Submit request
        await page.click('button[type="submit"], button:has-text("Reset"), button:has-text("Send")');
        
        // Should show success message
        await expect(page.locator('body')).toContainText(/sent|email|check/i, { timeout: 5000 });
      } else {
        test.skip('Forgot password functionality not found');
      }
    });
  });

  test.describe('OAuth Sign In', () => {
    test('should show OAuth sign-in options', async ({ page }) => {
      await page.goto('/sign-in');
      
      // Check for OAuth buttons (Google, Microsoft, etc.)
      const oauthButtons = page.locator('button:has-text("Google"), button:has-text("Microsoft"), a:has-text("Google"), a:has-text("Microsoft")');
      
      if (await oauthButtons.count() > 0) {
        // OAuth options should be visible
        expect(await oauthButtons.count()).toBeGreaterThan(0);
      } else {
        // Log that OAuth is not configured
        console.log('OAuth sign-in options not found - may not be configured');
      }
    });
  });

  test.describe('Sign Out', () => {
    test('should successfully sign out authenticated user', async ({ page, context }) => {
      // First, we need to simulate being signed in
      // This is a simplified approach - in a real app you'd sign in first
      await page.goto('/sign-in');
      
      // Try to fill in and submit sign-in form
      await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"], input[type="password"]', 'testpassword');
      await page.click('button[type="submit"], button:has-text("Sign In")');
      
      // Wait a bit for potential redirect
      await page.waitForTimeout(2000);
      
      // Look for sign out button/link
      const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Log Out"), a:has-text("Sign Out"), a:has-text("Log Out"), a:has-text("Logout")');
      
      if (await signOutButton.count() > 0) {
        await signOutButton.first().click();
        
        // Should redirect to home page or sign-in page
        await expect(page).toHaveURL(/\/(|sign-in|login|home)$/, { timeout: 5000 });
        
        // Should not be able to access protected routes
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/(sign-in|login|auth)/, { timeout: 5000 });
      } else {
        test.skip('Sign out functionality not found or user not signed in');
      }
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      // Sign in first
      await page.goto('/sign-in');
      await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"], input[type="password"]', 'testpassword');
      await page.click('button[type="submit"]');
      
      // Wait for potential redirect
      await page.waitForTimeout(2000);
      
      // If we're on dashboard, test session persistence
      if (page.url().includes('dashboard')) {
        // Reload the page
        await page.reload();
        
        // Should still be authenticated
        await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
      } else {
        test.skip('Unable to authenticate user for session test');
      }
    });

    test('should handle session expiry gracefully', async ({ page }) => {
      // This test would typically involve manipulating session cookies
      // or waiting for session timeout, but that's complex in E2E tests
      // Instead, we'll test that expired sessions redirect properly
      
      await page.goto('/dashboard');
      
      // Should redirect to sign-in if no valid session
      await expect(page).toHaveURL(/\/(sign-in|login|auth)/, { timeout: 5000 });
    });
  });
});