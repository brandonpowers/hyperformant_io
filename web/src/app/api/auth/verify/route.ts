import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { sendEmail, emailTemplates } from 'lib/email'

const prisma = new PrismaClient()

const verifySchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = verifySchema.parse(body)
    const { code, email } = validatedData

    // Find user with matching email and verification code
    const user = await prisma.user.findFirst({
      where: {
        email,
        verificationCode: code,
        verificationExpiry: {
          gt: new Date(), // Code hasn't expired
        },
        emailVerified: null, // Not already verified
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Mark email as verified and clear verification fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationCode: null,
        verificationExpiry: null,
      }
    })

    return NextResponse.json(
      { 
        message: 'Email verified successfully! Signing you in...',
        verified: true,
        autoLogin: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Verification error:', error)
    
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

// Resend verification code
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = z.object({ email: z.string().email() }).parse(body)

    // Find user with this email who hasn't been verified yet
    const user = await prisma.user.findFirst({
      where: {
        email,
        emailVerified: null, // Not verified yet
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'No unverified account found with this email address' },
        { status: 400 }
      )
    }

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now

    // Update user with new code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationExpiry,
      }
    })

    // Send verification email with new code
    const { subject, html, text } = emailTemplates.verificationCode(verificationCode)
    await sendEmail({
      to: email,
      subject,
      html,
      text,
    })
    
    console.log(`New verification email sent to: ${email}`)

    return NextResponse.json(
      { message: 'New verification code sent! Please check your email.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Resend verification error:', error)
    
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