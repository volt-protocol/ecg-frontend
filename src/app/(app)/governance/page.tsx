'use client';
import Disconnected from 'components/error/disconnected';
import React, { useEffect } from 'react';
import Card from 'components/card';
import { GuildABI, CreditABI } from 'lib/contracts';
import { useAccount, useReadContracts } from 'wagmi';
import DelegateGuild from './components/DelegateGuild';
import DelegateCredit from './components/DelegateCredit';
import OffboardTerm from './components/OffboardTerm';
import OnboardNewterm from './components/OnboardNewTerm';
import { useAppStore, useUserPrefsStore } from 'store';
import Spinner from 'components/spinner';
import { getCreditTokenSymbol } from 'utils/strings';

export type Delegatee = {
  address: string;
  votes: number;
};

function Governance() {
  const { contractsList, coinDetails, delegateLockupPeriod } = useAppStore();
  const { appMarketId, appChainId } = useUserPrefsStore();
  const { address, isConnected, isDisconnected } = useAccount();
  const [reloadGuild, setReloadGuild] = React.useState<boolean>(false);
  const [reloadCredit, setReloadCredit] = React.useState<boolean>(false);
  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );
  const creditTokenSymbol = getCreditTokenSymbol(coinDetails, appMarketId, contractsList);

  //TODO:  optimize contracts call with useReadContracts
  const { data, isError, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: 'balanceOf',
        args: [address],
        chainId: appChainId
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: 'freeVotes',
        args: [address],
        chainId: appChainId
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI,
        functionName: 'getVotes',
        args: [address],
        chainId: appChainId
      },
      {
        address: contractsList.marketContracts[appMarketId]?.creditAddress,
        abi: CreditABI,
        functionName: 'balanceOf',
        args: [address],
        chainId: appChainId
      },
      {
        address: contractsList.marketContracts[appMarketId]?.creditAddress,
        abi: CreditABI,
        functionName: 'freeVotes',
        args: [address],
        chainId: appChainId
      },
      {
        address: contractsList.marketContracts[appMarketId]?.creditAddress,
        abi: CreditABI,
        functionName: 'getVotes',
        args: [address],
        chainId: appChainId
      }
    ],
    query: {
      select: (data) => {
        return {
          guildBalance: (data[0].result as bigint) || BigInt(0),
          guildNotUsed: (data[1].result as bigint) || BigInt(0),
          guildVotingWeight: (data[2].result as bigint) || BigInt(0),
          creditBalance: (data[3].result as bigint) || BigInt(0),
          creditNotUsed: (data[4].result as bigint) || BigInt(0),
          creditVotingWeight: (data[5].result as bigint) || BigInt(0),
          delegateLockupPeriod: delegateLockupPeriod
        };
      }
    }
  });
  // TODO : listen to event to update guild and credit values

  useEffect(() => {
    if (isConnected && (reloadGuild || reloadCredit)) {
      refetch();
      setReloadGuild(false);
      setReloadCredit(false);
    }
  }, [isConnected, reloadGuild, reloadCredit]);

  if (!contractsList?.marketContracts[appMarketId]) {
    return <Spinner />;
  }

  /*if (!isConnected) {
    return <Disconnected />;
  }*/

  if (isLoading) return <Spinner />;

  if (data) {
    return (
      <div>
        <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">Delegate</h3>
        <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card title="Delegate GUILD" extra="w-full h-full sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
            <DelegateGuild
              reloadGuild={setReloadGuild}
              guildBalance={data?.guildBalance}
              guildNotUsed={data?.guildNotUsed}
              guildVotingWeight={data?.guildVotingWeight}
              userAddress={address}
              isConnected={isConnected}
            />
          </Card>
          <Card
            title={`Delegate ${creditTokenSymbol}`}
            extra="w-full h-full sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4"
          >
            <DelegateCredit
              reloadCredit={setReloadCredit}
              creditBalance={data?.creditBalance}
              creditNotUsed={data?.creditNotUsed}
              creditVotingWeight={data?.creditVotingWeight}
              userAddress={address}
              isConnected={isConnected}
              delegateLockupPeriod={data?.delegateLockupPeriod}
              creditTokenSymbol={creditTokenSymbol}
            />
          </Card>
        </div>
        <h3 className="mb-4 ml-8 mt-6 text-xl font-semibold text-gray-700 dark:text-white">Participate</h3>
        <div className="mb-40 mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card title="Onboard Active Term" extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
            <OnboardNewterm guildVotingWeight={data?.guildVotingWeight} creditVotingWeight={data?.creditVotingWeight} />
          </Card>
          <Card title="Offboard Active Term" extra="w-full min-h-[300px] sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
            <OffboardTerm guildVotingWeight={data?.guildVotingWeight} />
          </Card>
        </div>
      </div>
    );
  }
}

export default Governance;
