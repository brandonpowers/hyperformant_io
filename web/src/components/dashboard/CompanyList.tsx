import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/api/auth/[...nextauth]/route';
import CompanyCard from './CompanyCard';

const prisma = new PrismaClient();

export default async function CompanyList() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please sign in to view your companies</p>
      </div>
    );
  }

  const companies = await prisma.company.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10, // Limit for initial load
  });

  if (companies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No companies found</p>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Add Your First Company
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {companies.map((company) => (
        <CompanyCard key={company.id} company={company} />
      ))}
    </div>
  );
}

// This ensures the component is always rendered on the server
export const dynamic = 'force-dynamic';
