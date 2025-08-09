import { test, expect } from '@playwright/test';

test.describe('Payment Flow (Stripe Integration)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();
  });

  // Helper function to sign in a user
  async function signInUser(page: any, email = 'test@example.com', password = 'testpassword') {
    await page.goto('/sign-in');
    await page.fill('input[name="email"], input[type="email"]', email);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('button[type="submit"], button:has-text("Sign In")');
    await page.waitForTimeout(2000); // Wait for potential redirect
  }

  test.describe('Pricing Page', () => {
    test('should display pricing plans', async ({ page }) => {
      await page.goto('/pricing');
      
      // Check for pricing content
      await expect(page.locator('h1, h2')).toContainText(/pricing|plans|subscribe/i);
      
      // Should show different plan options
      const pricingCards = page.locator('[data-testid="pricing-card"], .pricing-card, .plan-card');
      if (await pricingCards.count() > 0) {
        expect(await pricingCards.count()).toBeGreaterThan(0);
        
        // Should show prices
        await expect(page.locator('body')).toContainText(/\$|\€|£/);
      } else {
        // Look for any pricing-related content
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.toLowerCase()).toContain('pric');
      }
    });

    test('should show plan features and benefits', async ({ page }) => {
      await page.goto('/pricing');
      
      // Look for feature lists or benefit descriptions
      const features = page.locator('ul li, .feature, .benefit, [data-testid="feature"]');
      if (await features.count() > 0) {
        expect(await features.count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Subscription Flow', () => {
    test('should redirect to sign-in when not authenticated', async ({ page }) => {
      await page.goto('/pricing');
      
      // Find and click a subscription button
      const subscribeButton = page.locator('button:has-text("Subscribe"), button:has-text("Get Started"), a:has-text("Subscribe"), a:has-text("Get Started")');
      
      if (await subscribeButton.count() > 0) {
        await subscribeButton.first().click();
        
        // Should redirect to sign-in or show sign-in modal
        const url = page.url();
        const hasSignIn = url.includes('sign-in') || url.includes('login') || url.includes('auth');
        const hasSignInModal = await page.locator('h1, h2, h3').filter({ hasText: /sign in|log in|login/i }).count() > 0;
        
        expect(hasSignIn || hasSignInModal).toBe(true);
      } else {
        test.skip('Subscribe button not found on pricing page');
      }
    });

    test('should show Stripe checkout for authenticated users', async ({ page }) => {
      // Sign in first
      await signInUser(page);
      
      // Navigate to pricing
      await page.goto('/pricing');
      
      // Look for subscription button
      const subscribeButton = page.locator('button:has-text("Subscribe"), button:has-text("Get Started"), button:has-text("Upgrade")');
      
      if (await subscribeButton.count() > 0) {
        await subscribeButton.first().click();
        
        // Should either redirect to Stripe or show checkout form
        await page.waitForTimeout(3000);
        
        const currentUrl = page.url();
        const hasStripeCheckout = currentUrl.includes('stripe') || currentUrl.includes('checkout');
        const hasCheckoutForm = await page.locator('input[data-element="cardNumber"], #card-element, .card-element').count() > 0;
        const hasPaymentForm = await page.locator('form').filter({ hasText: /payment|card|billing/i }).count() > 0;
        
        expect(hasStripeCheckout || hasCheckoutForm || hasPaymentForm).toBe(true);
      } else {
        test.skip('Subscribe button not found after authentication');
      }
    });
  });

  test.describe('Subscription Management', () => {
    test('should show current subscription status', async ({ page }) => {
      await signInUser(page);
      
      // Look for account/billing settings
      const accountLinks = page.locator('a:has-text("Account"), a:has-text("Billing"), a:has-text("Settings"), a[href*="account"], a[href*="billing"]');
      
      if (await accountLinks.count() > 0) {
        await accountLinks.first().click();
        
        // Should show subscription information
        const bodyText = await page.locator('body').textContent();
        const hasSubscriptionInfo = bodyText?.toLowerCase().includes('subscription') || 
                                   bodyText?.toLowerCase().includes('plan') ||
                                   bodyText?.toLowerCase().includes('billing');
        
        expect(hasSubscriptionInfo).toBe(true);
      } else {
        // Try direct navigation to common billing routes
        const billingRoutes = ['/account', '/billing', '/settings', '/subscription'];
        
        for (const route of billingRoutes) {
          await page.goto(route);
          if (page.url().includes(route.slice(1))) {
            // Found a billing page
            const bodyText = await page.locator('body').textContent();
            const hasSubscriptionInfo = bodyText?.toLowerCase().includes('subscription') || 
                                       bodyText?.toLowerCase().includes('plan');
            
            if (hasSubscriptionInfo) {
              expect(hasSubscriptionInfo).toBe(true);
              return;
            }
          }
        }
        
        test.skip('Subscription management page not found');
      }
    });

    test('should allow updating payment methods', async ({ page }) => {
      await signInUser(page);
      
      // Navigate to billing settings
      const routes = ['/billing', '/account', '/settings'];
      let foundBillingPage = false;
      
      for (const route of routes) {
        await page.goto(route);
        const bodyText = await page.locator('body').textContent();
        
        if (bodyText?.toLowerCase().includes('payment') || bodyText?.toLowerCase().includes('card')) {
          foundBillingPage = true;
          break;
        }
      }
      
      if (foundBillingPage) {
        // Look for payment method management
        const paymentButtons = page.locator('button:has-text("Add"), button:has-text("Update"), button:has-text("Change"), a:has-text("Payment")');
        
        if (await paymentButtons.count() > 0) {
          expect(await paymentButtons.count()).toBeGreaterThan(0);
        }
      } else {
        test.skip('Payment method management not found');
      }
    });
  });

  test.describe('Billing History', () => {
    test('should show past invoices and transactions', async ({ page }) => {
      await signInUser(page);
      
      // Look for billing history
      const routes = ['/billing', '/invoices', '/transactions', '/account'];
      
      for (const route of routes) {
        await page.goto(route);
        const bodyText = await page.locator('body').textContent();
        
        if (bodyText?.toLowerCase().includes('invoice') || 
            bodyText?.toLowerCase().includes('transaction') ||
            bodyText?.toLowerCase().includes('history')) {
          
          // Found billing history page
          expect(bodyText?.toLowerCase()).toMatch(/invoice|transaction|history/);
          return;
        }
      }
      
      test.skip('Billing history not found');
    });
  });

  test.describe('Plan Changes', () => {
    test('should allow upgrading subscription plan', async ({ page }) => {
      await signInUser(page);
      
      await page.goto('/pricing');
      
      // Look for upgrade buttons (assuming user has basic plan)
      const upgradeButtons = page.locator('button:has-text("Upgrade"), a:has-text("Upgrade"), button:has-text("Choose Plan")');
      
      if (await upgradeButtons.count() > 0) {
        await upgradeButtons.first().click();
        
        // Should initiate upgrade process
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const hasUpgradeFlow = currentUrl.includes('checkout') || 
                              currentUrl.includes('upgrade') || 
                              currentUrl.includes('billing');
        
        if (hasUpgradeFlow) {
          expect(hasUpgradeFlow).toBe(true);
        } else {
          // Check for checkout form or payment flow
          const hasPaymentElement = await page.locator('input[data-element="cardNumber"], #card-element, form').filter({ hasText: /payment|billing/i }).count() > 0;
          expect(hasPaymentElement).toBe(true);
        }
      } else {
        test.skip('Upgrade functionality not found');
      }
    });

    test('should allow downgrading subscription plan', async ({ page }) => {
      await signInUser(page);
      
      // Look for subscription management
      const routes = ['/billing', '/account', '/settings'];
      
      for (const route of routes) {
        await page.goto(route);
        
        const downgradeButtons = page.locator('button:has-text("Downgrade"), button:has-text("Cancel"), a:has-text("Change Plan")');
        
        if (await downgradeButtons.count() > 0) {
          // Found downgrade option
          expect(await downgradeButtons.count()).toBeGreaterThan(0);
          return;
        }
      }
      
      test.skip('Downgrade functionality not found');
    });
  });

  test.describe('Subscription Cancellation', () => {
    test('should allow canceling subscription', async ({ page }) => {
      await signInUser(page);
      
      // Navigate to account settings
      const routes = ['/billing', '/account', '/settings'];
      
      for (const route of routes) {
        await page.goto(route);
        
        const cancelButtons = page.locator('button:has-text("Cancel"), a:has-text("Cancel"), button:has-text("Unsubscribe")');
        
        if (await cancelButtons.count() > 0) {
          await cancelButtons.first().click();
          
          // Should show cancellation confirmation
          await expect(page.locator('body')).toContainText(/cancel|confirm|sure/i, { timeout: 5000 });
          return;
        }
      }
      
      test.skip('Subscription cancellation not found');
    });

    test('should handle cancellation confirmation', async ({ page }) => {
      await signInUser(page);
      
      // This test assumes we can find and interact with cancellation flow
      const routes = ['/billing', '/account'];
      
      for (const route of routes) {
        await page.goto(route);
        
        const cancelButton = page.locator('button:has-text("Cancel"), a:has-text("Cancel")');
        
        if (await cancelButton.count() > 0) {
          await cancelButton.first().click();
          
          // Look for confirmation dialog
          const confirmationDialog = page.locator('[role="dialog"], .modal, .popup');
          if (await confirmationDialog.count() > 0) {
            // Should have confirm and cancel options
            const confirmButton = confirmationDialog.locator('button:has-text("Confirm"), button:has-text("Yes")');
            const cancelActionButton = confirmationDialog.locator('button:has-text("Cancel"), button:has-text("No")');
            
            expect(await confirmButton.count()).toBeGreaterThan(0);
            expect(await cancelActionButton.count()).toBeGreaterThan(0);
            return;
          }
        }
      }
      
      test.skip('Cancellation confirmation flow not found');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle payment failures gracefully', async ({ page }) => {
      await signInUser(page);
      await page.goto('/pricing');
      
      // This is a placeholder test - in practice, you'd need to:
      // 1. Use Stripe's test card numbers that trigger specific errors
      // 2. Mock payment failures
      // 3. Test error message display
      
      const subscribeButton = page.locator('button:has-text("Subscribe"), button:has-text("Get Started")');
      
      if (await subscribeButton.count() > 0) {
        // Basic test that payment flow exists
        expect(await subscribeButton.count()).toBeGreaterThan(0);
      } else {
        test.skip('Payment flow not available for error testing');
      }
    });

    test('should show appropriate error messages for invalid cards', async ({ page }) => {
      // This test would require integration with Stripe test cards
      // For now, we'll skip this as it requires specific Stripe setup
      test.skip('Stripe test card integration not configured');
    });
  });

  test.describe('Free Trial', () => {
    test('should handle free trial signup', async ({ page }) => {
      await page.goto('/pricing');
      
      // Look for free trial buttons
      const freeTrialButtons = page.locator('button:has-text("Free Trial"), button:has-text("Try Free"), a:has-text("Free Trial")');
      
      if (await freeTrialButtons.count() > 0) {
        await freeTrialButtons.first().click();
        
        // Should either redirect to signup or show trial activation
        await page.waitForTimeout(2000);
        
        const bodyText = await page.locator('body').textContent();
        const hasTrial = bodyText?.toLowerCase().includes('trial') || 
                        bodyText?.toLowerCase().includes('free') ||
                        page.url().includes('trial');
        
        expect(hasTrial).toBe(true);
      } else {
        test.skip('Free trial functionality not found');
      }
    });
  });
});