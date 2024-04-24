import { multicall } from '@wagmi/core';
import { wagmiConfig } from 'contexts/Web3Provider';
import { erc20Abi, Address } from 'viem';

const getToken = async (tokenAddress: string, chainId: number): Promise<any> => {
  return await multicall(wagmiConfig, {
    chainId: chainId as any,
    contracts: [
      {
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'decimals'
      },
      {
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'symbol'
      },
      {
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'name'
      }
    ]
  });
};

export default getToken;
