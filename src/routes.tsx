import React from "react";

// Admin Imports
import MainDashboard from "views/app/default";
import LendingTerms from "views/app/LendingTerms";



// Icon Imports
import {
  MdHome,
  MdOutlineShoppingCart,
  MdBarChart,
  MdPerson,
  MdLock,
} from "react-icons/md";

import { GiBanknote } from "react-icons/gi";
import { GoLaw } from "react-icons/go";
import { MdOutlineSavings } from "react-icons/md";
import LendingTerm from "views/app/LendingTerm";
import Governance from "views/app/Governance";
import SavingRate from "views/app/MintAndSaving";
import MintAndCredit from "views/app/MintAndSaving";
import MintAndSaving from "views/app/MintAndSaving";

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
    showInSidebar:false,
    secondary:true
  },
  {
    name: "Mint & Saving",
    layout: "/app",
    path: "mintAndSaving",
    icon: <MdOutlineSavings className="h-6 w-6 " />,
    component: <MintAndSaving />,
    showInSidebar:true,
    secondary:true
  },
  {
    name: "Governance",
    layout: "/app",
    path: "governance",
    icon: <GoLaw className="h-6 w-6 " />,
    component: <Governance />,
    showInSidebar:true,
    secondary:true
  },

];
export default routes;
