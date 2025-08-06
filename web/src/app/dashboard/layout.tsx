'use client';
import { useState, useEffect } from 'react';
import { ConfiguratorContext } from 'contexts/ConfiguratorContext';
import routes from 'routes';
import { isWindowAvailable } from 'utils/navigation';
import React from 'react';
import Sidebar from 'components/ui/sidebar';
import Footer from 'components/ui/footer/Footer';
import SiteHeader from 'components/dashboard/DashboardHeader';
import { useSession } from 'next-auth/react';
import { CompanyProvider } from 'contexts/CompanyContext';
import '../../styles/dashboard.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication at the client level
  const { data: session, status } = useSession();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      window.location.href = '/auth/sign-in';
    }
  }, [session, status]);

  // Admin layout states and functions
  const [open, setOpen] = useState(true); // Changed to true to make sidebar expanded by default
  const [hovered, setHovered] = useState(false);
  const [mini, setMini] = useState(false); // Added local state for mini, false = expanded
  const [theme, setTheme] = useState({});
  if (isWindowAvailable()) document.documentElement.dir = 'ltr';

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  return (
    <ConfiguratorContext.Provider
      value={{
        mini,
        setMini,
        hovered,
        setHovered,
        theme,
        setTheme,
        contrast: false,
        setContrast: () => {},
      }}
    >
      <CompanyProvider>
        <div className="flex flex-col min-h-screen w-full bg-background-100 dark:bg-background-900">
          {/* Site Header - spans full width above everything */}
          <SiteHeader />

          {/* Dashboard Layout - sidebar and content */}
          <div className="flex flex-1 w-full relative p-6 gap-6 overflow-visible">
            <Sidebar
              routes={routes}
              open={open}
              setOpen={() => setOpen(!open)}
              hovered={hovered}
              setHovered={setHovered}
              mini={mini}
              variant="admin"
            />
            {/* Main Content */}
            <div className="flex-1 font-dm bg-white dark:bg-navy-800 rounded-[20px]">
              <main>
                {/* Routes */}
                <div>
                  <div className="mx-auto min-h-screen">{children}</div>
                </div>
              </main>
            </div>
          </div>

          {/* Footer - spans full width at bottom */}
          <Footer />
        </div>
      </CompanyProvider>
    </ConfiguratorContext.Provider>
  );
}
