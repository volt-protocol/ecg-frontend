import React, { useEffect } from "react";
import TotalSpent from "../default/components/TotalSpent";
import Card from "components/card";
import Swap from "views/app/LendingTerm/components/AllocateGuild";
import { Flowbite, Tabs } from "flowbite-react";
import { BsArrowDownLeft, BsArrowUpRight } from "react-icons/bs";
import customTheme from "customThemeFlowbite";
import {guildAbi} from "guildAbi";
import { useAccount } from "wagmi";
import { readContract } from "@wagmi/core";
import { DecimalToUnit } from "utils";
import { useLocation, useParams } from "react-router-dom";
import Myloans from "./components/MyLoans";
import CreateLoan from "./components/CreateLoan";





function LendingTerm() {
  const { address, isConnected, isDisconnected } = useAccount();
  const [guildAllocated, setGuildAllocated] = React.useState(0);
  const [guildAvailable, setGuildAvailable] = React.useState(0);
  const { contractAddress } = useParams();
  const location = useLocation();
  const {collateralAddress, collateralDecimals, openingFee, minBorrow,borrowRatio,callFee,interestRate,availableDebt} = location.state
  
  

  useEffect(() => {
    async function getGuildAvailable() {
      const result = await readContract({
        address: "0x3F5252562b9446fBC7A9d432A60F739054B2c253",
        abi: guildAbi,
        functionName: "balanceOf",
        args: [address],
      });
      setGuildAvailable(DecimalToUnit(result as bigint,18));
    }
    async function getGuildAllocated() {
      const result = await readContract({
        address: "0x3F5252562b9446fBC7A9d432A60F739054B2c253",
        abi: guildAbi,
        functionName: "getUserGaugeWeight",
        args: [address, contractAddress],
      });
      setGuildAllocated(DecimalToUnit(result as bigint,18));
    }
    if (isConnected) {
      getGuildAvailable();
      getGuildAllocated();
    }
    // setGuildAvailable( parseInt(getGuildAvailable, 10) / 1e18 );
    else {
      setGuildAvailable(0);
      setGuildAllocated(0);
    }
  }, [isConnected]);

  const sampleData = [
    {
      loadId: "0x7e8bd85415223b43e6753077a0bbd8eb44ec0745ec7f116900da17e89c42cb63",
      address: "0x12345abcde",
      collateralAddress: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
      name:"USDC",
      collateralCredit: 5000,
      borrowCredit: 2500,
      ltv: 50,
    },
    {
      loadId: "0x02bfc5cb6ef91bfddd927e94bdc58880890c53e72ae7d8022f561315109c91a7",
      address: "0xabcdef1234",
      collateralAddress: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
      name:"DAI",
      collateralCredit: 10000,
      borrowCredit: 3000,
      ltv: 30,
    },
    {
      loadId: "L003",
      address: "0x56789efgh",
      name:"USDC",
      collateralCredit: 7500,
      borrowCredit: 4500,
      ltv: 60,
    },
    {
      loadId: "L004",
      address: "0xlmnopqrs0",
      name:"USDC",
      collateralCredit: 9000,
      borrowCredit: 5000,
      ltv: 55,
    },
    {
      loadId: "L005",
      address: "0xztuvwxyc9",
      name:"USDC",
      collateralCredit: 12000,
      borrowCredit: 7000,
      ltv: 58,
    },
  ];
  
  

  return (
    <div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <TotalSpent name="utilization/cap vs time" percentage="2.45%" />
        <TotalSpent name="Earning vs time" percentage="2.45%" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-1 ">
        <Card>
          
          <Myloans tableData={sampleData}   smartContractAddress={contractAddress}/>
        </Card>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 ">
        <Card>
          <div className="bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 rounded-xl">
          <h2 className="text-center text-3xl font-bold mt-6 text-white">Guild votes</h2>
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
                    title="Stack Guild"
                  >
                    <Swap
                      textButton="Increment"
                      allocatedGuild={guildAllocated}
                      availableGuild={guildAvailable}
                      smartContractAddress={contractAddress}
                    ></Swap>
                  </Tabs.Item>
                  <Tabs.Item icon={BsArrowDownLeft} title="Unstack Guild">
                    <Swap
                      textButton="Decrement"
                      allocatedGuild={guildAllocated}
                      availableGuild={guildAvailable}
                      smartContractAddress={contractAddress}
                    ></Swap>
                  </Tabs.Item>
                </Tabs.Group>
              </Flowbite>
            </div>
          </div>
          </div>
        </Card>
        <Card>
          <CreateLoan owner={address} contractAddress={contractAddress} collateralAddress={collateralAddress} openingFee={openingFee} minBorrow={minBorrow} borrowRatio={borrowRatio} callFee={callFee} interestRate={interestRate} availableDebt={availableDebt} collateralDecimals={collateralDecimals} />
        </Card>
      </div>
    </div>
  );
}

export default LendingTerm;
