// Libraries
import { StateCreator } from 'zustand';
import { wagmiConfig } from 'contexts/Web3Provider';
import { ContractsList } from './contracts-list';
import { readContracts } from '@wagmi/core';
import { CreditABI, GuildABI, ProfitManagerABI } from 'lib/contracts';
import { Abi } from 'viem';

export interface ProtocolDataSlice {
  creditMultiplier: bigint;
  creditSupply: bigint;
  totalWeight: bigint;
  fetchProtocolData: (marketId: number, chainId: number, contractsList: ContractsList) => Promise<void>;
}

export const createProtocolDataSlice: StateCreator<ProtocolDataSlice> = (set, get) => ({
  creditMultiplier: BigInt(0),
  creditSupply: BigInt(0),
  totalWeight: BigInt(0),
  fetchProtocolData: async (marketId: number, chainId: number, contractsList: ContractsList) => {
    const profitManagerAddress = contractsList.marketContracts[marketId].profitManagerAddress;
    const guildAddress = contractsList.guildAddress;
    const creditAddress = contractsList.marketContracts[marketId].creditAddress;

    const contracts = [
      {
        address: profitManagerAddress,
        abi: ProfitManagerABI as Abi,
        functionName: 'creditMultiplier',
        chainId: chainId as any
      },
      {
        address: creditAddress,
        abi: CreditABI,
        functionName: 'totalSupply',
        chainId: chainId as any
      },
      {
        address: guildAddress,
        abi: GuildABI,
        functionName: 'totalTypeWeight',
        args: [marketId],
        chainId: chainId as any
      }
    ];

    // @ts-ignore
    const protocolData = await readContracts(wagmiConfig, {
      contracts: contracts
    });

    set({
      creditMultiplier: protocolData[0].result as bigint,
      creditSupply: protocolData[1].result as bigint,
      totalWeight: protocolData[2].result as bigint
    });
  }
});
