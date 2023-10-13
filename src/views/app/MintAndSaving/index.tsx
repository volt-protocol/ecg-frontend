import React, { useEffect } from "react";
import TotalSpent from "../default/components/TotalSpent";
import Card from "components/card";
import { Address, useAccount } from "wagmi";
import { creditAbi, profitManager } from "guildAbi";
import { readContract, waitForTransaction, writeContract } from "@wagmi/core";
import { DecimalToUnit, preciseRound } from "utils";
import { toastError, toastRocket } from "toast";
import SpinnerLoader from "components/spinner";
import MintOrRedeem from "./components/MintOrRedeem";
import { ToggleSwitch } from "flowbite-react";

function MintAndSaving() {
  const [creditAvailable, setCreditAvailable] = React.useState(0);
  const { address, isConnected, isDisconnected } = useAccount();
  const [loading, setLoading] = React.useState(false);
  const [profitSharing, setProfitSharing] = React.useState({
    creditSplit: "",
    guildSplit: "",
    surplusBufferSplit: "",
  });
  const [isRebasing, setIsRebasing] = React.useState(false);

  async function Rebasing(): Promise<void> {
    const result = await readContract({
      address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
      abi: creditAbi,
      functionName: "isRebasing",
      args: [address],
    });
    setIsRebasing(result as boolean);
  }

  useEffect(() => {
    async function getCreditAvailable(): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
        abi: creditAbi,
        functionName: "balanceOf",
        args: [address],
      });
      setCreditAvailable(DecimalToUnit(result as bigint, 18));
    }
    if (isConnected) {
      getCreditAvailable();
      Rebasing();
    } else setCreditAvailable(0);
  }, [isConnected]);

  useEffect(() => {
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
    getProfitSharing();
  }, []);

  async function saving(rebaseMode: string): Promise<void> {
    try {
      setLoading(true);
      const { hash } = await writeContract({
        address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
        abi: creditAbi,
        functionName: rebaseMode,
      });
      const checkStartSaving = await waitForTransaction({
        hash: hash,
      });
      if (checkStartSaving.status != "success") {
        toastError(
          rebaseMode === "enterRebase"
            ? "Start Saving transaction failed"
            : "Stop Saving transaction failed"
        );
        setLoading(false);
        return;
      }
      toastRocket(
        rebaseMode === "enterRebase"
          ? "Start Saving transaction success"
          : "Stop Saving transaction success"
      );
      setLoading(false);
      Rebasing();
    } catch (error) {
      toastError(
        rebaseMode === "enterRebase"
          ? "Start Saving transaction failed"
          : "Stop Saving transaction failed"
      );
      setLoading(false);

      console.log(error);
    }
  }
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
    <div className="mt-10 space-y-10 ">
      {loading && <SpinnerLoader />}
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-1">
        <TotalSpent
          name="Earning/Drawddowns"
          percentage="2.45%"
          data={lineChartDataDebtCeiling}
        />
      </div>
      <div className=" mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card extra="space-y-7 p-4 ">
          <div className="ml-6 flex justify-between ">
            <h2 className="text-xl font-semibold">CREDIT saving</h2>
            <div>
              <ToggleSwitch
                checked={isRebasing}
                label="Saving"
                color="purple"
                onChange={function () {
                  {
                    isRebasing ? saving("exitRebase") : saving("enterRebase");
                  }
                }}
              />
            </div>
          </div>
          <div className="ml-6">
            <p className="text-sm">
              If you elect to receive the savings rate, the CREDIT balance of
              your wallet will automatically rebase up when the protocol earn
              fees. The protocol profit sharing can be updated by governance,
              and is configured as follow :
            </p>
            <p>
              <br></br>{" "}
              <span className="font-semibold ">
                {profitSharing.creditSplit}
              </span>
              % to CREDIT savers (through rebase), <br></br>{" "}
              <span className="font-semibold">
                {profitSharing.surplusBufferSplit}
              </span>
              % to the Surplus Buffer, a first-loss capital reserve shared among
              all terms, <br></br>{" "}
              <span className="font-semibold">{profitSharing.guildSplit}</span>%
              to GUILD token holders who stake their tokens to increase the debt
              ceiling of terms,
            </p>
          </div>
          <div className="flex flex-col space-y-2 ml-6">
            <p>
              Your current CREDIT Balance :
              <span className="font-semibold"> {preciseRound(creditAvailable,2)}</span>
            </p>
            <p>Your current rebasing status : {isRebasing ? "Yes" : "No"}</p>
          </div>
        </Card>
        <Card extra="space-y-5 p-4">
          <MintOrRedeem />
        </Card>
      </div>
    </div>
  );
}

export default MintAndSaving;
