import React, { ReactNode } from 'react';
import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Mint & Save | Ethereum Credit Guild',
  description: 'Unlocking the Future of Finance',
}
 

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
