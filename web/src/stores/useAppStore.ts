import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  // UI State
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  isLoading: boolean;

  // User Preferences
  dashboardLayout: 'grid' | 'list';
  reportsPerPage: number;

  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
  }>;

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLoading: (loading: boolean) => void;
  setDashboardLayout: (layout: 'grid' | 'list') => void;
  setReportsPerPage: (count: number) => void;
  addNotification: (
    notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>,
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        sidebarCollapsed: false,
        theme: 'dark',
        isLoading: false,
        dashboardLayout: 'grid',
        reportsPerPage: 10,
        notifications: [],

        // Actions
        setSidebarCollapsed: (collapsed) =>
          set({ sidebarCollapsed: collapsed }),

        setTheme: (theme) => set({ theme }),

        setLoading: (loading) => set({ isLoading: loading }),

        setDashboardLayout: (layout) => set({ dashboardLayout: layout }),

        setReportsPerPage: (count) => set({ reportsPerPage: count }),

        addNotification: (notification) =>
          set((state) => ({
            notifications: [
              ...state.notifications,
              {
                ...notification,
                id: crypto.randomUUID(),
                timestamp: new Date(),
              },
            ],
          })),

        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),

        clearNotifications: () => set({ notifications: [] }),
      }),
      {
        name: 'hyperformant-app-store',
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
          dashboardLayout: state.dashboardLayout,
          reportsPerPage: state.reportsPerPage,
        }),
      },
    ),
    {
      name: 'hyperformant-app-store',
    },
  ),
);
