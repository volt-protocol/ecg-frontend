// Libraries
import { StateCreator } from 'zustand';
import { wagmiConfig } from 'contexts/Web3Provider';
import { ContractsList } from './contracts-list';
import { multicall } from '@wagmi/core';
import {
  CreditABI,
  GuildABI,
  OffboardGovernorGuildABI,
  ProfitManagerABI,
  PsmABI,
  PsmUsdcABI,
  SurplusGuildMinterABI
} from 'lib/contracts';
import { Abi } from 'viem';
import { getApiBaseUrl } from 'config';
import { HttpGet } from 'utils/HttpHelper';

export interface ProtocolDataSlice {
  creditHolderCount: number;
  creditMultiplier: bigint;
  creditSupply: bigint;
  totalWeight: bigint;
  offboardQuorum: bigint;
  offboardDurationBlock: bigint;
  deprecatedGauges: string[];
  delegateLockupPeriod: bigint;
  psmPegTokenBalance: bigint;
  minimumCreditStake: bigint;
  fetchProtocolData: (marketId: number, chainId: number, contractsList: ContractsList) => Promise<void>;
}

export interface ApiMarketDataResponse {
  creditMultiplier: string;
  creditHolderCount: number;
}

export const createProtocolDataSlice: StateCreator<ProtocolDataSlice> = (set, get) => ({
  creditHolderCount: 0,
  creditMultiplier: BigInt(0),
  creditSupply: BigInt(0),
  totalWeight: BigInt(0),
  offboardQuorum: BigInt(0),
  offboardDurationBlock: BigInt(0),
  deprecatedGauges: [],
  delegateLockupPeriod: BigInt(0),
  psmPegTokenBalance: BigInt(0),
  minimumCreditStake: BigInt(0),
  fetchProtocolData: async (marketId: number, chainId: number, contractsList: ContractsList) => {
    const profitManagerAddress = contractsList.marketContracts[marketId].profitManagerAddress;
    const guildAddress = contractsList.guildAddress;
    const creditAddress = contractsList.marketContracts[marketId].creditAddress;
    const psmAddress = contractsList?.marketContracts[marketId].psmAddress;
    const surplusGuildMinterAddress = contractsList?.marketContracts[marketId].surplusGuildMinterAddress;

    const contracts = [
      {
        address: profitManagerAddress,
        abi: ProfitManagerABI as Abi,
        functionName: 'creditMultiplier'
      },
      {
        address: creditAddress,
        abi: CreditABI as Abi,
        functionName: 'totalSupply'
      },
      {
        address: guildAddress,
        abi: GuildABI as Abi,
        functionName: 'totalTypeWeight',
        args: [marketId]
      },
      {
        address: contractsList.lendingTermOffboardingAddress,
        abi: OffboardGovernorGuildABI as Abi,
        functionName: 'quorum'
      },
      {
        address: contractsList.lendingTermOffboardingAddress,
        abi: OffboardGovernorGuildABI as Abi,
        functionName: 'POLL_DURATION_BLOCKS'
      },
      {
        address: contractsList.guildAddress,
        abi: GuildABI as Abi,
        functionName: 'deprecatedGauges'
      },
      {
        address: creditAddress,
        abi: CreditABI as Abi,
        functionName: 'delegateLockupPeriod'
      },
      {
        address: psmAddress,
        abi: PsmABI as Abi,
        functionName: 'pegTokenBalance'
      },
      {
        address: surplusGuildMinterAddress,
        abi: SurplusGuildMinterABI as Abi,
        functionName: 'MIN_STAKE'
      }
    ];

    // @ts-ignore
    const protocolData = await multicall(wagmiConfig, {
      contracts: contracts,
      chainId: chainId as any
    });

    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/marketdata`;
    const res = await HttpGet<ApiMarketDataResponse>(apiUrl);

    set({
      creditHolderCount: res.creditHolderCount as number,
      creditMultiplier: protocolData[0].result as bigint,
      creditSupply: protocolData[1].result as bigint,
      totalWeight: protocolData[2].result as bigint,
      offboardQuorum: protocolData[3].result as bigint,
      offboardDurationBlock: protocolData[4].result as bigint,
      deprecatedGauges: protocolData[5].result as string[],
      delegateLockupPeriod: protocolData[6].result as bigint,
      psmPegTokenBalance: protocolData[7].result as bigint,
      minimumCreditStake: protocolData[8].result as bigint
    });
  }
});
