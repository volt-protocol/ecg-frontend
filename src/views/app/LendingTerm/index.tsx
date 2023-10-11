import React, { useEffect, useState } from "react";
import TotalSpent from "../default/components/TotalSpent";
import Card from "components/card";
import AllocateGuild from "views/app/LendingTerm/components/AllocateGuild";
import { Flowbite, Tabs } from "flowbite-react";
import { BsArrowDownLeft, BsArrowUpRight, BsBank2 } from "react-icons/bs";
import customTheme from "customThemeFlowbite";
import {
  creditAbi,
  guildAbi,
  surplusGuildMinterAbi,
  termAbi,
  usdcAbi,
} from "guildAbi";
import { useAccount } from "wagmi";
import { Address, readContract } from "@wagmi/core";
import { DecimalToUnit, preciseRound } from "utils";
import { useLocation, useParams } from "react-router-dom";
import Myloans from "./components/MyLoans";
import CreateLoan from "./components/CreateLoan";
import Stake from "./components/StakeCredit";
import ActiveLoans from "./components/ActiveLoans";
import { LoansObj, lendingTerms } from "types/lending";
import api from "api";
import axios, { AxiosResponse } from "axios";
import { useRecoilState } from "recoil";
import { lendingTermsAtom } from "../../../store/index";
import SpinnerLoader from "components/spinner";
import Widget from "components/widget/Widget";
import { MdBarChart, MdCurrencyExchange, MdDashboard } from "react-icons/md";
import { IoDocuments } from "react-icons/io5";
import { IoMdHome } from "react-icons/io";
import { nameCoinGecko } from "coinGecko";
import TooltipHorizon from "components/tooltip";
import { GiProgression } from "react-icons/gi";
import {TbArrowsExchange} from "react-icons/tb";
import { AiFillClockCircle } from "react-icons/ai";

