import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Company {
  id: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  employees?: number | null;
  revenue?: string | null;
  founded?: Date | null;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// Query Keys
export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...companyKeys.lists(), { filters }] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
};

// Fetch companies
async function fetchCompanies(): Promise<Company[]> {
  const response = await fetch('/api/v1/companies', {
    credentials: 'include', // Include cookies for authentication
  });
  if (!response.ok) {
    throw new Error('Failed to fetch companies');
  }
  const data = await response.json();
  // API returns { data: [...], meta: {...} } format
  return data.data || data;
}

export function useCompanies() {
  return useQuery({
    queryKey: companyKeys.lists(),
    queryFn: fetchCompanies,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch single company
async function fetchCompany(id: string): Promise<Company> {
  const response = await fetch(`/api/v1/companies/${id}`, {
    credentials: 'include', // Include cookies for authentication
  });
  if (!response.ok) {
    throw new Error('Failed to fetch company');
  }
  const data = await response.json();
  // API returns { data: {...}, meta: {...} } format
  return data.data || data;
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => fetchCompany(id),
    enabled: !!id,
  });
}

// Create company mutation
async function createCompany(
  data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
): Promise<Company> {
  const response = await fetch('/api/v1/companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create company');
  }
  return response.json();
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      // Invalidate and refetch companies list
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}
