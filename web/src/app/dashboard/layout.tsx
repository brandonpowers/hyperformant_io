'use client';
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { usePathname } from 'next/navigation';
import { useContext, useState, useEffect } from 'react';
import { ConfiguratorContext } from 'contexts/ConfiguratorContext';
import routes from 'routes';
import {
  getActiveNavbar,
  getActiveRoute,
  isWindowAvailable,
} from 'utils/navigation';
import React from 'react';
import { Portal } from '@chakra-ui/portal';
import Navbar from 'components/navbar';
import Sidebar from 'components/sidebar';
import Footer from 'components/footer/Footer';
import SiteHeader from 'components/dashboard/DashboardHeader';
import { useSession } from 'next-auth/react';
import { CompanyProvider } from 'contexts/CompanyContext';
import '../../styles/dashboard.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication at the client level
  const { data: session, status } = useSession()
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) {
      window.location.href = '/auth/sign-in'
    }
  }, [session, status])

  // Admin layout states and functions
  const [fixed] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const pathname = usePathname();
  if (isWindowAvailable()) document.documentElement.dir = 'ltr';
  const context = useContext(ConfiguratorContext);
  const { mini, theme, setTheme, setMini } = context;

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!session) {
    return null
  }

  return (
    <CompanyProvider>
      <div className="flex flex-col min-h-screen w-full bg-background-100 dark:bg-background-900">
        {/* Site Header - spans full width above everything */}
        <SiteHeader />
        
        {/* Dashboard Layout - sidebar and content */}
        <div className="flex flex-1 w-full relative p-6 gap-6">
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
              <div className="mx-auto min-h-screen">
                {children}
              </div>
              <div>
                <Footer />
              </div>
            </div>
          </main>
          </div>
        </div>
      </div>
    </CompanyProvider>
  );
}