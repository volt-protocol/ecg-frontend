import React from 'react';

// Admin Imports

// Icon Imports
import {
  MdOutlineAccountBalance,
  MdOutlineAnalytics,
  MdOutlineBalance,
  MdOutlineHandshake,
  MdAddToPhotos,
  MdOutlineSavings,
  MdPersonOutline
} from 'react-icons/md';
import { PiParachute } from 'react-icons/pi';

const routes = [
  {
    name: 'Home',
    layout: '/',
    path: '',
    icon: <MdOutlineAnalytics className="h-6 w-6" />,
    show: true
  },
  {
    name: 'Borrow',
    layout: '/',
    path: 'borrow',
    icon: <MdOutlineHandshake className="h-6 w-6" />,
    secondary: true,
    show: true
  },
  {
    name: 'Borrow Details',
    layout: '/',
    path: 'borrow/details',
    icon: <MdOutlineHandshake className="h-6 w-6" />,
    secondary: true,
    show: false
  },
  {
    name: 'Stake',
    layout: '/',
    path: 'stake',
    icon: <MdAddToPhotos className="h-6 w-6" />,
    secondary: true,
    show: true
  },
  {
    name: 'Stake Details',
    layout: '/',
    path: 'stake/details',
    icon: <MdAddToPhotos className="h-6 w-6" />,
    secondary: true,
    show: false
  },
  // {
  //   name: "Leverage",
  //   layout: "/",
  //   path: "leverage",
  //   icon: <MdOutlineShowChart className="h-6 w-6" />,
  //   show: true,
  // },
  {
    name: 'Earn',
    layout: '/',
    icon: <MdOutlineSavings className="h-6 w-6" />,
    path: 'earn',
    show: true
  },
  {
    name: 'Governance',
    layout: '/',
    path: 'governance',
    icon: <MdOutlineAccountBalance className="h-6 w-6" />,
    show: true
  },
  {
    name: 'Auctions',
    layout: '/',
    path: 'auctions',
    icon: <MdOutlineBalance className="h-6 w-6" />,
    show: true
  },
  {
    name: 'GUILD Airdrop',
    layout: '/',
    path: 'airdrop',
    icon: <PiParachute className="h-6 w-6" />,
    show: true
  },
  {
    name: 'Terms & Conditions',
    layout: '/',
    path: 'terms-conditions',
    icon: <MdPersonOutline className="h-6 w-6" />,
    show: false
  },
  {
    name: 'Risk Statement',
    layout: '/',
    path: 'risk-statement',
    icon: <MdPersonOutline className="h-6 w-6" />,
    show: false
  }
];
export default routes;
