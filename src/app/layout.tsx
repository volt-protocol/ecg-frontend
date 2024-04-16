import React, { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import Web3Provider from 'contexts/Web3Provider';
import NoSSRWrapper from 'layouts/NoSSRWrapper';

/* CSS Files */
import 'styles/App.css';
import 'styles/Contact.css';
import 'styles/MiniCalendar.css';
import 'styles/index.css';
import StoreProvider from 'contexts/StoreProvider';
import KBarWrapper from 'layouts/KBarWrapper';

const inter = Inter({
  subsets: ['latin']
});

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export default function RootLayout({ children }: { children: ReactNode }) {
  
  return (
    <html lang="en" className={inter.className}>
      <body id={'root'}>
        <NoSSRWrapper>
          <Web3Provider>
            <StoreProvider>
              <KBarWrapper>{children}</KBarWrapper>
            </StoreProvider>
          </Web3Provider>
        </NoSSRWrapper>
      </body>
    </html>
  );
}
