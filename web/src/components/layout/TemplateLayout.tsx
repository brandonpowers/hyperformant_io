'use client';
import React from 'react';
import { Navigation } from 'components/marketing/Navigation';
import TemplateFooter from 'components/marketing/TemplateFooter';

interface TemplateLayoutProps {
  children: React.ReactNode;
}

const TemplateLayout: React.FC<TemplateLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen scroll-auto antialiased selection:bg-indigo-100 selection:text-indigo-700 dark:bg-gray-950">
      <Navigation />
      {children}
      <TemplateFooter />
    </div>
  );
};

export default TemplateLayout;