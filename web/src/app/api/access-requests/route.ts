import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, message, requestedRole = 'VIEWER' } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Check if user already has access to this company
    const existingMember = await prisma.companyMember.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.user.id
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ 
        error: 'You already have access to this company' 
      }, { status: 400 });
    }

    // Check if there's already a pending request
    const existingRequest = await prisma.companyAccessRequest.findUnique({
      where: {
        companyId_requesterId: {
          companyId,
          requesterId: session.user.id
        }
      }
    });

    if (existingRequest && existingRequest.status === 'PENDING') {
      return NextResponse.json({ 
        error: 'You already have a pending request for this company' 
      }, { status: 400 });
    }

    // Create or update the access request
    const accessRequest = await prisma.companyAccessRequest.upsert({
      where: {
        companyId_requesterId: {
          companyId,
          requesterId: session.user.id
        }
      },
      update: {
        status: 'PENDING',
        message,
        requestedRole,
        updatedAt: new Date()
      },
      create: {
        companyId,
        requesterId: session.user.id,
        message,
        requestedRole,
        status: 'PENDING'
      }
    });

    // TODO: Send notification email to company admins

    return NextResponse.json({
      message: 'Access request sent successfully',
      accessRequest
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating access request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to fetch access requests for a company (for admins)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Check if user is an admin of the company
    const memberRole = await prisma.companyMember.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.user.id
        }
      }
    });

    if (!memberRole || memberRole.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all pending access requests for the company
    const accessRequests = await prisma.companyAccessRequest.findMany({
      where: {
        companyId,
        status: 'PENDING'
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(accessRequests);
  } catch (error) {
    console.error('Error fetching access requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}