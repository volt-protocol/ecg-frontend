/* eslint-disable */
import React from 'react';
import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import NavLink from 'components/link/NavLink';
import DashIcon from 'components/icons/DashIcon';
import clsx from 'clsx';

export const SidebarLinks = (props: { routes: RoutesType[] }): JSX.Element => {
  // Chakra color mode
  const pathname = usePathname();

  const { routes } = props;

  // verifies if routeName is the one active (in browser input)
  const activeRoute = useCallback(
    (routeName: string) => {
      if(pathname == '/' && routeName == '') return true
      else if(routeName != '') {
        return pathname == '/'+routeName || pathname.includes('/'+routeName)
      }
    },
    [pathname],
  );

  const createLinks = (routes: RoutesType[]) => {
    return routes.filter(item => item.show).map((route, index) => {
      return (
        <NavLink key={index} href={'/' + route.path}>
          <div className={
            clsx("relative py-2 mx-2 my-1 flex rounded-md hover:cursor-pointer transition-all ease-in duration-150",
                activeRoute(route.path) === true
                  ? 'font-semibold text-brand-500 dark:text-white bg-brand-100/50 dark:bg-brand-300/80'
                  : 'font-medium text-gray-600 hover:text-gray-800 dark:text-gray-300 hover:bg-brand-100/30 dark:hover:bg-brand-500/50'
          )}>
            <li
              className="my-[3px] flex cursor-pointer items-center px-8"
              key={index}
            >
              <span>
                {route.icon ? route.icon : <DashIcon />}{' '}
              </span>
              <p
                className="leading-1 ml-4 flex"
              >
                {route.name}
              </p>
            </li>

          </div>
        </NavLink>
      );
    });
  };
  // BRAND
  return <>{createLinks(routes)}</>;
};

export default SidebarLinks;
