import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../app/api/auth/[...nextauth]/route'
import { Suspense } from 'react'

const prisma = new PrismaClient()

// Simulated loading components for different data streams
function ChartLoading() {
  return (
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg flex items-center justify-center">
      <div className="text-gray-400">Loading chart data...</div>
    </div>
  )
}

function ActivityLoading() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Streaming Server Components - these can load independently
async function RevenueChart({ userId }: { userId: string }) {
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Get revenue data for the last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  
  const reports = await prisma.report.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      createdAt: {
        gte: sixMonthsAgo
      }
    },
    select: {
      createdAt: true,
      type: true
    },
    orderBy: { createdAt: 'asc' }
  })

  // Group by month and calculate revenue
  const monthlyRevenue = reports.reduce((acc, report) => {
    const month = report.createdAt.toISOString().slice(0, 7) // YYYY-MM format
    const revenue = report.type === 'FULL' ? 497 : 0 // $497 for full reports
    acc[month] = (acc[month] || 0) + revenue
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    revenue
  }))

  const totalRevenue = Object.values(monthlyRevenue).reduce((sum, revenue) => sum + revenue, 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Trends</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <div className="space-y-4">
          {chartData.map((data, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                {data.month}
              </span>
              <div className="flex-1 mx-4">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${Math.max((data.revenue / Math.max(...chartData.map(d => d.revenue))) * 100, 2)}%` 
                    }}
                  ></div>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">
                ${data.revenue.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📈</div>
          <p>No revenue data available yet</p>
        </div>
      )}
    </div>
  )
}

async function RecentActivity({ userId }: { userId: string }) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const activities = await prisma.report.findMany({
    where: { userId },
    include: {
      company: {
        select: {
          name: true,
          domain: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  })

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'pending': return '⏳'
      case 'processing': return '⚡'
      case 'failed': return '❌'
      default: return '📄'
    }
  }

  const getActivityMessage = (report: typeof activities[0]) => {
    switch (report.status) {
      case 'completed':
        return `Market Forces report completed for ${report.company.name}`
      case 'pending':
        return `Report generation queued for ${report.company.name}`
      case 'processing':
        return `Analyzing market data for ${report.company.name}`
      case 'failed':
        return `Report generation failed for ${report.company.name}`
      default:
        return `Report created for ${report.company.name}`
    }
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
      
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex items-start space-x-3 group">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm">
                {getActivityIcon(activity.status)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  {getActivityMessage(activity)}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getTimeAgo(activity.updatedAt)}
                  </p>
                  <span className="text-xs text-gray-400">•</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.company.domain}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">🚀</div>
          <p>No recent activity</p>
        </div>
      )}
    </div>
  )
}

async function CompetitorInsights({ userId }: { userId: string }) {
  // Simulate processing time for complex analytics
  await new Promise(resolve => setTimeout(resolve, 1200))
  
  // This would typically fetch from competitive intelligence data
  const insights = [
    {
      id: '1',
      competitor: 'Acme Corp',
      sentiment: 'declining',
      change: -12,
      insight: 'Customer complaints about pricing increases'
    },
    {
      id: '2', 
      competitor: 'TechFlow Inc',
      sentiment: 'stable',
      change: 3,
      insight: 'Steady growth but limited innovation'
    },
    {
      id: '3',
      competitor: 'DataViz Pro',
      sentiment: 'improving',
      change: 18,
      insight: 'Strong product updates driving satisfaction'
    }
  ]

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'improving': return 'text-green-600 dark:text-green-400'
      case 'declining': return 'text-red-600 dark:text-red-400'
      default: return 'text-yellow-600 dark:text-yellow-400'
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'improving': return '📈'
      case 'declining': return '📉'
      default: return '➡️'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Competitor Intelligence</h3>
      
      <div className="space-y-4">
        {insights.map((insight) => (
          <div key={insight.id} className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {insight.competitor}
              </h4>
              <div className="flex items-center space-x-2">
                <span className="text-sm">
                  {getSentimentIcon(insight.sentiment)}
                </span>
                <span className={`text-sm font-medium ${getSentimentColor(insight.sentiment)}`}>
                  {insight.change > 0 ? '+' : ''}{insight.change}%
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {insight.insight}
            </p>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <button className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
          View Full Competitive Analysis →
        </button>
      </div>
    </div>
  )
}

export default async function StreamingMetrics() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Please sign in to view metrics</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Analytics Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time insights into your market intelligence and competitive positioning
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart - Streams independently */}
        <Suspense fallback={<ChartLoading />}>
          <RevenueChart userId={session.user.id} />
        </Suspense>

        {/* Recent Activity - Streams independently */}
        <Suspense fallback={<ActivityLoading />}>
          <RecentActivity userId={session.user.id} />
        </Suspense>
      </div>

      {/* Competitor Insights - Full width, streams last */}
      <Suspense fallback={<ChartLoading />}>
        <CompetitorInsights userId={session.user.id} />
      </Suspense>
    </div>
  )
}

export const dynamic = 'force-dynamic'