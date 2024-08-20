import { Abi, Address } from 'viem';
import TermABI from './abi/TermABI.json';

export { default as CreditABI } from './abi/CreditABI.json';
export { default as GuildABI } from './abi/GuildABI.json';
export { default as ProfitManagerABI } from './abi/ProfitManagerABI.json';
export { default as PsmUsdcABI } from './abi/PsmUsdcABI.json';
export { default as PsmABI } from './abi/PsmABI.json';
export { default as TermABI } from './abi/TermABI.json';
export { default as UsdcABI } from './abi/UsdcABI.json';
export { default as erc20ABI } from './abi/ERC20ABI.json';
export { default as SurplusGuildMinterABI } from './abi/SurplusGuildMinterABI.json';
export { default as OffboardGovernorGuildABI } from './abi/OffboardGovernorGuildABI.json';
export { default as DaoGovernorGuildABI } from './abi/DaoGovernorGuildABI.json';
export { default as DaoVetoCreditABI } from './abi/DaoVetoCreditABI.json';
export { default as DaoVetoGuildABI } from './abi/DaoVetoGuildABI.json';
export { default as DaoTimelockABI } from './abi/DaoTimelockABI.json';
export { default as OnboardGovernorGuildABI } from './abi/OnboardGovernorGuildABI.json';
export { default as TermParamGovernorABI } from './abi/TermParamGovernorABI.json';
export { default as OnboardVetoCreditABI } from './abi/OnboardVetoCreditABI.json';
export { default as OnboardVetoGuildABI } from './abi/OnboardVetoGuildABI.json';
export { default as OnboardTimelockABI } from './abi/OnboardTimelockABI.json';
export { default as AuctionHouseABI } from './abi/AuctionHouseABI.json';
export { default as ERC20PermitABI } from './abi/ERC20PermitABI.json';
export { default as GatewayABI } from './abi/GatewayABI.json';
export { default as UniswapRouterABI } from './abi/UniswapRouterABI.json';
export { default as LendingTermFactoryABI } from './abi/LendingTermFactoryABI.json';
export { default as WethABI } from './abi/WethABI.json';

export const termContract = (address: Address) => {
  return {
    address: address,
    abi: TermABI as Abi
  };
};
