import React, { ReactNode } from 'react';
import SessionProvider from 'components/providers/SessionProvider';
import TRPCProvider from 'components/providers/TRPCProvider';
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        id={'root'}
        className={`${inter.className} min-h-screen scroll-auto antialiased selection:bg-indigo-100 selection:text-indigo-700 dark:bg-gray-950`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
        >
          <TRPCProvider>
            <SessionProvider>
              {children}
            </SessionProvider>
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
