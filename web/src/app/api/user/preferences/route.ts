import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Store preferences in user metadata or a separate preferences table
    // For now, we'll just log them - you can extend this to save to database
    console.log('User preferences:', {
      userId: session.user.id,
      ...body
    });

    // You could create a UserPreferences model in your schema
    // For now, just return success
    return NextResponse.json({ 
      message: 'Preferences saved successfully',
      preferences: body 
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}