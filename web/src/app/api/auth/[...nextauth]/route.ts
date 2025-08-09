import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADB2CProvider from 'next-auth/providers/azure-ad-b2c';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AzureADB2CProvider({
      tenantId: process.env.AZURE_AD_B2C_TENANT_NAME!,
      clientId: process.env.AZURE_AD_B2C_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
      primaryUserFlow: process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials:', { email: !!credentials?.email, password: !!credentials?.password });
          return null;
        }

        try {
          console.log('Looking up user:', credentials.email);
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.log('User not found:', credentials.email);
            return null;
          }

          if (!user.password) {
            console.log('User has no password (OAuth user?):', credentials.email);
            return null;
          }

          // Allow sign-in even if email is not verified
          // The middleware will handle redirecting unverified users to verification page

          // Verify password
          console.log('Verifying password for user:', credentials.email);
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password,
          );

          if (!isPasswordValid) {
            console.log('Password invalid for user:', credentials.email);
            return null;
          }

          console.log('Authentication successful for user:', credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/sign-in',
    signUp: '/sign-up',
    error: '/auth/error',
  },
  callbacks: {
    async redirect({ url, baseUrl, token }) {
      // Never redirect to sign-in page after successful auth
      if (url.includes('/sign-in')) {
        // Check if user is new (created within last 5 minutes) to redirect to onboarding
        if (token?.sub) {
          const user = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { createdAt: true },
          });

          if (user) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (user.createdAt > fiveMinutesAgo) {
              return `${baseUrl}/onboarding/goals`;
            }
          }
        }
        return `${baseUrl}/dashboard`;
      }
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;

      // Check if user is new for the default redirect too
      if (token?.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { createdAt: true },
        });

        if (user) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          if (user.createdAt > fiveMinutesAgo) {
            return `${baseUrl}/onboarding/goals`;
          }
        }
      }

      return `${baseUrl}/dashboard`;
    },
    async session({ session, token }) {
      // If token is empty or invalid, return null to clear the session
      if (!token || !token.sub) {
        return null as any;
      }

      if (session?.user && token && (token.sub || token.id)) {
        const userId = (token.sub || token.id) as string;

        session.user.id = userId;
        // Add user properties from token
        session.user.isAdmin = (token.isAdmin as boolean) || false;
        session.user.subscriptionStatus = token.subscriptionStatus as string;
        session.user.subscriptionPlan = token.subscriptionPlan as string;
        session.user.credits = (token.credits as number) || 0;
        session.user.emailVerified = token.emailVerified as Date | null;
      }
      return session;
    },
    async jwt({ token, user }) {
      // On initial sign-in or when updating session
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as any).isAdmin || false;
        token.subscriptionStatus = (user as any).subscriptionStatus;
        token.subscriptionPlan = (user as any).subscriptionPlan;
        token.credits = (user as any).credits || 0;
        token.emailVerified = (user as any).emailVerified;
      }

      // Always check if user exists and refresh emailVerified from database
      if (!user && token.sub) {
        // Only check on subsequent requests, not initial sign-in
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              emailVerified: true,
              isAdmin: true,
              subscriptionStatus: true,
              subscriptionPlan: true,
              credits: true,
            },
          });

          if (dbUser) {
            token.emailVerified = dbUser.emailVerified;
            token.isAdmin = dbUser.isAdmin || false;
            token.subscriptionStatus = dbUser.subscriptionStatus;
            token.subscriptionPlan = dbUser.subscriptionPlan;
            token.credits = dbUser.credits || 0;
          } else {
            // User no longer exists in database - return empty token to force session clear
            console.log('User no longer exists in database:', token.sub);
            return {};
          }
        } catch (error) {
          console.error('Error refreshing user data in JWT callback:', error);
          // On database error, return empty token to force session clear
          return {};
        }
      }

      return token;
    },
  },
  events: {
    async createUser({ user }) {
      // When a new user is created via OAuth, handle company assignment
      if (user.email) {
        const emailDomain = user.email.split('@')[1];
        const companyName = emailDomain.split('.')[0];
        const formattedCompanyName =
          companyName.charAt(0).toUpperCase() + companyName.slice(1);

        // Check if company already exists
        const existingCompany = await prisma.company.findUnique({
          where: { domain: emailDomain },
          include: {
            members: {
              where: { role: 'ADMIN' },
            },
          },
        });

        if (!existingCompany) {
          // Create new company if it doesn't exist
          const company = await prisma.company.create({
            data: {
              name: formattedCompanyName,
              domain: emailDomain,
              userId: user.id,
            },
          });

          // Make the user an admin of the new company
          await prisma.companyMember.create({
            data: {
              companyId: company.id,
              userId: user.id,
              role: 'ADMIN',
            },
          });
        } else if (existingCompany.members.length === 0) {
          // Company exists but has no admin - make this user the admin
          await prisma.companyMember.create({
            data: {
              companyId: existingCompany.id,
              userId: user.id,
              role: 'ADMIN',
            },
          });
        }
        // If company has admins, user will need to request access after sign-in
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
