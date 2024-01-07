import { Address, keccak256, slice } from "viem"

export const getFunctionSignature = (string: `0x${string}`) => {
    return slice(keccak256(string), 0, 4)
}