function LendingTerm() {
  const { address, isConnected, isDisconnected } = useAccount();
  const [guildAllocated, setGuildAllocated] = React.useState(0);
  const [guildAvailable, setGuildAvailable] = React.useState(0);
  const [creditAllocated, setCreditAllocated] = React.useState(0);
  const [creditAvailable, setCreditAvailable] = React.useState(0);
  const [userActiveLoans, setUserActiveLoans] = React.useState<LoansObj[]>([]);
  const [activeLoans, setActiveLoans] = React.useState<LoansObj[]>([]);
  const [lendingTermsState, setLendingTermsState] =
    useRecoilState(lendingTermsAtom);
  const { contractAddress } = useParams();
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);
  const [lendingTermData, setLendingTermData] = React.useState<lendingTerms>();
  const [collateralPrice, setCollateralPrice] = React.useState(0);
  const [termTotalCollateral, setTermTotalCollateral] = React.useState(0);
  const [gaugeWeight, setGaugeWeight] = useState<number>(0);
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [creditTotalSupply, setCreditTotalSupply] = useState<number>(0);
  useEffect(() => {
    const item = lendingTermsState.find(
      (entry: lendingTerms) => entry.address === location.pathname.split("/")[3]
    );
    if (item) {
      setLendingTermData(item);
      setLoading(false);
    }
  }, [lendingTermsState]);

  useEffect(() => {
    async function getCollateralPrice() {
      //requête axios en post vers coinmarketcap avec sort au name et limit à 1.
      const nameCG = nameCoinGecko.find(
        (name) => name.nameECG === lendingTermData.collateral
      )?.nameCG;
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${nameCG}&vs_currencies=usd`,
        {}
      );
      setCollateralPrice(response.data[nameCG].usd);
    }
    async function getTermsTotalCollateral() {
      const result = await readContract({
        address: lendingTermData.collateralAddress as Address,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [lendingTermData.address],
      });

      setTermTotalCollateral(
        DecimalToUnit(result as bigint, lendingTermData.collateralDecimals)
      );
    }
    if (lendingTermData) {
      getCollateralPrice();
      getTermsTotalCollateral();
    }
  }, [lendingTermData]);

  useEffect(() => {
    async function getGuildAllocated(): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_GUILD_ADDRESS,
        abi: guildAbi,
        functionName: "getUserGaugeWeight",
        args: [address, contractAddress],
      });
      setGuildAllocated(DecimalToUnit(result as bigint, 18));
    }
    async function getGuildAvailable(): Promise<void> {
      const balance = await readContract({
        address: import.meta.env.VITE_GUILD_ADDRESS,
        abi: guildAbi,
        functionName: "balanceOf",
        args: [address],
      });
      const result = DecimalToUnit(balance as bigint, 18) - guildAllocated;
      setGuildAvailable(result);
    }

    async function getCreditAllocated(): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_SURPLUS_GUILD_MINTER_ADDRESS as Address,
        abi: surplusGuildMinterAbi,
        functionName: "stakes",
        args: [address, contractAddress],
      });
      setCreditAllocated(DecimalToUnit(result as bigint, 18));
    }
    async function getCreditdAvailable(): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
        abi: creditAbi,
        functionName: "balanceOf",
        args: [address],
      });
      setCreditAvailable(DecimalToUnit(result as bigint, 18));
    }
    async function getLoans(): Promise<void> {
      const activeLoans: AxiosResponse<LoansObj[]> =
        await api.lendingTerms.getActiveLoans(contractAddress);
      if (activeLoans.data) {
        setActiveLoans(activeLoans.data);
      }
    }
    async function getMyLoans(): Promise<void> {
      const activeLoans: AxiosResponse<LoansObj[]> =
        await api.lendingTerms.getUserActiveLoans(contractAddress, address);
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

  useEffect(() => {
    async function getGaugeWeight():Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_GUILD_ADDRESS as Address,
      abi: guildAbi,
      functionName: "getGaugeWeight",
      args: [contractAddress],
    });
    setGaugeWeight( Number(DecimalToUnit(result as bigint,18)));
  }
  async function getTotalWeight():Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_GUILD_ADDRESS as Address,
      abi: guildAbi,
      functionName: "totalTypeWeight",
      args: [1],
    });
    setTotalWeight( Number(DecimalToUnit(result as bigint,18)));
  }
  async function getCreditTotalSupply():Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
      abi: guildAbi,
      functionName: "totalSupply",
      args: [],
    });
    setCreditTotalSupply( Number(DecimalToUnit(result as bigint,18)));
  }

  getGaugeWeight();
  getTotalWeight();
  getCreditTotalSupply();
 }, []);

  return (
    <>
      {loading ? (
        <div className="absolute h-screen w-full">
          <SpinnerLoader />
        </div>
      ) : (
        <div>
          <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-6">
            <TooltipHorizon
              extra=""
              content={
                <div>
                  <p>Total Collateral : <span className="font-semibold">{termTotalCollateral}</span></p>
                  <p>Collateral Value : <span className="font-semibold">{collateralPrice}$</span> </p>
                  <p>Total Collateral Value : <span className="font-semibold">{preciseRound(termTotalCollateral*collateralPrice,2)}$</span></p>
                </div>
              }
              trigger={
                <Widget
                  icon={<BsBank2 className="h-7 w-7" />}
                  title={"TVL"}
                  subtitle={preciseRound(termTotalCollateral * collateralPrice,2).toString()+"$"}
                />
              }
              placement="bottom"
            />
            <TooltipHorizon
              extra=""
              content={
                <div>
                  <p>Current Debt : <span className="font-semibold">{lendingTermData.currentDebt}</span></p>
                  <p>Debt Ceilling : <span className="font-semibold">{creditTotalSupply*(gaugeWeight/totalWeight)}$</span> </p>
                 
                </div>
              }
              trigger={
            <Widget
              icon={<GiProgression className="h-6 w-6" />}
              title={"Utilizaion"}
              subtitle={preciseRound((lendingTermData.currentDebt/creditTotalSupply*(gaugeWeight/totalWeight)*100),2).toString()+"%"}
            />
              }
              placement="bottom"
            />
            <Widget
              icon={<MdBarChart className="h-7 w-7" />}
              title={"Opening Fee"}
              subtitle={preciseRound(lendingTermData.openingFee,2).toString() + "%"}
            />
            <Widget
              icon={<TbArrowsExchange className="h-6 w-6" />}
              title={"Interest Rate"}
              subtitle={preciseRound(lendingTermData.interestRate,2).toString() + "%"}
            />
            <Widget
              icon={<MdCurrencyExchange className="h-7 w-7" />}
              title={"Borrow Ratio"}
              subtitle={preciseRound(lendingTermData.borrowRatio,2).toString()}
            />
            <Widget
              icon={<AiFillClockCircle className="h-6 w-6" />}
              title={"Periodic Payment"}
              subtitle={(lendingTermData.minPartialRepayPercent?"Yes":"No")}
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <TotalSpent name="utilization/cap vs time" percentage="2.45%" />
            <TotalSpent name="Earning vs time" percentage="2.45%" />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 ">
            <Card extra="md:col-span-1 order-2">
              <Myloans
                tableData={userActiveLoans}
                collateralName={lendingTermData.collateral}
                collateralPrice={collateralPrice}
                smartContractAddress={contractAddress}
              />
            </Card>
            <Card extra={userActiveLoans.length > 0 ? "order-2 " : ""}>
              <CreateLoan
                name={lendingTermData.collateral}
                contractAddress={contractAddress}
                collateralAddress={lendingTermData.collateralAddress}
                openingFee={lendingTermData.openingFee}
                minBorrow={lendingTermData.minBorrow}
                borrowRatio={lendingTermData.borrowRatio}
                callFee={lendingTermData.callFee}
                currentDebt={lendingTermData.currentDebt}
                availableDebt={lendingTermData.availableDebt}
                collateralDecimals={lendingTermData.collateralDecimals}
              />
            </Card>
            <Card extra="order-3">
              <div className=" h-full  rounded-xl">
                <h2 className="ml-6 mt-4 text-start text-xl font-semibold text-navy-700  dark:text-white">
                  Stake GUILD
                </h2>
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
                            gaugeWeight={gaugeWeight}
                            totalWeight={totalWeight}
                            creditTotalSupply={creditTotalSupply}
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
                            gaugeWeight={gaugeWeight}
                            totalWeight={totalWeight}
                            creditTotalSupply={creditTotalSupply}
                          ></AllocateGuild>
                        </Tabs.Item>
                      </Tabs.Group>
                    </Flowbite>
                  </div>
                </div>
              </div>
            </Card>

            <Card extra="order-4">
              <div className="  rounded-xl">
                <h2 className="ml-6 mt-4 text-start text-xl font-semibold text-navy-700  dark:text-white">
                  Stake CREDIT
                </h2>
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
                        <Tabs.Item
                          icon={BsArrowDownLeft}
                          title="Unstake Credit"
                        >
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
            <Card extra={"order-5 md:col-span-2"}>
              <ActiveLoans
                maxDelayBetweenPartialRepay={
                  lendingTermData.maxDelayBetweenPartialRepay
                }
                collateralName={lendingTermData.collateral}
                termAddress={contractAddress}
                activeLoans={activeLoans}
                callFee={lendingTermData.callFee}
                collateralAddress={lendingTermData.collateralAddress}
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

export default LendingTerm;
