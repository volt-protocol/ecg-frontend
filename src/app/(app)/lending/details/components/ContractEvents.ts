import { getPublicClient } from "@wagmi/core"
import { Address, readContract } from "@wagmi/core"
import { TermABI } from "lib/contracts"
import { LoansObj, loanObj, loanObjCall } from "types/lending"

async function getLoansCall(address: Address) {
  const loans: loanObj[] = []
  const currentBlock = await getPublicClient().getBlockNumber()

  const openLogs = await getPublicClient().getLogs({
    address: address,
    event: {
      type: "event",
      name: "LoanOpen",
      inputs: [
        { type: "uint256", indexed: true, name: "when" },
        { type: "bytes32", indexed: true, name: "loanId" },
        { type: "address", indexed: true, name: "borrower" },
        { type: "uint256", indexed: false, name: "collateralAmount" },
        { type: "uint256", indexed: false, name: "borrowAmount" },
      ],
    },
    fromBlock: BigInt(20),
    toBlock: currentBlock,
  })

  const closeLogs = await getPublicClient().getLogs({
    address: address,
    event: {
      type: "event",
      name: "LoanClose",
      inputs: [
        { type: "uint256", indexed: true, name: "when" },
        { type: "bytes32", indexed: true, name: "loanId" },
        { type: "uint8", indexed: true, name: "closeType" },
        { type: "uint256", indexed: false, name: "debtRepaid" },
      ],
    },
    fromBlock: BigInt(20),
    toBlock: currentBlock,
  })
  // Création d'un ensemble des loanId de closeLogs

  const closeLoanIds = new Set(closeLogs.map((log) => log.args.loanId))

  // Filtre des openLogs pour ne garder que ceux dont le loanId n'est pas dans closeLoanIds
  const uniqueOpenLogs = openLogs.filter(
    (log) => !closeLoanIds.has(log.args.loanId)
  )

  for (const log of uniqueOpenLogs) {
    const loan = await readContract({
      address: address,
      abi: TermABI,
      functionName: "getLoan",
      args: [log.args.loanId],
    })

    loans.push({
      ...(loan as loanObjCall),
      id: log.args.loanId as Address,
      termAddress: log.address as Address,
    })
  }
  return loans
}

export { getLoansCall }
