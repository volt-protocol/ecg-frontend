import React, { ReactNode } from 'react';
import type { Metadata } from 'next'
import { TAB_DESCRIPTION, TAB_TITLE } from 'utils/constants';
 
export const metadata: Metadata = {
  title: `Bridge | ${TAB_TITLE}`,
  description: TAB_DESCRIPTION,
}
 
export default function Layout({ children }: { children: ReactNode }) {
  return children
}
