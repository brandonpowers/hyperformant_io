/* eslint-disable */

import { HiX } from 'react-icons/hi';
import Links from './components/Links';

import SidebarCard from 'components/ui/sidebar/components/SidebarCard';
import CompanySelector from 'components/ui/sidebar/components/CompanySelector';
import Card from 'components/ui/card';
import { IRoute } from 'types/navigation';
import { useContext, useState, useEffect } from 'react';
import { ConfiguratorContext } from 'contexts/ConfiguratorContext';

function SidebarHorizon(props: { routes: IRoute[]; [x: string]: any }) {
  const { routes, open, setOpen, variant, setHovered, hovered } = props;
  const context = useContext(ConfiguratorContext);
  const { mini } = context;
  
  // Track viewport height for responsive blue card
  const [showCard, setShowCard] = useState(true);
  
  useEffect(() => {
    const checkViewportHeight = () => {
      setShowCard(window.innerHeight >= 650); // Hide card if height is less than 650px
    };
    
    checkViewportHeight();
    window.addEventListener('resize', checkViewportHeight);
    
    return () => window.removeEventListener('resize', checkViewportHeight);
  }, []);
  return (
    <div
      className={`${
        mini === false
          ? 'w-[285px]'
          : mini === true && hovered === true
          ? 'w-[285px]'
          : 'w-[285px] xl:!w-[120px]'
      } duration-175 linear transition-all flex-shrink-0 sticky top-6 overflow-visible ${
        variant === 'auth' ? 'xl:hidden' : 'xl:block'
      } ${open ? '' : 'hidden xl:block'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card
        extra={`w-full h-auto flex flex-col overflow-visible`}
      >
        <div className="flex flex-col">
          <div className="flex-shrink-0">
            <span
              className="absolute right-4 top-4 block cursor-pointer xl:hidden"
              onClick={() => setOpen(false)}
            >
              <HiX />
            </span>
            <CompanySelector mini={mini} hovered={hovered} />
            <div className="my-6 h-px bg-gray-200 dark:bg-white/10" />
          </div>
          {/* Nav items */}
          <div className="flex-1">
            <ul>
              <Links mini={mini} hovered={hovered} routes={routes} />
            </ul>
          </div>
          {/* Free Horizon Card - responsive to viewport height */}
          {showCard && (
            <div className="mb-[44px] mt-[28px] flex-shrink-0">
              <div className="flex justify-center">
                <SidebarCard mini={mini} hovered={hovered} />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default SidebarHorizon;
