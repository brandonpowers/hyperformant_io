import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import crypto from 'crypto'
import { sendEmail, emailTemplates } from 'lib/email'

const prisma = new PrismaClient()

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = forgotPasswordSchema.parse(body)
    const { email } = validatedData

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Always return success to prevent email enumeration attacks
    // But only actually send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

      // Store reset token in database
      await prisma.user.update({
        where: { email },
        data: {
          resetToken,
          resetTokenExpiry,
        }
      })

      // Generate reset link
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
      
      // Send password reset email
      const { subject, html, text } = emailTemplates.passwordReset(resetLink)
      await sendEmail({
        to: email,
        subject,
        html,
        text,
      })
      
      console.log(`Password reset email sent to: ${email}`)
    }

    return NextResponse.json(
      { 
        message: 'If an account with that email exists, we have sent you a password reset link.',
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Forgot password error:', error)
    
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