import React from 'react';

// Admin Imports

// Icon Imports
import {
  MdOutlineAnalytics,
  MdOutlineBalance,
  MdOutlineHandshake,
  MdOutlineSavings,
} from 'react-icons/md';

const routes = [
  {
    name: 'Dashboard',
    layout: '/',
    path: '',
    icon: <MdOutlineAnalytics className="h-6 w-6" />,
    show: true,
  },
  {
    name: 'Lending Terms',
    layout: '/',
    path: 'lending',
    icon: <MdOutlineHandshake className="h-6 w-6" />,
    secondary: true,
    show: true
  },
  {
    name: 'Lending Details',
    layout: '/',
    path: 'lending/details',
    icon: <MdOutlineHandshake className="h-6 w-6" />,
    secondary: true,
    show: false
  },
  {
    name: 'Mint & Saving',
    layout: '/',
    icon: <MdOutlineSavings className="h-6 w-6" />,
    path: 'mint',
    show: true
  },
  {
    name: 'Governance',
    layout: '/',
    path: 'governance',
    icon: <MdOutlineBalance className="h-6 w-6" />,
    show: true
  }
];
export default routes;
