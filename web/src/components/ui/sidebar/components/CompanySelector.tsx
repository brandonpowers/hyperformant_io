'use client';

import { IoChevronDown, IoAdd } from 'react-icons/io5';
import { HiOutlineOfficeBuilding } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { useCompany } from 'contexts/CompanyContext';
import Dropdown from 'components/ui/dropdown';

interface CompanySelectorProps {
  mini: boolean;
  hovered: boolean;
}

export default function CompanySelector({
  mini,
  hovered,
}: CompanySelectorProps) {
  const router = useRouter();
  const { selectedCompany, companies, setSelectedCompany, loading } =
    useCompany();

  const handleCompanyChange = (company: (typeof companies)[0]) => {
    setSelectedCompany(company);
    // Trigger a page refresh or state update to reload dashboard data
    router.refresh();
  };

  const handleAddCompany = () => {
    // Navigate to company creation page or open a modal
    router.push('/dashboard/companies/new');
  };

  const isExpanded = mini === false || (mini === true && hovered === true);

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-0">
        <div className="h-16 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-0">
      <Dropdown
        button={
          <div className="relative flex items-center w-full hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-4 py-3 transition-all duration-200 cursor-pointer group border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
            {/* Company Avatar/Icon */}
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
              {selectedCompany?.name ? (
                <span className="text-white font-semibold text-sm">
                  {selectedCompany.name[0].toUpperCase()}
                </span>
              ) : (
                <HiOutlineOfficeBuilding className="h-4 w-4 text-white" />
              )}
            </div>

            {/* Company Info */}
            <div
              className={`flex-1 min-w-0 ${isExpanded ? 'block' : 'hidden'}`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {selectedCompany?.name || 'Select Company'}
                  </div>
                  {selectedCompany?.domain && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {selectedCompany.domain}
                    </div>
                  )}
                </div>
                <IoChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500 ml-2 transition-transform duration-200 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </div>
            </div>

            {/* Mini Mode - Just Icon */}
            {!isExpanded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  {selectedCompany?.name ? (
                    <span className="text-white font-semibold text-sm">
                      {selectedCompany.name[0].toUpperCase()}
                    </span>
                  ) : (
                    <HiOutlineOfficeBuilding className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
            )}
          </div>
        }
        animation="origin-top transition-all duration-200 ease-out"
        classNames="top-full mt-1 left-0 right-0 rounded-lg shadow-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"
      >
        <div className="divide-y divide-gray-100">
          <div className="px-1 py-1">
            {companies.map((company) => (
              <button
                key={company.id}
                className="text-gray-900 dark:text-gray-100 hover:bg-blue-500 hover:text-white group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors"
                onClick={() => handleCompanyChange(company)}
              >
                <div className="flex-1 text-left">
                  <div className="font-medium">{company.name}</div>
                  {company.domain && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-100">
                      {company.domain}
                    </div>
                  )}
                </div>
                {selectedCompany?.id === company.id && (
                  <div className="ml-2 h-2 w-2 rounded-full bg-blue-500 group-hover:bg-white" />
                )}
              </button>
            ))}
          </div>
          <div className="px-1 py-1">
            <button
              className="text-gray-900 dark:text-gray-100 hover:bg-blue-500 hover:text-white group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors"
              onClick={handleAddCompany}
            >
              Add New Company
            </button>
          </div>
        </div>
      </Dropdown>
    </div>
  );
}
