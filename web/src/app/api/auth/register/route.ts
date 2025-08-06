import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { sendEmail, emailTemplates } from 'lib/email'

const prisma = new PrismaClient()

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = registerSchema.parse(body)
    const { firstName, lastName, email, password } = validatedData

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Generate verification code (6-digit number)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now

    // Extract domain from email
    const emailDomain = email.split('@')[1]
    const companyName = emailDomain.split('.')[0] // Get the part before .com/.org/etc
    const formattedCompanyName = companyName.charAt(0).toUpperCase() + companyName.slice(1) // Capitalize first letter

    // Check if company already exists
    const existingCompany = await prisma.company.findUnique({
      where: { domain: emailDomain },
      include: {
        members: {
          where: { role: 'ADMIN' }
        }
      }
    })

    // Create user with hashed password and verification code
    const user = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        verificationCode,
        verificationExpiry,
        emailVerified: null, // Not verified yet
        image: null,
      }
    })

    let needsAccessRequest = false
    let company = existingCompany

    if (!existingCompany) {
      // Create new company if it doesn't exist
      company = await prisma.company.create({
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
    } else {
      // Company exists and has admin(s) - user needs to request access
      needsAccessRequest = true
    }

    // Send verification email
    const { subject, html, text } = emailTemplates.verificationCode(verificationCode)
    await sendEmail({
      to: email,
      subject,
      html,
      text,
    })
    
    console.log(`Verification email sent to: ${email}`)
    
    return NextResponse.json(
      { 
        message: 'Account created successfully! Please check your email for a verification code.',
        requiresVerification: true,
        needsAccessRequest,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        company: company ? {
          id: company.id,
          name: company.name,
          domain: company.domain
        } : null
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}