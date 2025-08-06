import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADB2CProvider from 'next-auth/providers/azure-ad-b2c'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { sendEmail, emailTemplates } from 'lib/email'

const prisma = new PrismaClient()

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
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user || !user.password) {
            return null
          }

          // Check if email is verified
          if (!user.emailVerified) {
            // Generate new verification code
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
            const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now

            // Update user with new verification code
            await prisma.user.update({
              where: { id: user.id },
              data: {
                verificationCode,
                verificationExpiry,
              }
            })

            // Send verification email
            try {
              const { subject, html, text } = emailTemplates.verificationCode(verificationCode)
              await sendEmail({
                to: user.email!,
                subject,
                html,
                text,
              })
              console.log(`Auto-sent verification email to: ${user.email}`)
            } catch (emailError) {
              console.error('Failed to send verification email:', emailError)
            }

            // Custom error that the frontend can handle to redirect to verification
            const error = new Error('VERIFICATION_REQUIRED')
            ;(error as any).email = user.email
            throw error
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          
          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      }
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    error: '/auth/error',
  },
  callbacks: {
    async redirect({ url, baseUrl, token }) {
      // Never redirect to sign-in page after successful auth
      if (url.includes('/auth/sign-in')) {
        // Check if user is new (created within last 5 minutes) to redirect to onboarding
        if (token?.sub) {
          const user = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { createdAt: true }
          })
          
          if (user) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
            if (user.createdAt > fiveMinutesAgo) {
              return `${baseUrl}/onboarding/goals`
            }
          }
        }
        return `${baseUrl}/dashboard`
      }
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      
      // Check if user is new for the default redirect too
      if (token?.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { createdAt: true }
        })
        
        if (user) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
          if (user.createdAt > fiveMinutesAgo) {
            return `${baseUrl}/onboarding/goals`
          }
        }
      }
      
      return `${baseUrl}/dashboard`
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id as string
        // Add any additional user properties from token
        session.user.isAdmin = token.isAdmin as boolean || false
        session.user.subscriptionStatus = token.subscriptionStatus as string
        session.user.subscriptionPlan = token.subscriptionPlan as string
        session.user.credits = token.credits as number || 0
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isAdmin = (user as any).isAdmin || false
        token.subscriptionStatus = (user as any).subscriptionStatus
        token.subscriptionPlan = (user as any).subscriptionPlan
        token.credits = (user as any).credits || 0
      }
      return token
    },
  },
  events: {
    async createUser({ user }) {
      // When a new user is created via OAuth, handle company assignment
      if (user.email) {
        const emailDomain = user.email.split('@')[1]
        const companyName = emailDomain.split('.')[0]
        const formattedCompanyName = companyName.charAt(0).toUpperCase() + companyName.slice(1)
        
        // Check if company already exists
        const existingCompany = await prisma.company.findUnique({
          where: { domain: emailDomain },
          include: {
            members: {
              where: { role: 'ADMIN' }
            }
          }
        })
        
        if (!existingCompany) {
          // Create new company if it doesn't exist
          const company = await prisma.company.create({
            data: {
              name: formattedCompanyName,
              domain: emailDomain,
              userId: user.id
            }
          })
          
          // Make the user an admin of the new company
          await prisma.companyMember.create({
            data: {
              companyId: company.id,
              userId: user.id,
              role: 'ADMIN'
            }
          })
        } else if (existingCompany.members.length === 0) {
          // Company exists but has no admin - make this user the admin
          await prisma.companyMember.create({
            data: {
              companyId: existingCompany.id,
              userId: user.id,
              role: 'ADMIN'
            }
          })
        }
        // If company has admins, user will need to request access after sign-in
      }
    }
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }