import { type } from "os"
import { Address, isAddress } from "viem"

export const getTitleDisabled = (type: "Mint" | "Redeem", value: number, max: number) => {
  if (!value || value <= 0) {
    return type == "Mint" ? "Enter USDC amount" : "Enter gUSDC amount"
  }
  if (value > max) {
    return type == "Mint" ? "Insufficient USDC balance" : "Insufficient gUSDC balance"
  }
}
