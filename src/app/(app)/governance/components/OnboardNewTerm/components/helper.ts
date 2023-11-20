import { Address, erc20ABI, readContracts } from "wagmi"

export const getToken = async (tokenAddress: string) => {
  return  await readContracts({
    contracts: [
      {
        address: tokenAddress as Address,
        abi: erc20ABI,
        functionName: "decimals",
      },
      {
        address: tokenAddress as Address,
        abi: erc20ABI,
        functionName: "symbol",
      },
    ],
  })
}
