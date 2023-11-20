'use client';
// Layout components
import { usePathname } from 'next/navigation';
import { useContext, useState } from 'react';
import routes from 'routes';
import {
  getActiveNavbar,
  getActiveRoute,
  isWindowAvailable,
} from 'utils/navigation';
import React from 'react';
import { Portal } from '@chakra-ui/portal';
import Navbar from 'components/navbar';
import Sidebar from 'components/sidebar';
import Footer from 'components/footer/Footer';
import { useAccount } from 'wagmi';
import clsx from 'clsx';
import { ToastContainer } from 'react-toastify';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()
  // states and functions
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  // if (isWindowAvailable()) document.documentElement.dir = 'ltr';
  

  return (
    <div className="flex h-full w-full bg-background-100/70 dark:bg-background-900">
      <ToastContainer />
      <Sidebar routes={routes} open={open} setOpen={setOpen} variant="admin" />
      {/* Navbar & Main Content */}
      <div className="h-full w-full dark:bg-navy-900">
        {/* Main Content */}
        <main
          className={`mx-2.5 flex-none dark:bg-navy-900 md:pr-2 xl:ml-[290px]`}
        >
          {/* Routes */}
          <div className="min-h-screen">
            <Navbar
              onOpenSidenav={() => setOpen(!open)}
              pathname={pathname}
              brandText={getActiveRoute(routes, pathname)}
              secondary={getActiveNavbar(routes, pathname)}
            />
            <div className="mx-auto min-h-[100%] p-2 !pt-[10px] md:p-2">
              {children}
            </div>
            {!isConnected && (
              <div className={'mt-20 relative'}>
                <Footer />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}