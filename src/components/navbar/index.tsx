'use client';
import React, { useEffect } from 'react';
import { FiAlignJustify } from 'react-icons/fi';
import NavLink from 'components/link/NavLink';
import { RiMoonFill, RiSunFill } from 'react-icons/ri';
import { MdArrowBack, MdVisibility } from 'react-icons/md';
import Link from 'next/link';
import { useAccount, useConnect } from 'wagmi';
import SearchBar from './SearchBar';
import { useRouter } from 'next/navigation';
import { ConnectWeb3Button } from 'components/button/ConnectWeb3Button';

const Navbar = (props: {
  onOpenSidenav: () => void;
  brandText: string;
  secondary?: boolean | string;
  pathname: string;
  [x: string]: any;
}) => {
  const { connector: activeConnector, isConnected } = useAccount();
  const router = useRouter();
  const { onOpenSidenav, brandText, pathname } = props;
  const [darkmode, setDarkmode] = React.useState(document.body.classList.contains('dark'));

  let previousPath = pathname.split('/');
  previousPath.pop();
  const previousPathName = previousPath.join('/') || '/';
  const isNestedRoute = pathname.match(/\//g).length > 1;

  return (
    <nav className="sticky top-0 z-40 bg-white/10 p-2 backdrop-blur-xl dark:bg-[#0b14374d]">
      <div className="ml-[6px] mt-2 flex flex-row items-center justify-between gap-2 text-stone-700 dark:text-white">
        <div className="flex items-center gap-2">
          {isNestedRoute ? (
            <Link href={previousPathName}>
              <button
                type="button"
                className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm text-stone-600 shadow-sm transition-all duration-150 ease-in-out hover:bg-brand-100/30 hover:text-stone-800 dark:bg-navy-700 dark:text-stone-300 dark:hover:text-stone-100"
              >
                <MdArrowBack className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:block">Go Back</span>
              </button>
            </Link>
          ) : null}
          <NavLink href="#" className="text-2xl font-medium hover:text-stone-700 dark:hover:text-white">
            {brandText}
          </NavLink>
          {pathname == '/' && isConnected && (
            <Link href={'/profile'}>
              <button
                type="button"
                className="mr-2 inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm text-stone-600 shadow-sm transition-all duration-150 ease-in-out hover:bg-brand-100/30 hover:text-stone-800 dark:bg-navy-700 dark:text-stone-200 dark:hover:bg-navy-600"
              >
                <MdVisibility className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                <span className="hidden lg:block">{'View my statistics'}</span>
              </button>
            </Link>
          )}
          {pathname == '/profile' && isConnected && (
            <Link href={'/'}>
              <button
                type="button"
                className="mr-2 inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm text-stone-600 shadow-sm transition-all duration-150 ease-in-out hover:bg-brand-100/30 hover:text-stone-800 dark:bg-navy-700 dark:text-stone-200 dark:hover:bg-navy-600"
              >
                <MdVisibility className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                <span className="hidden lg:block">{'View global statistics'}</span>
              </button>
            </Link>
          )}
        </div>

        <div className="flex w-full items-center justify-end gap-2 dark:shadow-none md:w-fit md:flex-grow-0 md:gap-2 xl:w-fit">
          {/* Search User Wallet */}
          <div className="hidden md:block">
            <SearchBar />
          </div>

          {/* Web3 Connect Button */}
          <ConnectWeb3Button />

          {/* Dark Mode */}
          <div
            className="hidden cursor-pointer text-stone-600 md:block"
            onClick={() => {
              if (darkmode) {
                document.body.classList.remove('dark');
                setDarkmode(false);
              } else {
                document.body.classList.add('dark');
                setDarkmode(true);
              }
            }}
          >
            {darkmode ? (
              <RiSunFill className="h-4 w-4 text-stone-600 dark:text-white" />
            ) : (
              <RiMoonFill className="h-4 w-4 text-stone-600 dark:text-white" />
            )}
          </div>
          {/* Mobile Hamburger */}
          <span
            className="flex cursor-pointer text-xl text-stone-600 dark:text-white xl:hidden"
            onClick={onOpenSidenav}
          >
            <FiAlignJustify className="h-5 w-5" />
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
