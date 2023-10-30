import React, { useEffect } from "react";
import TotalSpent from "../default/components/TotalSpent";
import Card from "components/card";
import { Flowbite, Tabs } from "flowbite-react";
import customTheme from "customThemeFlowbite";
import { BsArrowDownLeft, BsArrowUpRight } from "react-icons/bs";
import { Address, readContract } from "@wagmi/core";
import { creditAbi, guildAbi } from "guildAbi";
import { useAccount } from "wagmi";
import { DecimalToUnit } from "utils";
import Delegate from "./components/DelegateGuild";
import DelegateGuild from "./components/DelegateGuild";
import DelegateCredit from "./components/DelegateCredit";
import { get } from "api/base";
import CreateNewTerm from "./components/CreateNewTerm";
import OnboardTerm from "./components/OnboardTerm";
import OffBoardTerm from "./components/OffboardTerm";
import CurrentOnboardingProposals from "./components/CurrentOnboardingProposal";
import CurrentOffboardingProposals from "./components/CurrentOffboardingProposals";
import PendingSuccessfullProposals from "./components/PendingSuccessfulProposals";
// import Delegate from './components/Delegate'

export type Delegatee = {
  address: string;
  votes: number;
};

function Governance() {
  const { address, isConnected, isDisconnected } = useAccount();
  const [guildBalance, setGuildBalance] = React.useState(undefined);
  const [guildNotUsed, setGuildNotUsed] = React.useState(undefined);
  const [reloadGuild, setReloadGuild] = React.useState<boolean>(false);
  const [reloadCredit, setReloadCredit] = React.useState<boolean>(false);
  const [creditBalance, setCreditBalance] = React.useState(undefined);
  const [creditNotUsed, setCreditNotUsed] = React.useState(undefined);
  const [guildreceived, setGuildreceived] = React.useState(undefined);
  const [creditreceived, setCreditreceived] = React.useState(undefined);

  async function getGuildBalance(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_GUILD_ADDRESS as Address,
      abi: guildAbi,
      functionName: "balanceOf",
      args: [address],
    });
    setGuildBalance(DecimalToUnit(result as bigint, 18));
  }
  async function getGuildNotUsed(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_GUILD_ADDRESS,
      abi: guildAbi,
      functionName: "freeVotes",
      args: [address],
    });
    setGuildNotUsed(DecimalToUnit(result as bigint, 18));
  }
  async function getGuildreceived(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_GUILD_ADDRESS,
      abi: guildAbi,
      functionName: "getVotes",
      args: [address],
    });
    setGuildreceived(DecimalToUnit(result as bigint, 18));
  }
  


  useEffect(() => {
    if (isConnected) {
      getGuildBalance();
      getGuildNotUsed();
      getGuildreceived();
      setReloadGuild(false);
      console.log('test')
    }
    else{
      setGuildBalance(undefined);
      setGuildNotUsed(undefined);
      setGuildreceived(undefined);
    }
  }, [isConnected, reloadGuild]);

  async function getCreditBalance(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
      abi: creditAbi,
      functionName: "balanceOf",
      args: [address],
    });
    setCreditBalance(DecimalToUnit(result as bigint, 18));
  }
  async function getCreditNotUsed(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_CREDIT_ADDRESS,
      abi: creditAbi,
      functionName: "freeVotes",
      args: [address],
    });
    setCreditNotUsed(DecimalToUnit(result as bigint, 18));
  }
  async function getCreditreceived(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_CREDIT_ADDRESS,
      abi: creditAbi,
      functionName: "getVotes",
      args: [address],
    });
    setCreditreceived(DecimalToUnit(result as bigint, 18));
  }

  useEffect(() => {
    if (isConnected) {
      getCreditBalance();
      getCreditNotUsed();
      getCreditreceived();
      setReloadCredit(false);
    }
    else{
      setCreditBalance(undefined);
      setCreditNotUsed(undefined);
      setCreditreceived(undefined);
    }
  } , [isConnected, reloadCredit]);


  const lineChartDataDebtCeiling = [
    {
      name: "DebCeiling",
      data: [50, 64, 48, 66, 49, 68],
      color: "#4318FF",
    },
    {
      name: "Utilization",
      data: [30, 40, 24, 46, 20, 46],
      color: "#6AD2FF",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
        <TotalSpent
          name="utilization/cap vs time"
          percentage="2.45%"
          data={lineChartDataDebtCeiling}
        />
        <TotalSpent
          name="Earning vs time"
          percentage="2.45%"
          data={lineChartDataDebtCeiling}
        />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card >
          <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
              Delegate GUILD
            </h2>
            <div className=" mt-6 space-y-8">
              <div className="rounded-xl ">
                <DelegateGuild
                  reloadGuild={setReloadGuild}
                  balance={guildBalance}
                  notUsed={guildNotUsed}
                  guildReceived={guildreceived} 
                  userAddress={address}
                  isConnected={isConnected}
                ></DelegateGuild>
              </div>
            </div>
          </div>
        </Card>
        <Card >
          <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
              Delegate CREDIT
            </h2>
            <div className=" mt-6 space-y-8">
              <div className="rounded-xl ">
                <DelegateCredit
                 reloadCredit={setReloadCredit}
                  balance={creditBalance}
                  notUsed={creditNotUsed}
                  creditReceived={creditreceived}
                  userAddress={address}
                  isConnected={isConnected}
                ></DelegateCredit>
              </div>
            </div>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Create New Term
            </h2>
          <CreateNewTerm/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Onboard a New Term
            </h2>
          <OnboardTerm/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Onboard Term
            </h2>
          <OnboardTerm/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Offboard an Active Term
            </h2>
          <OffBoardTerm/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Current Onboarding Proposals
            </h2>
          <CurrentOnboardingProposals/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Current Offboarding Proposals
            </h2>
          <CurrentOffboardingProposals/>
          </div>
        </Card>
        <Card>
        <div className=" rounded-xl px-6 mt-4 ">
            <h2 className="text-left text-xl font-bold text-navy-700 dark:text-white">
            Current PendingS uccessfull Proposals
            </h2>
          <PendingSuccessfullProposals/>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Governance;
