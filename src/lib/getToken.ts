import { readContracts } from '@wagmi/core'
import { wagmiConfig } from 'contexts/Web3Provider'
import { erc20Abi, Address } from 'viem' 

const getToken = async (tokenAddress: string): Promise<any> => {
  return await readContracts(wagmiConfig, {
    contracts: [
      {
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: "decimals",
      },
      {
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: "symbol",
      },
    ],
  })
}

export default getToken