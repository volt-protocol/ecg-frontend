import { Abi } from "viem"
import { Address } from "wagmi"
import GuildABI from "./abi/GuildABI.json"
import CreditABI from "./abi/CreditABI.json"
import OffboardGovernorGuildABI from "./abi/OffboardGovernorGuildABI.json"
import ProfitManagerABI from "./abi/ProfitManagerABI.json"
import TermABI from "./abi/TermABI.json"
import PsmUsdcABI from "./abi/PsmUsdcABI.json"
import UsdcABI from "./abi/UsdcABI.json"
import SurplusGuildMinterABI from "./abi/SurplusGuildMinterABI.json"
import DaoGovernorGuildABI from "./abi/DaoGovernorGuildABI.json"
import DaoVetoCreditABI from "./abi/DaoVetoCreditABI.json"
import DaoVetoGuildABI from "./abi/DaoVetoGuildABI.json"
import DaoTimelockABI from "./abi/DaoTimelockABI.json"
import OnboardGovernorGuildABI from "./abi/OnboardGovernorGuildABI.json"
import OnboardVetoCreditABI from "./abi/OnboardVetoCreditABI.json"
import OnboardVetoGuildABI from "./abi/OnboardVetoGuildABI.json"
import OnboardTimelockABI from "./abi/OnboardTimelockABI.json"

export { default as CreditABI } from "./abi/CreditABI.json"
export { default as GuildABI } from "./abi/GuildABI.json"
export { default as ProfitManagerABI } from "./abi/ProfitManagerABI.json"
export { default as PsmUsdcABI } from "./abi/PsmUsdcABI.json"
export { default as TermABI } from "./abi/TermABI.json"
export { default as UsdcABI } from "./abi/UsdcABI.json"
export { default as SurplusGuildMinterABI } from "./abi/SurplusGuildMinterABI.json"
export { default as OffboardGovernorGuildABI } from "./abi/OffboardGovernorGuildABI.json"
export { default as DaoGovernorGuildABI } from "./abi/DaoGovernorGuildABI.json"
export { default as DaoVetoCreditABI } from "./abi/DaoVetoCreditABI.json"
export { default as DaoVetoGuildABI } from "./abi/DaoVetoGuildABI.json"
export { default as DaoTimelockABI } from "./abi/DaoTimelockABI.json"
export { default as OnboardGovernorGuildABI } from "./abi/OnboardGovernorGuildABI.json"
export { default as OnboardVetoCreditABI } from "./abi/OnboardVetoCreditABI.json"
export { default as OnboardVetoGuildABI } from "./abi/OnboardVetoGuildABI.json"
export { default as OnboardTimelockABI } from "./abi/OnboardTimelockABI.json"


/* DAO */
export const daoGovernorGuildContract = {
  address: process.env.NEXT_PUBLIC_DAO_GOVERNOR_GUILD_ADDRESS as Address,
  abi: DaoGovernorGuildABI as Abi,
}

export const daoVetoCreditContract = {
  address: process.env.NEXT_PUBLIC_DAO_VETO_CREDIT_ADDRESS as Address,
  abi: DaoVetoCreditABI as Abi,
}

export const daoVetoGuildContract = {
  address: process.env.NEXT_PUBLIC_DAO_VETO_GUILD_ADDRESS as Address,
  abi: DaoVetoGuildABI as Abi,
}

export const daoTimelockContract = {
  address: process.env.NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS as Address,
  abi: DaoTimelockABI as Abi,
}

/*Onboard Contracts */
export const onboardGovernorGuildContract = {
  address: process.env.NEXT_PUBLIC_ONBOARD_GOVERNOR_GUILD_ADDRESS as Address,
  abi: OnboardGovernorGuildABI as Abi,
}

export const onboardVetoCreditContract = {
  address: process.env.NEXT_PUBLIC_ONBOARD_VETO_CREDIT_ADDRESS as Address,
  abi: OnboardVetoCreditABI as Abi,
}

export const onboardVetoGuildContract = {
  address: process.env.NEXT_PUBLIC_ONBOARD_VETO_GUILD_ADDRESS as Address,
  abi: OnboardVetoGuildABI as Abi,
}

export const onboardTimelockContract = {
  address: process.env.NEXT_PUBLIC_ONBOARD_TIMELOCK_ADDRESS as Address,
  abi: OnboardTimelockABI as Abi,
}

export const usdcContract = {
  address: process.env.NEXT_PUBLIC_ERC20_USDC_ADDRESS as Address,
  abi: UsdcABI as Abi,
}

export const creditContract = {
  address: process.env.NEXT_PUBLIC_ERC20_CREDIT_ADDRESS as Address,
  abi: CreditABI as Abi,
}

export const guildContract = {
  address: process.env.NEXT_PUBLIC_ERC20_GUILD_ADDRESS as Address,
  abi: GuildABI as Abi,
}

export const lendingTermOffboardingContract = {
  address: process.env.NEXT_PUBLIC_OFFBOARD_GOVERNOR_GUILD_ADDRESS as Address,
  abi: OffboardGovernorGuildABI as Abi,
}

export const profitManagerContract = {
  address: process.env.NEXT_PUBLIC_PROFIT_MANAGER_ADDRESS as Address,
  abi: ProfitManagerABI as Abi
}

export const psmUsdcContract = {
  address: process.env.NEXT_PUBLIC_PSM_USDC_ADDRESS as Address,
  abi: PsmUsdcABI as Abi
}

export const surplusGuildMinterContract = {
  address: process.env.NEXT_PUBLIC_SURPLUS_GUILD_MINTER_ADDRESS as Address,
  abi: SurplusGuildMinterABI as Abi
}

export const lendingTermV1Implementation = {
  address: process.env.NEXT_PUBLIC_LENDING_TERM_V1_ADDRESS as Address,
  abi: TermABI as Abi,
}

export const termContract = (address: Address) => {
  return {
    address: address,
    abi: TermABI as Abi,
  }
}