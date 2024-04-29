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
    name: 'Stake',
    layout: '/',
    path: 'stake',
    icon: <MdAddToPhotos className="h-6 w-6" />,
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
  // {
  //   name: "Leverage",
  //   layout: "/",
  //   path: "leverage",
  //   icon: <MdOutlineShowChart className="h-6 w-6" />,
  //   show: true,
  // },
  {
    name: 'Lend or Redeem',
    layout: '/',
    icon: <MdOutlineSavings className="h-6 w-6" />,
    path: 'mint',
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
    name: 'Cross chain Bridge',
    layout: '/',
    path: 'bridge',
    icon: <MdOutlineBalance className="h-6 w-6" />,
    show: false
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
