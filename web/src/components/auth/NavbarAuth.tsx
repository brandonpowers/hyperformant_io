'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import NavLink from 'components/ui/link/NavLink';
import { FiAlignJustify } from 'react-icons/fi';
import Dropdown from 'components/ui/dropdown';
import Link from 'next/link';
import Image from 'next/image';
import UserAvatar from 'components/ui/avatar/UserAvatar';
import logoDark from '/public/logos/logo-dark.svg';
import logoLight from '/public/logos/logo-light.svg';

// Assets
import { GoChevronDown } from 'react-icons/go';
import { IRoute } from 'types/navigation';
import routes from 'routes';

function NavbarAuth(props: {
  onOpenSidenav?: () => void;
  sidebarWidth?: any;
  [x: string]: any;
}) {
  const { sidebarWidth, onOpenSidenav, ...rest } = props;
  // sidebarWidth is intentionally unused but kept for API compatibility
  const { data: session } = useSession();
  const pathname = usePathname();

  // Hide auth buttons if user is on any auth page
  const isOnAuthPage = pathname?.startsWith('/auth/');
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
  const [openDashboard, setOpenDashboard] = useState(false);
  const [openNft, setOpenNft] = useState(false);
  const [openMain, setOpenMain] = useState(false);
  const [openAuth, setOpenAuth] = useState(false);

  // menus object
  const authObject = getLinksCollapse('Authentication');
  const mainObject = getLinksCollapse('Main Pages');
  const dashboardsObject = getLinks('Dashboards');
  const nftsObject = getLinks('NFTs');
  // menus links
  function getLinks(routeName: string) {
    const foundRoute = routes.filter(function (route) {
      return route.items && route.name === routeName;
    });
    return foundRoute[0].items;
  }

  function getLinksCollapse(routeName: string) {
    const foundRoute = routes.filter(
      (route) => route.items && route.name === routeName,
    );
    // let foundLinks: { name: string; layout?: string; path: string; component?: () => JSX.Element }[];
    const foundLinks: IRoute[] = [];
    if (foundRoute[0].items) {
      for (let link = 0; link < foundRoute[0].items.length; link++) {
        foundLinks.push(foundRoute[0].items[link]);
      }
      return foundLinks;
    }

    return foundLinks;
  }
  const createDashboardsLinks = (routes: IRoute[]) => {
    return routes.map((link, key) => {
      return (
        <NavLink
          key={key}
          href={link.layout + link.path}
          styles={{ maxWidth: 'max-content' }}
        >
          <p className="text-sm font-medium text-gray-600">{link.name}</p>
        </NavLink>
      );
    });
  };
  const createNftsLinks = (routes: IRoute[]) => {
    return routes.map((link, key) => {
      return (
        <NavLink
          key={key}
          href={link.layout + link.path}
          styles={{ maxWidth: 'max-content' }}
        >
          <p className="text-sm font-medium text-gray-600">{link.name}</p>
        </NavLink>
      );
    });
  };
  const createMainLinks = (routes: IRoute[]) => {
    return routes.map((link, key) => {
      if (link.collapse === true) {
        return (
          <div className="flex w-max flex-col flex-wrap" key={key}>
            <div className="mb-2 flex cursor-default items-center">
              <p className="mr-auto text-sm font-bold uppercase text-navy-700 dark:text-white">
                {link.name}
              </p>
            </div>
            <div className="flex w-max flex-col flex-wrap gap-1 dark:text-white">
              {createMainLinks(link.items)}
            </div>
          </div>
        );
      } else {
        return (
          <NavLink key={key} href={link.layout + link.path}>
            <p className="text-sm text-gray-600">{link.name}</p>
          </NavLink>
        );
      }
    });
  };
  const createAuthLinks = (routes: IRoute[]) => {
    return routes.map((link, key) => {
      if (link.collapse === true) {
        return (
          <div className="flex w-max flex-col flex-wrap" key={key}>
            <div className="mb-1 flex cursor-default items-center">
              <p className="mr-auto text-sm font-bold uppercase text-navy-700 dark:text-white">
                {link.name}
              </p>
            </div>
            <div className="flex flex-col flex-wrap gap-1">
              {createAuthLinks(link.items)}
            </div>
          </div>
        );
      } else {
        return (
          <NavLink key={key} href={link.layout + link.path}>
            <p className="text-sm text-gray-600">{link.name}</p>
          </NavLink>
        );
      }
    });
  };

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
