import React from "react";

// Admin Imports
import MainDashboard from "views/app/default";
import NFTMarketplace from "views/app/marketplace";
import Profile from "views/app/profile";
import DataTables from "views/app/tables";
import RTLDefault from "views/rtl/default";
import LendingTerms from "views/app/LendingTerms";

// Auth Imports
import SignIn from "views/auth/SignIn";

// Icon Imports
import {
  MdHome,
  MdOutlineShoppingCart,
  MdBarChart,
  MdPerson,
  MdLock,
} from "react-icons/md";

import { GiBanknote } from "react-icons/gi";
import LendingTerm from "views/app/LendingTerm";

const routes : RoutesType[] = [
  {
    name: "Main Dashboard",
    layout: "/app",
    path: "default",
    icon: <MdHome className="h-6 w-6" />,
    component: <MainDashboard />,
    showInSidebar:true
  },
  {
    name: "NFT Marketplace",
    layout: "/app",
    path: "nft-marketplace",
    icon: <MdOutlineShoppingCart className="h-6 w-6" />,
    component: <NFTMarketplace />,
    secondary: true,
    showInSidebar:true
  },
  {
    name: "Data Tables",
    layout: "/app",
    icon: <MdBarChart className="h-6 w-6" />,
    path: "data-tables",
    component: <DataTables />,
    showInSidebar:true
  },
  {
    name: "Profile",
    layout: "/app",
    path: "profile",
    icon: <MdPerson className="h-6 w-6" />,
    component: <Profile />,
    showInSidebar:true
  },
  {
    name: "Sign In",
    layout: "/auth",
    path: "sign-in",
    icon: <MdLock className="h-6 w-6" />,
    component: <SignIn />,
    showInSidebar:true
  },
  {
    name: "RTL Admin",
    layout: "/rtl",
    path: "rtl",
    icon: <MdHome className="h-6 w-6" />,
    component: <RTLDefault />,
    showInSidebar:true
  },
  {
    name: "Lending Terms",
    layout: "/app",
    path: "lendingTerms",
    icon: <GiBanknote className="h-6 w-6 " />,
    component: <LendingTerms />,
    showInSidebar:true
  },
  {
    name: "Lending Term Details",
    layout: "/app",
    path: "lendingTerms/:contractAddress",
    icon: <GiBanknote className="h-6 w-6 " />,
    component: <LendingTerm />,
    showInSidebar:false
  },

];
export default routes;
