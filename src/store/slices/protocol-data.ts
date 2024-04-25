// Libraries
import { StateCreator } from 'zustand';
import { wagmiConfig } from 'contexts/Web3Provider';
import { ContractsList } from './contracts-list';
import { multicall } from '@wagmi/core';
import { CreditABI, GuildABI, OffboardGovernorGuildABI, ProfitManagerABI, PsmABI, PsmUsdcABI } from 'lib/contracts';
import { Abi } from 'viem';

export interface ProtocolDataSlice {
  creditMultiplier: bigint;
  creditSupply: bigint;
  totalWeight: bigint;
  offboardQuorum: bigint;
  offboardDurationBlock: bigint;
  deprecatedGauges: string[];
  delegateLockupPeriod: bigint;
  psmPegTokenBalance: bigint;
  fetchProtocolData: (marketId: number, chainId: number, contractsList: ContractsList) => Promise<void>;
}

export const createProtocolDataSlice: StateCreator<ProtocolDataSlice> = (set, get) => ({
  creditMultiplier: BigInt(0),
  creditSupply: BigInt(0),
  totalWeight: BigInt(0),
  offboardQuorum: BigInt(0),
  offboardDurationBlock: BigInt(0),
  deprecatedGauges: [],
  delegateLockupPeriod: BigInt(0),
  psmPegTokenBalance: BigInt(0),
  fetchProtocolData: async (marketId: number, chainId: number, contractsList: ContractsList) => {
    const profitManagerAddress = contractsList.marketContracts[marketId].profitManagerAddress;
    const guildAddress = contractsList.guildAddress;
    const creditAddress = contractsList.marketContracts[marketId].creditAddress;
    const psmAddress = contractsList?.marketContracts[marketId].psmAddress;

    const contracts = [
      {
        address: profitManagerAddress,
        abi: ProfitManagerABI as Abi,
        functionName: 'creditMultiplier',
      },
      {
        address: creditAddress,
        abi: CreditABI as Abi,
        functionName: 'totalSupply',
      },
      {
        address: guildAddress,
        abi: GuildABI as Abi,
        functionName: 'totalTypeWeight',
        args: [marketId],
      },
      {
        address: contractsList.lendingTermOffboardingAddress,
        abi: OffboardGovernorGuildABI as Abi,
        functionName: 'quorum',
      },
      {
        address: contractsList.lendingTermOffboardingAddress,
        abi: OffboardGovernorGuildABI as Abi,
        functionName: 'POLL_DURATION_BLOCKS',
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI as Abi,
        functionName: 'deprecatedGauges',
      },
      {
        address: creditAddress,
        abi: CreditABI as Abi,
        functionName: 'delegateLockupPeriod',
      },
      {
        address: psmAddress,
        abi: PsmABI as Abi,
        functionName: 'pegTokenBalance',
      }
    ];

    // @ts-ignore
    const protocolData = await multicall(wagmiConfig, {
      contracts: contracts,
      chainId: chainId as any
    });

    set({
      creditMultiplier: protocolData[0].result as bigint,
      creditSupply: protocolData[1].result as bigint,
      totalWeight: protocolData[2].result as bigint,
      offboardQuorum: protocolData[3].result as bigint,
      offboardDurationBlock: protocolData[4].result as bigint,
      deprecatedGauges: protocolData[5].result as string[],
      delegateLockupPeriod: protocolData[6].result as bigint,
      psmPegTokenBalance: protocolData[7].result as bigint,
    });
  }
});
