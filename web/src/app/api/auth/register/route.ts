import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sendEmail, emailTemplates } from 'lib/email';
import { associateUserWithEntity } from '../../../../lib/entity-association';

const prisma = new PrismaClient();

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);
    const { firstName, lastName, email, password } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 },
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification code (6-digit number)
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

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
      },
    });

    // Associate user with company entity based on email domain
    const entityAssociation = await associateUserWithEntity(user.id, email);

    // Send verification email
    const { subject, html, text } = emailTemplates.verificationCode(
      verificationCode,
      email,
    );
    await sendEmail({
      to: email,
      subject,
      html,
      text,
    });

    console.log(`Verification email sent to: ${email}`);

    return NextResponse.json(
      {
        message:
          'Account created successfully! Please check your email.',
        requiresVerification: true,
        needsAccessRequest: entityAssociation.needsAccessRequest,
        membershipCreated: entityAssociation.membershipCreated,
        role: entityAssociation.role,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        company: {
          id: entityAssociation.entity.id,
          name: entityAssociation.entity.name,
          domain: entityAssociation.entity.domain,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
