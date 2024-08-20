import { StateCreator } from 'zustand';
import { chainsConfig } from 'config';
import { Address } from 'viem';
import { HttpGet } from 'utils/HttpHelper';

// This is the type of the app contracts list
export type ContractsList = {
  uniswapRouterAddress: Address;
  coreAddress: Address;
  gatewayAddress: Address;
  daoGovernorGuildAddress: Address;
  daoVetoGuildAddress: Address;
  daoTimelockAddress: Address;
  onboardGovernorGuildAddress: Address;
  termParamGovernorGuildAddress: Address;
  onboardVetoGuildAddress: Address;
  onboardTimelockAddress: Address;
  lendingTermOffboardingAddress: Address;
  lendingTermV2ImplementationAddress: Address;
  lendingTermFactoryAddress: Address;
  guildAddress: Address;
  auctionHouseAddress: Address;
  marketContracts: { [marketId: number]: MarketContractList };

  // TODO, USE THEM
  auctionHouses: { auctionHouseName: string; auctionHouseAddress: Address }[];
  lendingTermImplementationAddresses: Address[];
};

export type MarketContractList = {
  creditAddress: Address;
  psmAddress: Address;
  profitManagerAddress: Address;
  pegTokenAddress: Address;
  surplusGuildMinterAddress: Address;
  daoVetoCreditAddress: Address;
  onboardVetoCreditAddress: Address;
  lendingTerms: Address[];
};

export interface ContractsListSlice {
  contractsList: ContractsList;
  fetchContractsList: (chainId: number) => Promise<ContractsList>;
}

interface ContractListJsonItem {
  addr: Address;
  name: string;
}

export const createContractsListSlice: StateCreator<ContractsListSlice> = (set, get) => ({
  contractsList: null,
  fetchContractsList: async (chainId: number): Promise<ContractsList> => {
    try {
      if (!chainsConfig.find((chain) => chain.id == chainId)) {
        console.log('Chain not found');
        return;
      }

      const jsonUrl = chainsConfig.find((chain) => chain.id == chainId).jsonUrl;
      const contractJsonFile = await HttpGet<ContractListJsonItem[]>(jsonUrl);

      //map the json response to the contractsList
      const list: ContractsList = {
        uniswapRouterAddress: contractJsonFile.find((contract) => contract.name === 'UNISWAP_ROUTER').addr,
        coreAddress: contractJsonFile.find((contract) => contract.name === 'CORE').addr,
        gatewayAddress: contractJsonFile.find((contract) => contract.name === 'GATEWAY').addr,
        daoGovernorGuildAddress: contractJsonFile.find((contract) => contract.name === 'DAO_GOVERNOR_GUILD').addr,
        daoVetoGuildAddress: contractJsonFile.find((contract) => contract.name === 'DAO_VETO_GUILD').addr,
        daoTimelockAddress: contractJsonFile.find((contract) => contract.name === 'DAO_TIMELOCK').addr,
        onboardGovernorGuildAddress: contractJsonFile.find((contract) => contract.name === 'ONBOARD_GOVERNOR_GUILD')
          .addr,
        onboardVetoGuildAddress: contractJsonFile.find((contract) => contract.name === 'ONBOARD_VETO_GUILD').addr,
        onboardTimelockAddress: contractJsonFile.find((contract) => contract.name === 'ONBOARD_TIMELOCK').addr,
        termParamGovernorGuildAddress: contractJsonFile.find(
          (contract) => contract.name === 'TERM_PARAM_GOVERNOR_GUILD'
        ).addr,
        lendingTermOffboardingAddress: contractJsonFile.find((contract) => contract.name === 'OFFBOARD_GOVERNOR_GUILD')
          .addr,
        lendingTermV2ImplementationAddress: contractJsonFile.find((contract) => contract.name === 'LENDING_TERM_V2')
          .addr,
        lendingTermFactoryAddress: contractJsonFile.find((contract) => contract.name === 'LENDING_TERM_FACTORY').addr,
        guildAddress: contractJsonFile.find((contract) => contract.name === 'ERC20_GUILD').addr,
        auctionHouseAddress: contractJsonFile.find((contract) => contract.name === 'AUCTION_HOUSE_12H').addr,
        auctionHouses: contractJsonFile
          .filter((contract) => contract.name.startsWith('AUCTION_HOUSE_'))
          .map((_) => {
            return {
              auctionHouseName: _.name,
              auctionHouseAddress: _.addr
            };
          }),
        lendingTermImplementationAddresses: contractJsonFile
          .filter((contract) => contract.name.startsWith('LENDING_TERM_'))
          .map((_) => _.addr),
        marketContracts: {}
      };

      const creditRegex = /^[0-9]+_CREDIT$/gm;
      // extract all markets id from the "xxxxxxxxxxx_CREDIT" contracts
      // example 999999999_CREDIT returns 999999999
      const marketIds: number[] = contractJsonFile
        .filter((contract) => contract.name.match(creditRegex))
        .map((_) => Number(_.name.replace('_CREDIT', '')));

      for (const marketId of marketIds) {
        list.marketContracts[marketId] = {
          creditAddress: contractJsonFile.find((contract) => contract.name === `${marketId}_CREDIT`).addr,
          psmAddress: contractJsonFile.find((contract) => contract.name === `${marketId}_PSM`).addr,
          pegTokenAddress: contractJsonFile.find((contract) => contract.name === `${marketId}_PEG_TOKEN`).addr,
          daoVetoCreditAddress: contractJsonFile.find((contract) => contract.name === `${marketId}_DAO_VETO_CREDIT`)
            .addr,
          onboardVetoCreditAddress: contractJsonFile.find(
            (contract) => contract.name === `${marketId}_ONBOARD_VETO_CREDIT`
          ).addr,
          profitManagerAddress: contractJsonFile.find((contract) => contract.name === `${marketId}_PROFIT_MANAGER`)
            .addr,
          surplusGuildMinterAddress: contractJsonFile.find((contract) => contract.name === `${marketId}_SGM`).addr,
          lendingTerms: contractJsonFile
            .filter((contract) => contract.name.startsWith(`${marketId}_TERM_`))
            .map((_) => _.addr)
        };
      }

      set({ contractsList: list });

      return list;
    } catch (error) {
      console.error('Error fetching contracts list', error);
    }
  }
});
