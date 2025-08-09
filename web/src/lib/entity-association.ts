import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Entity-User Association Utilities
 * Handles the association of users with company entities during signup
 */

export interface EntityAssociationResult {
  entity: {
    id: string;
    name: string;
    domain: string | null;
  };
  membershipCreated: boolean;
  needsAccessRequest: boolean;
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

/**
 * Associate a user with a company entity based on their email domain
 * This implements the signup logic described in the requirements:
 * - Create entity if it doesn't exist
 * - Add user as admin if no admins exist
 * - User needs to request access if entity has admins
 */
export async function associateUserWithEntity(
  userId: string,
  email: string,
): Promise<EntityAssociationResult> {
  const emailDomain = email.split('@')[1];
  const companyName = emailDomain.split('.')[0];
  const formattedCompanyName =
    companyName.charAt(0).toUpperCase() + companyName.slice(1);

  // Check if company entity already exists
  const existingEntity = await prisma.entity.findFirst({
    where: {
      domain: emailDomain,
      type: 'COMPANY',
    },
    include: {
      members: {
        where: { role: 'ADMIN' },
      },
    },
  });

  let entity = existingEntity;
  let membershipCreated = false;
  let needsAccessRequest = false;
  let role: 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined;

  if (!existingEntity) {
    // Create new company entity
    entity = await prisma.entity.create({
      data: {
        type: 'COMPANY',
        name: formattedCompanyName,
        domain: emailDomain,
        isUserCompany: true,
        createdByUserId: userId,
      },
    });

    // Make the user an admin of the new company entity
    await prisma.entityMember.create({
      data: {
        entityId: entity.id,
        userId: userId,
        role: 'ADMIN',
      },
    });

    membershipCreated = true;
    role = 'ADMIN';
  } else if (existingEntity.members.length === 0) {
    // Entity exists but has no admin - make this user the admin
    await prisma.entityMember.create({
      data: {
        entityId: existingEntity.id,
        userId: userId,
        role: 'ADMIN',
      },
    });

    membershipCreated = true;
    role = 'ADMIN';
  } else {
    // Entity exists and has admin(s) - user needs to request access
    needsAccessRequest = true;
  }

  return {
    entity: {
      id: entity!.id,
      name: entity!.name,
      domain: entity!.domain,
    },
    membershipCreated,
    needsAccessRequest,
    role,
  };
}

/**
 * Create an access request for a user to join an entity
 */
export async function createEntityAccessRequest(
  userId: string,
  entityId: string,
  requestedRole: 'ADMIN' | 'EDITOR' | 'VIEWER' = 'VIEWER',
  message?: string,
) {
  // Check if user already has access or pending request
  const [existingMember, existingRequest] = await Promise.all([
    prisma.entityMember.findUnique({
      where: {
        entityId_userId: {
          entityId,
          userId,
        },
      },
    }),
    prisma.entityAccessRequest.findUnique({
      where: {
        entityId_requesterId: {
          entityId,
          requesterId: userId,
        },
      },
    }),
  ]);

  if (existingMember) {
    throw new Error('User already has access to this entity');
  }

  if (existingRequest) {
    throw new Error('Access request already exists');
  }

  return await prisma.entityAccessRequest.create({
    data: {
      entityId,
      requesterId: userId,
      requestedRole,
      message,
      status: 'PENDING',
    },
    include: {
      entity: {
        select: { id: true, name: true, domain: true },
      },
      requester: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Find or create an entity by domain (useful for competitive intelligence)
 */
export async function findOrCreateEntityByDomain(
  domain: string,
  entityType:
    | 'COMPANY'
    | 'PRODUCT'
    | 'PERSON'
    | 'MARKET'
    | 'SEGMENT' = 'COMPANY',
  additionalData?: Partial<{
    name: string;
    ticker: string;
    hqCountry: string;
    hqRegion: string;
    employees: number;
    revenue: string;
    description: string;
    industryId: string;
    marketSegmentId: string;
  }>,
) {
  const existing = await prisma.entity.findFirst({
    where: { domain, type: entityType },
  });

  if (existing) {
    return existing;
  }

  // Generate name from domain if not provided
  const defaultName =
    additionalData?.name ||
    domain.split('.')[0].charAt(0).toUpperCase() +
      domain.split('.')[0].slice(1);

  return await prisma.entity.create({
    data: {
      type: entityType,
      name: defaultName,
      domain,
      isUserCompany: false, // Not a user company since it's for competitive intelligence
      ...additionalData,
    },
  });
}
