# OAuth Setup Guide for Hyperformant

## Google OAuth Configuration

### Prerequisites

- A Google Cloud Platform account
- A project in Google Cloud Console

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
     - Development: `http://localhost:3001/auth/google/callback`
     - Production: `https://your-domain.com/auth/google/callback`
   - Click "Create"

4. **Save Credentials**
   - Copy the Client ID and Client Secret
   - Add them to your `.env.server` file:
     ```env
     GOOGLE_CLIENT_ID="your-client-id-here"
     GOOGLE_CLIENT_SECRET="your-client-secret-here"
     ```

### Testing Google OAuth

1. Start the Wasp development server:

   ```bash
   wasp start
   ```

2. Navigate to the login page
3. Click "Continue with Google"
4. Complete the Google authentication flow

## Microsoft OAuth via Azure AD (Alternative Options)

Since Wasp doesn't directly support Microsoft OAuth, here are alternative approaches:

### Option 1: Use Keycloak (Recommended)

Keycloak can act as an identity broker for Microsoft accounts:

1. **Set up Keycloak**
   - Deploy Keycloak (Docker, cloud, or on-premise)
   - Create a realm for your application

2. **Configure Microsoft as Identity Provider in Keycloak**
   - In Keycloak admin, go to Identity Providers
   - Add Microsoft as a provider
   - Configure with your Azure AD credentials

3. **Configure Wasp to use Keycloak**
   ```wasp
   auth: {
     methods: {
       keycloak: {
         configFn: import { getKeycloakAuthConfig } from "@src/auth/keycloak",
         userSignupFields: import { getKeycloakUserFields } from "@src/auth/keycloak",
       }
     }
   }
   ```

### Option 2: Custom Implementation

Implement a custom OAuth flow:

1. Create API endpoints for Microsoft OAuth
2. Use Microsoft's OAuth libraries
3. Handle the authentication flow manually
4. Create sessions compatible with Wasp's auth system

### Option 3: Use Auth0 or Similar

Consider using a third-party authentication service that supports multiple providers and can be integrated with Wasp.

## Environment Variables Reference

Add these to your `.env.server` file:

```env
# Google OAuth (required if using Google auth)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: Keycloak (if using for Microsoft auth)
KEYCLOAK_URL="https://your-keycloak-instance.com"
KEYCLOAK_REALM="your-realm"
KEYCLOAK_CLIENT_ID="your-client-id"
KEYCLOAK_CLIENT_SECRET="your-client-secret"
```

## Troubleshooting

### Common Issues

1. **"Error: GOOGLE_CLIENT_ID is required"**
   - Ensure both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env.server`
   - Restart the Wasp server after adding environment variables

2. **"Redirect URI mismatch"**
   - Verify the redirect URI in Google Console matches exactly
   - Include the port number for localhost
   - Check for trailing slashes

3. **"Access blocked: This app's request is invalid"**
   - Ensure OAuth consent screen is configured
   - Add test users if app is in development mode
   - Verify all required scopes are added

## Security Best Practices

1. **Never commit credentials**
   - Keep `.env.server` in `.gitignore`
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

## Next Steps

1. Test authentication flow thoroughly
2. Implement proper error handling
3. Add user profile management
4. Consider implementing refresh tokens
5. Set up monitoring for failed auth attempts
