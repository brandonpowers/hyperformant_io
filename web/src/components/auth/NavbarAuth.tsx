'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import NavLink from 'components/ui/link/NavLink';
import Link from 'next/link';
import Image from 'next/image';
import logoDark from '/public/logos/logo-dark.svg';
import logoLight from '/public/logos/logo-light.svg';

// Assets

function NavbarAuth(props: {
  [x: string]: any;
}) {
  const { ...rest } = props;
  const { data: session } = useSession();
  const pathname = usePathname();

  const isMarketingPage = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect for glass background
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      {...rest}
      className={`fixed top-0 z-50 flex h-[84px] w-full items-center justify-between px-4 transition-all duration-300 ease-in-out ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-md shadow-lg dark:bg-navy-900/80'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between">
        {/* logo */}
        <Link href="/" className="flex items-center">
          {/* Always show dark logo on marketing (for blue bg), light/dark switching elsewhere */}
          <Image
            src={isMarketingPage ? logoDark : logoLight}
            alt="Logo"
            width={120}
            height={40}
            className={
              isMarketingPage ? 'h-8 w-auto' : 'h-8 w-auto dark:hidden'
            }
          />
          {/* Dark mode logo - only for non-marketing pages */}
          {!isMarketingPage && (
            <Image
              src={logoDark}
              alt="Logo"
              width={120}
              height={40}
              className="hidden h-8 w-auto dark:block"
            />
          )}
        </Link>
      </div>
    </div>
  );
}

export default NavbarAuth;
