'use client'

import { useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { trpc } from '../../utils/trpc'

interface Company {
  id: string
  name: string
  domain: string
  description: string | null
  industry: string | null
  employeeCount: number | null
  revenue: string | null
  createdAt: Date
  updatedAt: Date
}

interface CompanyCardProps {
  company: Company
}

export default function CompanyCard({ company }: CompanyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { addNotification } = useAppStore()
  
  const deleteCompanyMutation = trpc.companies.delete.useMutation({
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Company Deleted',
        message: `${company.name} has been successfully deleted.`
      })
      // Trigger a refetch of the companies list
      window.location.reload()
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.message || 'Failed to delete company'
      })
    }
  })

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${company.name}?`)) {
      deleteCompanyMutation.mutate({ id: company.id })
    }
  }

  const formatRevenue = (revenue: string | null) => {
    if (!revenue) return 'Not disclosed'
    return revenue.includes('$') ? revenue : `$${revenue}`
  }

  const formatEmployeeCount = (count: number | null) => {
    if (!count) return 'Unknown'
    if (count < 10) return '1-10'
    if (count < 50) return '11-50'
    if (count < 200) return '51-200'
    if (count < 1000) return '201-1000'
    return '1000+'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {company.name}
          </h3>
          <p className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer">
              {company.domain}
            </a>
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteCompanyMutation.isLoading}
            className="text-red-400 hover:text-red-600 disabled:opacity-50"
            title="Delete company"
          >
            {deleteCompanyMutation.isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Quick Info */}
      <div className="flex flex-wrap gap-2 mb-3">
        {company.industry && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
            {company.industry}
          </span>
        )}
        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
          {formatEmployeeCount(company.employeeCount)} employees
        </span>
      </div>

      {/* Description */}
      {company.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
          {company.description}
        </p>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Revenue:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatRevenue(company.revenue)}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Added:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(company.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded transition-colors">
              Generate Report
            </button>
            <button className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors">
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full opacity-75"></div>
    </div>
  )
}