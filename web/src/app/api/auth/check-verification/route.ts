import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const checkSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = checkSchema.parse(body);
    const { email } = validatedData;

    // Find user with this email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { needsVerification: false, userExists: false },
        { status: 200 },
      );
    }

    // Check if user needs verification
    const needsVerification = !user.emailVerified;

    return NextResponse.json(
      {
        needsVerification,
        userExists: true,
        email: user.email,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Check verification error:', error);

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
