'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';

interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  employees?: number;
  revenue?: string;
  founded?: Date;
  description?: string;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  companies: Company[];
  setSelectedCompany: (company: Company) => void;
  refreshCompanies: () => Promise<void>;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(
    null,
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/v1/companies');

      if (response.ok) {
        const data = await response.json();
        // Extract companies from Hono API response format
        // API returns: { data: [...companies...], meta: {...} }
        const companies = data.data || [];
        setCompanies(companies);

        // Set selected company from localStorage or use first company
        const savedCompanyId = localStorage.getItem('selectedCompanyId');

        if (savedCompanyId) {
          const savedCompany = companies.find(
            (c: Company) => c.id === savedCompanyId,
          );
          if (savedCompany) {
            setSelectedCompanyState(savedCompany);
          } else if (companies.length > 0) {
            setSelectedCompanyState(companies[0]);
            localStorage.setItem('selectedCompanyId', companies[0].id);
          } else {
            localStorage.removeItem('selectedCompanyId');
          }
        } else if (companies.length > 0) {
          setSelectedCompanyState(companies[0]);
          localStorage.setItem('selectedCompanyId', companies[0].id);
        } else {
          localStorage.removeItem('selectedCompanyId');
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchCompanies();
    }
  }, [session]);

  const setSelectedCompany = (company: Company) => {
    setSelectedCompanyState(company);
    localStorage.setItem('selectedCompanyId', company.id);
  };

  const value = {
    selectedCompany,
    companies,
    setSelectedCompany,
    refreshCompanies: fetchCompanies,
    loading,
  };

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
