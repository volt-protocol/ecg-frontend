import React, { ReactNode } from 'react';
import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Bridge | Volt Protocol',
  description: '...',
}
 
export default function Layout({ children }: { children: ReactNode }) {
  return children
}
