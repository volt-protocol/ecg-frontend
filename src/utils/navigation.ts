import { IRoute } from 'types/navigation';
import Router from 'next/router';

// NextJS Requirement
export const isWindowAvailable = () => typeof window !== 'undefined';

export const findCurrentRoute = (routes: IRoute[], pathname: string): IRoute => {
  if (!isWindowAvailable()) return null;

  for (let route of routes) {
    if (pathname == '/' && route.path == '') return route;
    else if (route.path != '') {
      if (pathname == '/' + route.path && pathname.length == ('/' + route.path).length && route) return route;
    }
  }
};

export const getActiveRoute = (routes: IRoute[], pathname: string): string => {
  const route = findCurrentRoute(routes, pathname);
  return route?.name || 'Dashboard';
};

export const getActiveNavbar = (routes: IRoute[], pathname: string): boolean => {
  const route = findCurrentRoute(routes, pathname);
  return route?.secondary;
};

export const getActiveNavbarText = (routes: IRoute[], pathname: string): string | boolean => {
  return getActiveRoute(routes, pathname) || false;
};
