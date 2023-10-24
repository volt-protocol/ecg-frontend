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
  profitManager,
  surplusGuildMinterAbi,
  termAbi,
  usdcAbi,
} from "guildAbi";
import { useAccount, useContractEvent } from "wagmi";
import { Address, readContract } from "@wagmi/core";
import { DecimalToUnit, preciseRound, secondsToAppropriateUnit } from "utils";
import { useLocation, useParams } from "react-router-dom";
import Myloans from "./components/MyLoans";
import CreateLoan from "./components/CreateLoan";
import Stake from "./components/StakeCredit";
import ActiveLoans from "./components/ActiveLoans";
import { LoansObj, lendingTerms, loanObj } from "types/lending";
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
import { TbArrowsExchange } from "react-icons/tb";
import { AiFillClockCircle, AiOutlineQuestionCircle } from "react-icons/ai";
import { publicClient } from "wagmiConfig";
import { getLoansCall } from "./components/ContractEvents";


function LendingTerm() {
  const { address, isConnected, isDisconnected } = useAccount();
  const [guildAllocated, setGuildAllocated] = React.useState<number>();
  const [guildBalance, setGuildBalance] = React.useState<number>();
  const [guildAvailableToStake, setGuildAvailableToStake] = React.useState(0);
  const [creditAllocated, setCreditAllocated] = React.useState<number>();
  const [creditAvailable, setCreditAvailable] = React.useState<number>();
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
  const [ratioGuildCredit, setRatioGuildCredit] = useState<number>(0);
  const [debtCeilling, setDebtCeilling] = useState<number>(0);
  const [currentDebt, setCurrentDebt] = useState<number>(0);
  const [profitSharing, setProfitSharing] = React.useState({
    creditSplit: "",
    guildSplit: "",
    surplusBufferSplit: "",
  });
  const [reload, setReload] = useState<boolean>(false);
  const [Utilization, setUtilization] = useState<string>("");
  const [loans, setLoans] = useState<loanObj[]>([]);

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

  const lineChartDataEarning = [
    {
      name: "Earnings (realized)",
      data: [50, 64, 48, 66, 49, 68],
      color: "#4318FF",
    },
    {
      name: "Earnings (pending)",
      data: [30, 40, 24, 46, 20, 46],
      color: "#6AD2FF",
    },
  ];

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
      setUtilization(
        preciseRound(
          (currentDebt / creditTotalSupply) *
            (gaugeWeight / totalWeight) *
            100,
          2
        ).toString()
      );
    }
  }, [lendingTermData, creditTotalSupply, gaugeWeight, totalWeight]);

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
      const result = DecimalToUnit(balance as bigint, 18);

      setGuildBalance(result);
    }
    async function getGuildAvailableToStake(): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_GUILD_ADDRESS,
        abi: guildAbi,
        functionName: "getUserWeight",
        args: [address],
      });
      setGuildAvailableToStake(DecimalToUnit(result as bigint, 18));
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
    async function getLoans2(): Promise<Object> {
      const loansCall = await getLoansCall(location.pathname.split("/")[3] as Address)
      setLoans(loansCall)
      return loansCall
    }

    if (isConnected) {
      getGuildAvailable();
      getGuildAllocated();
      getCreditAllocated();
      getCreditdAvailable();
      getLoans();
      getMyLoans();
      getGuildAvailableToStake();
    }
    // setGuildAvailable( parseInt(getGuildAvailable, 10) / 1e18 );
    else {
      setGuildAllocated(undefined);
      setGuildBalance(undefined);
      setCreditAllocated(undefined);
      setCreditAvailable(undefined);
      getLoans();
    }
    getLoans2()
    setReload(false);
  }, [isConnected, reload]);

  useEffect(() => {
    async function getGaugeWeight(): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_GUILD_ADDRESS as Address,
        abi: guildAbi,
        functionName: "getGaugeWeight",
        args: [contractAddress],
      });
      setGaugeWeight(Number(DecimalToUnit(result as bigint, 18)));
    }
    async function getTotalWeight(): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_GUILD_ADDRESS as Address,
        abi: guildAbi,
        functionName: "totalTypeWeight",
        args: [1],
      });
      setTotalWeight(Number(DecimalToUnit(result as bigint, 18)));
    }
    async function getCreditTotalSupply(): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
        abi: guildAbi,
        functionName: "totalSupply",
        args: [],
      });
      setCreditTotalSupply(Number(DecimalToUnit(result as bigint, 18)));
    }
    async function getRationGUILDCREDIT() {
      const ratio = await readContract({
        address: import.meta.env.VITE_SURPLUS_GUILD_MINTER_ADDRESS as Address,
        abi: surplusGuildMinterAbi,
        functionName: "ratio",
      });
      setRatioGuildCredit(DecimalToUnit(ratio as bigint, 18));
    }
    async function getProfitSharing(): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_PROFIT_MANAGER_ADDRESS as Address,
        abi: profitManager,
        functionName: "getProfitSharingConfig",
      });

      if (Array.isArray(result) && result.length >= 3) {
        setProfitSharing({
          creditSplit: preciseRound(
            DecimalToUnit(result[0] as bigint, 18) * 100,
            2
          ),
          guildSplit: preciseRound(
            DecimalToUnit(result[1] as bigint, 18) * 100,
            2
          ),
          surplusBufferSplit: preciseRound(
            DecimalToUnit(result[2] as bigint, 18) * 100,
            2
          ),
        });
      } else {
        throw new Error("Invalid profit sharing config");
      }
    }
    async function getCurrentDebt(): Promise<void> {
      const result = await readContract({
        address: contractAddress as Address,
        abi: termAbi,
        functionName: "issuance",
      });
      setCurrentDebt(Number(DecimalToUnit(result as bigint, 18)));
    }
    getProfitSharing();
    getGaugeWeight();
    getTotalWeight();
    getCreditTotalSupply();
    getRationGUILDCREDIT();
    getCurrentDebt();
  }, [reload]);

  useEffect(() => {
    setDebtCeilling(creditTotalSupply * (gaugeWeight / totalWeight));
  }, [creditTotalSupply, gaugeWeight, totalWeight]);

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
                  <p>
                    Total Collateral :{" "}
                    <span className="font-semibold">{preciseRound(termTotalCollateral,2)}</span>
                  </p>
                  <p>
                    Collateral Value :{" "}
                    <span className="font-semibold">
                      {collateralPrice}$ (source: Coingecko API)
                    </span>{" "}
                  </p>
                  <p>
                    Total Collateral Value :{" "}
                    <span className="font-semibold">
                      {preciseRound(termTotalCollateral * collateralPrice, 2)}$
                    </span>
                  </p>
                </div>
              }
              trigger={
                <Widget
                  icon={<BsBank2 className="h-7 w-7" />}
                  title={"TVL"}
                  subtitle={
                    collateralPrice === 0
                      ? "-.--$"
                      : preciseRound(
                          termTotalCollateral * collateralPrice,
                          2
                        ).toString() + "$"
                  }
                  extra={<AiOutlineQuestionCircle color="gray" />}
                />
              }
              placement="bottom"
            />
            <TooltipHorizon
              extra=""
              content={
                <div>
                  <p>
                    Current Debt :{" "}
                    <span className="font-semibold">
                      {preciseRound(currentDebt, 2)}
                    </span>
                  </p>
                  <p>
                    Debt Ceilling :{" "}
                    <span className="font-semibold">
                      {preciseRound(debtCeilling, 2)}$
                    </span>{" "}
                  </p>
                </div>
              }
              trigger={
                <Widget
                  icon={<GiProgression className="h-6 w-6" />}
                  title={"Utilization"}
                  subtitle={Utilization === "NaN" ? "-.--%" : Utilization + "%"}
                  extra={<AiOutlineQuestionCircle color="gray" />}
                />
              }
              placement="bottom"
            />
            <Widget
              icon={<MdBarChart className="h-7 w-7" />}
              title={"Opening Fee"}
              subtitle={
                preciseRound(lendingTermData.openingFee, 2).toString() + "%"
              }
            />
            <Widget
              icon={<TbArrowsExchange className="h-6 w-6" />}
              title={"Interest Rate"}
              subtitle={
                preciseRound(lendingTermData.interestRate * 100, 2).toString() +
                "%"
              }
            />
            <Widget
              icon={<MdCurrencyExchange className="h-7 w-7" />}
              title={"Borrow Ratio"}
              subtitle={preciseRound(lendingTermData.borrowRatio, 2).toString()}
            />
            <TooltipHorizon
              extra="dark:text-white w-[300px] "
              content={
                <>
                  <p>
                    Minimum periodic repayment :{" "}
                    <span className="font-semibold">
                      {" "}
                      {preciseRound(
                        lendingTermData.minPartialRepayPercent * 100000,
                        2
                      )}{" "}
                      CREDIT every{" "}
                      {secondsToAppropriateUnit(
                        lendingTermData.maxDelayBetweenPartialRepay
                      )}{" "}
                      per 100K CREDIT borrowed{" "}
                    </span>
                  </p>
                  <p>
                    As a borrower, if you miss periodic repayments, your loan
                    will be called
                  </p>
                </>
              }
              trigger={
                <div className="">
                  <Widget
                    icon={<AiFillClockCircle className="h-6 w-6" />}
                    title={"Periodic Payments"}
                    subtitle={
                      lendingTermData.minPartialRepayPercent ? "Yes" : "No"
                    }
                    extra={
                      lendingTermData.minPartialRepayPercent ? (
                        <AiOutlineQuestionCircle color="gray" />
                      ) : (
                        <></>
                      )
                    }
                  />
                </div>
              }
              placement="right"
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <TotalSpent
              name="Debt Ceiling vs Time"
              percentage="2.45%"
              data={lineChartDataDebtCeiling}
            />
            <TotalSpent
              name="Earnings vs Time"
              percentage="2.45%"
              data={lineChartDataEarning}
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 ">
            <Card extra="md:col-span-1 order-2">
              <Myloans
                tableData={loans}
                collateralName={lendingTermData.collateral}
                collateralPrice={collateralPrice}
                smartContractAddress={contractAddress}
                maxDelayBetweenPartialRepay={
                  lendingTermData.maxDelayBetweenPartialRepay  }
                  collateralDecimals={lendingTermData.collateralDecimals}
                  reload={setReload}
              
              />
            </Card>
            <Card extra={"order-1 "}>
              <CreateLoan
                name={lendingTermData.collateral}
                contractAddress={contractAddress}
                collateralAddress={lendingTermData.collateralAddress}
                openingFee={lendingTermData.openingFee}
                minBorrow={lendingTermData.minBorrow}
                borrowRatio={lendingTermData.borrowRatio}
                callFee={lendingTermData.callFee}
                currentDebt={currentDebt}
                availableDebt={debtCeilling-currentDebt}
                collateralDecimals={lendingTermData.collateralDecimals}
                reload={setReload}
              />
            </Card>
            <Card extra="order-3">
              <div className=" h-full  rounded-xl">
                <h2 className="ml-6 mt-4 text-start text-xl font-semibold text-navy-700  dark:text-white">
                  Stake GUILD
                </h2>
                <TooltipHorizon
                  extra="z-10 !w-[450px] dark:text-white"
                  content={
                    <div className="space-y-2 p-2">
                      <p>
                        Staked GUILD increase the debt ceiling of lending terms
                        (available CREDIT to borrow).
                      </p>

                      <p>
                        If the term creates bad debt, the GUILD tokens staked
                        for this term are slashed.
                      </p>

                      <p>
                        When you stake your GUILD tokens on a term, this portion
                        of your balance becomes non-transferable, and if you
                        attempt to transfer your tokens, your GUILD will be
                        unstaked, which will decrease the debt ceiling. If the
                        debt ceiling cannot be decreased (due to active
                        borrowing demand), the loans have to be repaid or called
                        first. Loans can only be called if they missed a period
                        payment or if the term has been offboarded.
                      </p>

                      <p>
                        GUILD staked on a term earns a proportional share of the
                        fees earned by this term. If you represent{" "}
                        <strong>50%</strong> of the GUILD staked for a term, you
                        will earn <strong>50%</strong> of the fees earned by
                        GUILD holders on this term.
                      </p>

                      <p>
                        The protocol profit sharing can be updated by
                        governance, and is configured as follow :<br></br>-{" "}
                        <strong>{profitSharing.creditSplit}</strong>% to CREDIT
                        savers (through rebase)<br></br>-{" "}
                        <strong>{profitSharing.surplusBufferSplit}</strong>% to
                        the Surplus Buffer, a first-loss capital reserve shared
                        among all terms<br></br>-{" "}
                        <strong>{profitSharing.guildSplit}</strong> % to GUILD
                        token holders who stake their tokens to increase the
                        debt ceiling of terms
                      </p>
                    </div>
                  }
                  trigger={
                    <div className="ml-6 flex space-x-2 text-sm font-semibold text-gray-400">
                      <h4>Risk your GUILD tokens & earn CREDIT rewards</h4>
                      <AiOutlineQuestionCircle color="gray" />
                    </div>
                  }
                  placement="bottom"
                />
                <div className=" mt-6 space-y-8">
                  <div className="rounded-xl ">
                    <Flowbite theme={{ theme: customTheme }}>
                      <Tabs.Group
                        aria-label="Tabs with underline"
                        style="underline"
                        className="z-0"
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
                            guildBalance={guildBalance}
                            smartContractAddress={contractAddress}
                            currentDebt={currentDebt}
                            availableDebt={lendingTermData.availableDebt}
                            gaugeWeight={gaugeWeight}
                            totalWeight={totalWeight}
                            creditTotalSupply={creditTotalSupply}
                            guildAvailableToStake={guildAvailableToStake}
                            reload={setReload}
                          ></AllocateGuild>
                        </Tabs.Item>
                        <Tabs.Item icon={BsArrowDownLeft} title="Unstake GUILD">
                          <AllocateGuild
                            textButton="Decrement"
                            allocatedGuild={guildAllocated}
                            guildBalance={guildBalance}
                            smartContractAddress={contractAddress}
                            currentDebt={currentDebt}
                            availableDebt={lendingTermData.availableDebt}
                            gaugeWeight={gaugeWeight}
                            totalWeight={totalWeight}
                            creditTotalSupply={creditTotalSupply}
                            guildAvailableToStake={guildAvailableToStake}
                            reload={setReload}
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
                <TooltipHorizon
                  extra="z-10 !w-[450px] dark:text-white"
                  content={
                    <div className="space-y-2 p-2">
                      <p>
                        The CREDIT staked will act as first-loss capital if this
                        term creates bad debt. You will not recover any CREDIT
                        if this term creates bad debt while you staked.
                      </p>

                      <p>
                        For each CREDIT staked,{" "}
                        <strong>{preciseRound(ratioGuildCredit, 2)}</strong>{" "}
                        GUILD will be minted & staked for this term (see Stake
                        GUILD tooltip), which will increase the debt ceiling
                        (available CREDIT to borrow) in this term.
                      </p>

                      <p>
                        You will earn CREDIT from the regular GUILD stake
                        rewards, plus an additional <strong>X.XX</strong> GUILD
                        per CREDIT earned.
                      </p>
                    </div>
                  }
                  trigger={
                    <div className="ml-6 flex space-x-2 text-sm font-semibold text-gray-400">
                      <h4>
                        Provide first lost capital & earn CREDIT + GUILD rewards
                      </h4>
                      <AiOutlineQuestionCircle color="gray" />
                    </div>
                  }
                  placement="bottom"
                />
                <div className=" mt-8 space-y-8">
                  <div className="rounded-xl ">
                    <Flowbite theme={{ theme: customTheme }}>
                      <Tabs.Group
                        aria-label="Tabs with underline"
                        style="underline"
                        className="z-0 text-white"
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
                            gaugeWeight={gaugeWeight}
                            totalWeight={totalWeight}
                            creditTotalSupply={creditTotalSupply}
                            ratioGuildCredit={ratioGuildCredit}
                            reload={setReload}
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
                            gaugeWeight={gaugeWeight}
                            totalWeight={totalWeight}
                            creditTotalSupply={creditTotalSupply}
                            ratioGuildCredit={ratioGuildCredit}
                            reload={setReload}
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
                activeLoans={loans}
                collateralAddress={lendingTermData.collateralAddress}
                collateralDecimals={lendingTermData.collateralDecimals}
                reload={setReload}
                
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

export default LendingTerm;
