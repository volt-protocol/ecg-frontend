import { Abi } from "viem"
import GuildABI from "./abi/GuildABI.json"
import LendingTermOffboardingABI from "./abi/LendingTermOffboardingABI.json"
import LendingTermOnboardingABI from "./abi/LendingTermOnboardingABI.json"
import TermABI from "./abi/TermABI.json"
import { Address } from "wagmi"

export { default as CreditABI } from "./abi/CreditABI.json"
export { default as GuildABI } from "./abi/GuildABI.json"
export { default as ProfitManagerABI } from "./abi/ProfitManagerABI.json"
export { default as PsmUsdcABI } from "./abi/PsmUsdcABI.json"
export { default as SurplusGuildMinterABI } from "./abi/SurplusGuildMinterABI.json"
export { default as TermABI } from "./abi/TermABI.json"
export { default as UsdcABI } from "./abi/UsdcABI.json"
export { default as LendingTermOffboardingABI } from "./abi/LendingTermOffboardingABI.json"

export const guildContract = {
  address: process.env.NEXT_PUBLIC_GUILD_ADDRESS as Address,
  abi: GuildABI as Abi,
}

export const lendingTermOffboardingContract = {
  address: process.env.NEXT_PUBLIC_LENDING_TERM_OFFBOARDING_ADDRESS as Address,
  abi: LendingTermOffboardingABI as Abi,
}

export const lendingTermOnboardingContract = {
  address: process.env.NEXT_PUBLIC_LENDING_TERM_ONBOARDING_ADDRESS as Address,
  abi: LendingTermOnboardingABI as Abi,
}

export const termContract = (address: Address) => {
  return {
    address: address,
    abi: TermABI as Abi,
  }
}
// export const creditContract = {
//   address: process.env.NEXT_PUBLIC_CREDIT_ADDRESS as Address,
//   abi: CreditABI
// }

// export const profitManagerContract = {
//   address: process.env.NEXT_PUBLIC_PROFIT_MANAGER_ADDRESS as Address,
//   abi: ProfitManagerABI
// }

// export const psmUsdcContract = {
//   address: process.env.NEXT_PUBLIC_PSM_USDC_ADDRESS as Address,
//   abi: PsmUsdcABI
// }

// export const surplusGuildMinterContract = {
//   address: process.env.NEXT_PUBLIC_SURPLUS_GUILD_MINTER_ADDRESS as Address,
//   abi: SurplusGuildMinterABI
// }
