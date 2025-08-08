# OAuth Setup Guide for Hyperformant

This guide covers setting up OAuth authentication using NextAuth.js in our Next.js application.

## Google OAuth Configuration

### Prerequisites

- A Google Cloud Platform account
- A project in Google Cloud Console
- Next.js application running with NextAuth.js

### Setup Steps

1. **Create OAuth 2.0 Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project or create a new one
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth Client ID"

2. **Configure OAuth Consent Screen**
   - If prompted, configure the OAuth consent screen first
   - Choose "External" for user type (unless using Google Workspace)
   - Fill in required fields:
     - App name: "Hyperformant"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes: `email` and `profile`
   - Add test users if in development

3. **Create OAuth Client**
   - Application type: "Web application"
   - Name: "Hyperformant Web Client"
   - Authorized JavaScript origins:
     - Development: `http://localhost:3000`
     - Production: `https://your-domain.com`
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://your-domain.com/api/auth/callback/google`
   - Click "Create"

4. **Save Credentials**
   - Copy the Client ID and Client Secret
   - Add them to your `.env.local` file:
     ```env
     GOOGLE_CLIENT_ID="your-client-id-here"
     GOOGLE_CLIENT_SECRET="your-client-secret-here"
     ```

### NextAuth.js Configuration

The OAuth providers are already configured in `/src/app/api/auth/[...nextauth]/route.ts`. Google OAuth will work automatically once you've set the environment variables.

### Testing Google OAuth

1. Start the Next.js development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page
3. Click "Continue with Google"
4. Complete the Google authentication flow

## Microsoft OAuth via Azure AD

NextAuth.js supports Microsoft/Azure AD out of the box.

### Setup Steps

1. **Register Application in Azure AD**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Navigate to "Azure Active Directory" > "App registrations"
   - Click "New registration"
   - Name: "Hyperformant"
   - Account types: Choose appropriate option
   - Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad` (dev)

2. **Configure Application**
   - Note the Application (client) ID
   - Go to "Certificates & secrets"
   - Create a new client secret
   - Note the secret value

3. **Add Environment Variables**
   ```env
   AZURE_AD_CLIENT_ID="your-application-id"
   AZURE_AD_CLIENT_SECRET="your-client-secret"
   AZURE_AD_TENANT_ID="your-tenant-id"
   ```

4. **Update NextAuth Configuration**
   Add the Azure AD provider to your NextAuth configuration if not already present.

## Environment Variables Reference

Add these to your `.env.local` file:

```env
# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Microsoft/Azure AD (optional)
AZURE_AD_CLIENT_ID="your-azure-client-id"
AZURE_AD_CLIENT_SECRET="your-azure-client-secret"
AZURE_AD_TENANT_ID="your-tenant-id"
```

## Troubleshooting

### Common Issues

1. **"Error: GOOGLE_CLIENT_ID is required"**
   - Ensure both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env.local`
   - Restart the development server after adding environment variables

2. **"Redirect URI mismatch"**
   - Verify the redirect URI in Google Console matches exactly
   - For NextAuth.js, use: `/api/auth/callback/google`
   - Include the port number for localhost

3. **"Access blocked: This app's request is invalid"**
   - Ensure OAuth consent screen is configured
   - Add test users if app is in development mode
   - Verify all required scopes are added

4. **NextAuth.js Session Issues**
   - Ensure `NEXTAUTH_SECRET` is set
   - Check that `NEXTAUTH_URL` matches your application URL
   - Verify database connection for session storage

## Security Best Practices

1. **Never commit credentials**
   - Keep `.env.local` in `.gitignore`
   - Use environment variables in production

2. **Use HTTPS in production**
   - OAuth requires secure connections
   - Update redirect URIs accordingly

3. **Limit OAuth scopes**
   - Only request necessary permissions
   - Currently using: `email`, `profile`

4. **Regular credential rotation**
   - Rotate client secrets periodically
   - Monitor for suspicious activity

## Production Deployment

When deploying to production:

1. **Update Environment Variables**
   - Set production URLs in OAuth console
   - Update `NEXTAUTH_URL` to production domain
   - Generate strong `NEXTAUTH_SECRET`

2. **Update Redirect URIs**
   - Add production callback URLs to OAuth providers
   - Remove development URLs from production apps

3. **Database Configuration**
   - Ensure database is accessible for session storage
   - Configure connection pooling appropriately

## Next Steps

1. Test authentication flow thoroughly
2. Implement proper error handling in UI
3. Add user profile management features
4. Set up monitoring for failed auth attempts
5. Consider implementing role-based access control