import React, { useEffect } from "react";
import TotalSpent from "../default/components/TotalSpent";
import Card from "components/card";
import {
  Address,
  useAccount,
  useContractWrite,
  usePrepareContractWrite,
} from "wagmi";
import { creditAbi, profitManager } from "guildAbi";
import { readContract, waitForTransaction, writeContract } from "@wagmi/core";
import { DecimalToUnit, preciseRound } from "utils";
import { toastError, toastRocket } from "toast";
import SpinnerLoader from "components/spinner";
import TooltipHorizon from "components/tooltip";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import MintOrRedeem from "./components/MintOrRedeem";

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

    async function isRebasing(): Promise<void> {
      const result = await readContract({
        address: import.meta.env.VITE_CREDIT_ADDRESS as Address,
        abi: creditAbi,
        functionName: "isRebasing",
        args: [address],
      });
      setIsRebasing(result as boolean);
    }
    if (isConnected) {
      getCreditAvailable();
      isRebasing();
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

  return (
    <div className="mt-10 space-y-10">
      {loading && <SpinnerLoader />}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-1">
        <TotalSpent name="Earning/Drawddowns" percentage="2.45%" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card extra="space-y-7 p-4">
          <h2 className="text-xl font-semibold">CREDIT saving</h2>
          <div className="flex space-x-2  ">
            {creditAvailable && isRebasing ? (
              <p>
                Your are currently saving :
                <span className="font-semibold"> {creditAvailable}</span>
              </p>
            ) : (
              <p>
                You are <span className="font-semibold">not</span> currently
                saving
              </p>
            )}
          </div>
          <div>
          <p className="text-sm">
            When you are saving, the CREDIT balance in your wallet will increase
            automatically when the protocol earns fees from interest payments.
            The current profit sharing configuration is :</p>
            <p>
            <br></br>{" "}
            <span className="font-semibold ">{profitSharing.creditSplit}</span>%
            to CREDIT savers, <br></br>{" "}
            <span className="font-semibold">{profitSharing.guildSplit}</span>%
            to GUILD voters,{" "} <br></br>
            <span className="font-semibold">
              {profitSharing.surplusBufferSplit}
            </span>
            % to surplus buffer
        </p>
        </div>
          <div className="mt-5 grid grid-cols-1 gap-5 gap-x-10 font-semibold text-white md:grid-cols-2">
            <button
              onClick={() => saving("enterRebase")}
              className="rounded-lg bg-primary"
            >
              Start Saving
            </button>
            <button
              onClick={() => saving("exitRebase")}
              className="rounded-lg bg-red-500"
            >
              Stop Saving
            </button>
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
