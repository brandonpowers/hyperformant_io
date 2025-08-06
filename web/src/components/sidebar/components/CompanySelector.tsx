'use client';

import { IoChevronDown, IoAdd } from 'react-icons/io5';
import { useRouter } from 'next/navigation';
import { useCompany } from 'contexts/CompanyContext';
import Dropdown from 'components/ui/dropdown';

interface CompanySelectorProps {
  mini: boolean;
  hovered: boolean;
}

export default function CompanySelector({ mini, hovered }: CompanySelectorProps) {
  const router = useRouter();
  const { selectedCompany, companies, setSelectedCompany, loading } = useCompany();

  const handleCompanyChange = (company: typeof companies[0]) => {
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
      <div className="ml-[52px] mt-[44px]">
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="ml-[52px] mt-[44px]">
      <Dropdown
        button={
          <div className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 py-1 transition-colors cursor-pointer">
            <div className={`font-poppins text-lg font-bold text-navy-700 dark:text-white ${isExpanded ? 'block' : 'hidden'}`}>
              {selectedCompany?.name || 'Select Company'}
            </div>
            <div className={`font-poppins text-lg font-bold text-navy-700 dark:text-white ${isExpanded ? 'hidden' : 'block'}`}>
              {selectedCompany?.name?.[0] || 'C'}
            </div>
            {isExpanded && (
              <IoChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </div>
        }
        animation="origin-top-left transition-all duration-300 ease-in-out"
        classNames="py-2 top-12 left-0 w-[280px]"
      >
        <div className="divide-y divide-gray-100 rounded-md bg-white shadow-lg dark:bg-gray-800 dark:divide-gray-700">
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
              <IoAdd className="mr-2 h-4 w-4" />
              Add New Company
            </button>
          </div>
        </div>
      </Dropdown>
    </div>
  );
}