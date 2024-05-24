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
  creditTargetSupply: bigint;
  totalIssuance: bigint;
  totalWeight: bigint;
  offboardQuorum: bigint;
  offboardDurationBlock: bigint;
  deprecatedGauges: string[];
  delegateLockupPeriod: bigint;
  psmPegTokenBalance: bigint;
  minimumCreditStake: bigint;
  profitSharingConfig: any;
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
  creditTargetSupply: BigInt(0),
  totalIssuance: BigInt(0),
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
        address: creditAddress,
        abi: CreditABI as Abi,
        functionName: 'targetTotalSupply'
      },
      {
        address: contractsList.marketContracts[marketId].profitManagerAddress,
        abi: ProfitManagerABI as Abi,
        functionName: 'totalIssuance'
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
      },
      {
        address: contractsList.marketContracts[marketId].profitManagerAddress,
        abi: ProfitManagerABI as Abi,
        functionName: 'getProfitSharingConfig'
      }
    ];

    // @ts-ignore
    const protocolData = await multicall(wagmiConfig, {
      contracts: contracts,
      chainId: chainId as any
    });

    const apiUrl = getApiBaseUrl(chainId) + `/markets/${marketId}/marketdata`;
    const res = await HttpGet<ApiMarketDataResponse>(apiUrl);

    let i = 0;
    set({
      creditHolderCount: res.creditHolderCount as number,
      creditMultiplier: protocolData[i++].result as bigint,
      creditSupply: protocolData[i++].result as bigint,
      creditTargetSupply: protocolData[i++].result as bigint,
      totalIssuance: protocolData[i++].result as bigint,
      totalWeight: protocolData[i++].result as bigint,
      offboardQuorum: protocolData[i++].result as bigint,
      offboardDurationBlock: protocolData[i++].result as bigint,
      deprecatedGauges: protocolData[i++].result as string[],
      delegateLockupPeriod: protocolData[i++].result as bigint,
      psmPegTokenBalance: protocolData[i++].result as bigint,
      minimumCreditStake: protocolData[i++].result as bigint,
      profitSharingConfig: protocolData[i++].result as any
    });
  }
});
