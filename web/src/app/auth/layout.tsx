import React from 'react';
import NavbarAuth from 'components/auth/NavbarAuth';
import Footer from 'components/ui/footer/Footer';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col self-center justify-self-center bg-gradient-main">
      <NavbarAuth />
      <div className="flex-1 flex items-center justify-center py-12">
        {children}
      </div>
      <Footer />
    </div>
  );
}
