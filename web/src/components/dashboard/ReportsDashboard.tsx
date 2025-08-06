import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../app/api/auth/[...nextauth]/route'
import { Suspense } from 'react'

const prisma = new PrismaClient()

// Loading components for different sections
function ReportsLoading() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 h-48 rounded-lg"></div>
        ))}
      </div>
    </div>
  )
}

function MetricsLoading() {
  return (
    <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-200 dark:bg-gray-700 h-24 rounded-lg"></div>
      ))}
    </div>
  )
}

// Server Components for data fetching
async function ReportMetrics({ userId }: { userId: string }) {
  const [totalReports, pendingReports, completedReports, recentActivity] = await Promise.all([
    prisma.report.count({
      where: { userId }
    }),
    prisma.report.count({
      where: { 
        userId,
        status: 'PENDING'
      }
    }),
    prisma.report.count({
      where: { 
        userId,
        status: 'COMPLETED'
      }
    }),
    prisma.report.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    })
  ])

  const metrics = [
    {
      title: 'Total Reports',
      value: totalReports,
      icon: '📊',
      color: 'bg-blue-500'
    },
    {
      title: 'Pending',
      value: pendingReports,
      icon: '⏳',
      color: 'bg-yellow-500'
    },
    {
      title: 'Completed',
      value: completedReports,
      icon: '✅',
      color: 'bg-green-500'
    },
    {
      title: 'This Week',
      value: recentActivity,
      icon: '📈',
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{metric.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
            </div>
            <div className={`${metric.color} w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl`}>
              {metric.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

async function RecentReports({ userId }: { userId: string }) {
  const reports = await prisma.report.findMany({
    where: { userId },
    include: {
      company: {
        select: {
          name: true,
          domain: true,
          industry: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 6
  })

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reports yet</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Start by adding a company and generating your first Market Forces report.</p>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
          Add Company
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report) => (
        <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {report.company.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {report.company.domain}
              </p>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              report.status === 'completed' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : report.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}>
              {report.status}
            </span>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Report Type:</span>
              <span className="font-medium">{report.type}</span>
            </div>
            {report.company.industry && (
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Industry:</span>
                <span className="font-medium">{report.company.industry}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Created:</span>
              <span className="font-medium">
                {new Date(report.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex space-x-2">
            <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded transition-colors">
              View Report
            </button>
            {report.status === 'completed' && (
              <button className="bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded transition-colors">
                Download
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function ReportsDashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Required</h3>
          <p className="text-gray-600 dark:text-gray-400">Please sign in to view your reports dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor your Market Forces reports and analytics
          </p>
        </div>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
          Generate New Report
        </button>
      </div>

      {/* Metrics Section with Suspense */}
      <Suspense fallback={<MetricsLoading />}>
        <ReportMetrics userId={session.user.id} />
      </Suspense>

      {/* Recent Reports Section with Suspense */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Reports</h2>
        <Suspense fallback={<ReportsLoading />}>
          <RecentReports userId={session.user.id} />
        </Suspense>
      </div>
    </div>
  )
}

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'