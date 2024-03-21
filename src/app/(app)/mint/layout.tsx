import React, { ReactNode } from 'react';
import type { Metadata } from 'next'
import { TAB_DESCRIPTION, TAB_TITLE } from 'utils/constants';
 
export const metadata: Metadata = {
  title: `Mint & Save | ${TAB_TITLE}`,
  description: TAB_DESCRIPTION,
}
 

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
