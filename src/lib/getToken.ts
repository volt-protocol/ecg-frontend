import { multicall } from '@wagmi/core';
import { wagmiConfig } from 'contexts/Web3Provider';
import { erc20Abi, Address } from 'viem';
import { HttpGet } from 'utils/HttpHelper';

const getToken = async (tokenAddress: string, chainId: number): Promise<any> => {
  const chainName = {}[chainId] || 'arbitrum';
  const url = `https://coins.llama.fi/prices/current/${chainName}:${tokenAddress}?searchWidth=24h`;
  const priceData = await HttpGet<any>(url);
  let price = priceData.coins[`${chainName}:${tokenAddress}`]?.price || 0;
  let data: any = await multicall(wagmiConfig, {
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
  data.price = price;
  return data;
};

export default getToken;
