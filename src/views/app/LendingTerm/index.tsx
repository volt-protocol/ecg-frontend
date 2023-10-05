import React, { useEffect } from "react";
import TotalSpent from "../default/components/TotalSpent";
import Card from "components/card";
import AllocateGuild from "views/app/LendingTerm/components/AllocateGuild";
import { Flowbite, Tabs } from "flowbite-react";
import { BsArrowDownLeft, BsArrowUpRight } from "react-icons/bs";
import customTheme from "customThemeFlowbite";
import {creditAbi, guildAbi, surplusGuildMinterAbi} from "guildAbi";
import { useAccount } from "wagmi";
import { Address, readContract } from "@wagmi/core";
import { DecimalToUnit } from "utils";
import { useLocation, useParams } from "react-router-dom";
import Myloans from "./components/MyLoans";
import CreateLoan from "./components/CreateLoan";
import Stake from "./components/Stake";
import ActiveLoans from "./components/ActiveLoans";
import { LoansObj, lendingTerms } from "types/lending";
import api from "api";
import { AxiosResponse } from "axios";
import { useRecoilState } from 'recoil';
import { lendingTermsAtom } from '../../../store/index';
import SpinnerLoader from "components/spinner";




function LendingTerm() {
  const { address, isConnected, isDisconnected } = useAccount();
  const [guildAllocated, setGuildAllocated] = React.useState(0);
  const [guildAvailable, setGuildAvailable] = React.useState(0);
  const [creditAllocated, setCreditAllocated] = React.useState(0);
  const [creditAvailable, setCreditAvailable] = React.useState(0);
  const [userActiveLoans, setUserActiveLoans] = React.useState<LoansObj[]>([]);
  const [activeLoans, setActiveLoans] = React.useState<LoansObj[]>([]);
  const [lendingTermsState, setLendingTermsState] = useRecoilState(lendingTermsAtom);
  const { contractAddress } = useParams();
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);
  const [lendingTermData, setLendingTermData] = React.useState<lendingTerms>();
  useEffect(() => {
    const item = lendingTermsState.find(

      (entry : lendingTerms) => entry.address === location.pathname.split("/")[3]
    );
    if (item){
      setLendingTermData(item);
      setLoading(false);
    }
    }, [lendingTermsState]);


  useEffect(() => {
    async function getGuildAvailable():Promise<void> {
      const result = await readContract({
        address: "0x3F5252562b9446fBC7A9d432A60F739054B2c253",
        abi: guildAbi,
        functionName: "balanceOf",
        args: [address],
      });
      setGuildAvailable(DecimalToUnit(result as bigint,18));
    }
    async function getGuildAllocated():Promise<void>  {
      const result = await readContract({
        address: "0x3F5252562b9446fBC7A9d432A60F739054B2c253",
        abi: guildAbi,
        functionName: "getUserGaugeWeight",
        args: [address, contractAddress],
      });
      setGuildAllocated(DecimalToUnit(result as bigint,18));
    }
   
    async function getCreditAllocated() :Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_SURPLUS_GUILD_MINTER_ADDRESS as Address,
        abi: surplusGuildMinterAbi,
        functionName: "stakes",
        args: [contractAddress,address],
      });
      setCreditAllocated(DecimalToUnit(result as bigint,18));
    }
    async function getCreditdAvailable():Promise<void>  {
      const result = await readContract({
        address:import.meta.env.VITE_CREDIT_ADDRESS as Address,
        abi: creditAbi,
        functionName: "balanceOf",
        args: [address],
      });
      setCreditAvailable(DecimalToUnit(result as bigint,18));
    }
    async function getLoans():Promise<void>  {
      const activeLoans :AxiosResponse<LoansObj[]> = await api.lendingTerms.getActiveLoans(contractAddress);
      if (activeLoans.data) {
        setActiveLoans(activeLoans.data);
      }
    }
    async function getMyLoans():Promise<void>  {
      const activeLoans :AxiosResponse<LoansObj[]> = await api.lendingTerms.getUserActiveLoans(contractAddress, address);
      if (activeLoans.data) {
        setUserActiveLoans(activeLoans.data);
      }
    }
    if (isConnected) {
      getGuildAvailable();
      getGuildAllocated();
      getCreditAllocated();
      getCreditdAvailable();
      getLoans();
      getMyLoans();
    }
    // setGuildAvailable( parseInt(getGuildAvailable, 10) / 1e18 );
    else {
      setGuildAvailable(0);
      setGuildAllocated(0);
      setCreditAllocated(0);
      setCreditAvailable(0);
      getLoans();
    }
  }, [isConnected]);

  return (
    <>
    {loading ? (
       <div className="absolute h-screen w-full">
       <SpinnerLoader />
     </div>
     ):(
    <div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <TotalSpent name="utilization/cap vs time" percentage="2.45%" />
        <TotalSpent name="Earning vs time" percentage="2.45%" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 ">
        <Card extra={userActiveLoans.length>0?"col-span-2 order-1":"col-span-1 order-2"}>
          <Myloans tableData={userActiveLoans} collateralName={lendingTermData.collateral}   smartContractAddress={contractAddress}/>
        </Card>
        <Card extra={userActiveLoans.length>0?"order-4":""}>
          <CreateLoan name={lendingTermData.collateral} contractAddress={contractAddress} collateralAddress={lendingTermData.collateralAddress} openingFee={lendingTermData.openingFee} minBorrow={lendingTermData.minBorrow} borrowRatio={lendingTermData.borrowRatio} callFee={lendingTermData.callFee} currentDebt={lendingTermData.currentDebt} availableDebt={lendingTermData.availableDebt} collateralDecimals={lendingTermData.collateralDecimals} />
        </Card>
        <Card extra="order-3">
          <div className=" h-full  rounded-xl">
          <h2 className="text-center text-3xl font-bold mt-6 text-black dark:text-white">Stake GUILD</h2>
          <div className=" mt-6 space-y-8">
            <div className="rounded-xl ">
              <Flowbite theme={{ theme: customTheme }}>
                <Tabs.Group
                  aria-label="Tabs with underline"
                  style="underline"
                
                >
                  <Tabs.Item
                    active
                    className=""
                    icon={BsArrowUpRight}
                    title="Stake GUILD"
                  >
                    <AllocateGuild
                      textButton="Increment"
                      allocatedGuild={guildAllocated}
                      availableGuild={guildAvailable}
                      smartContractAddress={contractAddress}
                      currentDebt={lendingTermData.currentDebt}
                      availableDebt={lendingTermData.availableDebt}
                    ></AllocateGuild>
                  </Tabs.Item>
                  <Tabs.Item icon={BsArrowDownLeft} title="Unstake GUILD">
                    <AllocateGuild
                      textButton="Decrement"
                      allocatedGuild={guildAllocated}
                      availableGuild={guildAvailable}
                      smartContractAddress={contractAddress}
                      currentDebt={lendingTermData.currentDebt}
                      availableDebt={lendingTermData.availableDebt}
                    ></AllocateGuild>
                  </Tabs.Item>
                </Tabs.Group>
              </Flowbite>
            </div>
          </div>
          </div>
        </Card>
        
     
      <Card extra="order-4" >
          <div className="  rounded-xl">
          <h2 className="text-center text-3xl font-bold mt-6 text-black dark:text-white">Stake CREDIT</h2>
          <div className=" mt-8 space-y-8">
            <div className="rounded-xl ">
              <Flowbite theme={{ theme: customTheme }}>
                <Tabs.Group
                  aria-label="Tabs with underline"
                  style="underline"
                  className="text-white"
                >
                  <Tabs.Item
                    active
                    className=""
                    icon={BsArrowUpRight}
                    title="Stake Credit"
                  >
                    <Stake
                      textButton="stake"
                      allocatedCredit={creditAllocated}
                      availableCredit={creditAvailable}
                      termAddress={contractAddress}
                      interestRate={lendingTermData.interestRate}
                    ></Stake>
                  </Tabs.Item>
                  <Tabs.Item icon={BsArrowDownLeft} title="Unstake Credit">
                    <Stake
                      textButton="Unstake"
                      allocatedCredit={creditAllocated}
                      availableCredit={creditAvailable}
                      termAddress={contractAddress}
                      interestRate={lendingTermData.interestRate}
                    ></Stake>
                  </Tabs.Item>
                </Tabs.Group>
              </Flowbite>
            </div>
          </div>
          </div>
        </Card>
        <Card extra={"order-5 col-span-2"}>
          <ActiveLoans termAddress={contractAddress} activeLoans={activeLoans} callFee={lendingTermData.callFee} collateralAddress={lendingTermData.collateralAddress}/>
          </Card>
        </div>
        </div>
     )}
    </>
  );
}

export default LendingTerm;
