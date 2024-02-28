import { StateCreator } from "zustand"
import axios, { AxiosResponse } from "axios"
import { chainsConfig } from "config"
import { Address } from "viem"

// This is the type of the app contracts list
export type ContractsList = {
  uniswapRouterAddress: Address
  coreAddress: Address
  gatewayAddress: Address
  daoGovernorGuildAddress: Address
  daoVetoCreditAddress: Address
  daoVetoGuildAddress: Address
  daoTimelockAddress: Address
  onboardGovernorGuildAddress: Address
  onboardVetoCreditAddress: Address
  onboardVetoGuildAddress: Address
  onboardTimelockAddress: Address
  lendingTermOffboardingAddress: Address
  lendingTermV1ImplementationAddress: Address
  lendingTermFactoryAddress: Address
  guildAddress: Address
  creditAddress: Address
  usdcAddress: Address
  profitManagerAddress: Address
  psmUsdcAddress: Address
  surplusGuildMinterAddress: Address
  auctionHouseAddress: Address
}

export interface ContractsListSlice {
  contractsList: ContractsList
  fetchContractsList: (chainId: number) => void
}

export const createContractsListSlice: StateCreator<ContractsListSlice> = (set, get) => ({
  contractsList: null,
  fetchContractsList: async (chainId: number) => {
    try {
      if(!chainsConfig.find((chain) => chain.id == chainId)) {
        console.log("Chain not found")
        return 
      }

      console.log('feching contracts from', chainsConfig.find((chain) => chain.id == chainId).jsonUrl)

      const res: AxiosResponse<any, any> = await axios.get(
        chainsConfig.find((chain) => chain.id == chainId).jsonUrl
      )

      //map the json response to the contractsList
      const list = {
        uniswapRouterAddress: res.data.find(
          (contract) => contract.name === "UNISWAP_ROUTER"
        ).addr,
        coreAddress: res.data.find((contract) => contract.name === "CORE").addr,
        gatewayAddress: res.data.find((contract) => contract.name === "GATEWAY").addr,
        daoGovernorGuildAddress: res.data.find(
          (contract) => contract.name === "DAO_GOVERNOR_GUILD"
        ).addr,
        daoVetoCreditAddress: res.data.find(
          (contract) => contract.name === "DAO_VETO_CREDIT"
        ).addr,
        daoVetoGuildAddress: res.data.find(
          (contract) => contract.name === "DAO_VETO_GUILD"
        ).addr,
        daoTimelockAddress: res.data.find((contract) => contract.name === "DAO_TIMELOCK")
          .addr,
        onboardGovernorGuildAddress: res.data.find(
          (contract) => contract.name === "ONBOARD_GOVERNOR_GUILD"
        ).addr,
        onboardVetoCreditAddress: res.data.find(
          (contract) => contract.name === "ONBOARD_VETO_CREDIT"
        ).addr,
        onboardVetoGuildAddress: res.data.find(
          (contract) => contract.name === "ONBOARD_VETO_GUILD"
        ).addr,
        onboardTimelockAddress: res.data.find(
          (contract) => contract.name === "ONBOARD_TIMELOCK"
        ).addr,
        lendingTermOffboardingAddress: res.data.find(
          (contract) => contract.name === "OFFBOARD_GOVERNOR_GUILD"
        ).addr,
        lendingTermV1ImplementationAddress: res.data.find(
          (contract) => contract.name === "LENDING_TERM_V1"
        ).addr,
        lendingTermFactoryAddress: res.data.find(
          (contract) => contract.name === "LENDING_TERM_FACTORY"
        ).addr,
        guildAddress: res.data.find((contract) => contract.name === "ERC20_GUILD").addr,
        creditAddress: res.data.find((contract) => contract.name === "ERC20_GUSDC").addr,
        usdcAddress: res.data.find((contract) => contract.name === "ERC20_USDC").addr,
        profitManagerAddress: res.data.find(
          (contract) => contract.name === "PROFIT_MANAGER"
        ).addr,
        psmUsdcAddress: res.data.find((contract) => contract.name === "PSM_USDC").addr,
        surplusGuildMinterAddress: res.data.find(
          (contract) => contract.name === "SURPLUS_GUILD_MINTER"
        ).addr,
        auctionHouseAddress: res.data.find(
          (contract) => contract.name === "AUCTION_HOUSE"
        ).addr,
      }

      set({ contractsList: list })
    } catch (error) {
      console.error("Error fetching contracts list", error)
    }
  },
})
