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
      if (pathname == '/' && routeName == '') return true;
      else if (pathname == '/profile' && routeName == '') return true;
      else if (routeName != '') {
        return pathname == '/' + routeName || pathname.includes('/' + routeName);
      }
    },
    [pathname]
  );

  const createLinks = (routes: RoutesType[]) => {
    return routes
      .filter((item) => item.show)
      .map((route, index) => {
        return (
          <NavLink key={index} href={'/' + route.path}>
            <div
              className={clsx(
                'relative mx-2 my-1 flex rounded-md py-2 transition-all duration-200 ease-in hover:cursor-pointer',
                activeRoute(route.path) === true
                  ? 'bg-brand-100/80 font-semibold text-brand-500 dark:bg-brand-300/80 dark:text-white'
                  : 'font-medium text-stone-600 hover:bg-stone-100/40 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-navy-100/10'
              )}
            >
              <li className="my-[3px] flex cursor-pointer items-center px-8" key={index}>
                <span>{route.icon ? route.icon : <DashIcon />} </span>
                <p className="leading-1 ml-4 flex">{route.name}</p>
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
