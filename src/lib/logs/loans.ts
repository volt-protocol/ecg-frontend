import { getPublicClient, getWalletClient } from "@wagmi/core"
import { Address, readContract } from "@wagmi/core"
import { TermABI } from "lib/contracts"
import { LoansObj, loanObj, loanObjCall } from "types/lending"
import { FROM_BLOCK } from "utils/constants"

//get all open loans logs from a lending term contract
export async function getOpenLoanLogs(address: Address, borrower?: Address) {
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
    args: {
      borrower: borrower,
    },
    fromBlock: BigInt(FROM_BLOCK),
    toBlock: currentBlock,
  })

  return openLogs.map((log) => {
    return {
      ...log.args,
      block: log.blockNumber,
      userAddress: log.args.borrower,
      category: 'loan',
      type: 'opening',
      txHash: log.transactionHash,
      txHashOpen: log.transactionHash,
    }
  })
}

//get all closed loans  logs (fully repaid) from a lending term contract
export async function getCloseLoanLogs(address: Address) {
  const currentBlock = await getPublicClient().getBlockNumber()

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
    fromBlock: BigInt(FROM_BLOCK),
    toBlock: currentBlock,
  })
  
  return closeLogs.map((log) => {
    return {
      ...log.args,
      block: log.blockNumber,
      userAddress: log.address,
      category: 'loan',
      type: 'closing',
      txHash: log.transactionHash,
      txHashClose: log.transactionHash,
    }
  })
}

//Get all active loans (open and not fully repaid) from a lending term contract
export async function getActiveLoanLogs(address: Address, borrower?: Address) {
  const openLogs = await getOpenLoanLogs(address, borrower)

  const closeLogs = await getCloseLoanLogs(address)

  const closeLoanIds = new Set(closeLogs.map((log) => log.loanId))

  // Filtre des openLogs pour ne garder que ceux dont le loanId n'est pas dans closeLoanIds
  const activeLoans = openLogs.filter((log) => !closeLoanIds.has(log.loanId))

  return activeLoans
}

//get all close loans (fully repaid) from a lending term contract for a specific borrower
export async function getCloseLoanLogsbyUser(address: Address, borrower: Address) {
  const openLogs = await getOpenLoanLogs(address, borrower)

  const closeLogs = await getCloseLoanLogs(address)

  const closeLoanIds = new Set(closeLogs.map((log) => log.loanId))

  // Filtre des openLogs pour ne garder que ceux dont le loanId n'est pas dans closeLoanIds
  const closeLoansbyUser = openLogs.filter((log) => closeLoanIds.has(log.loanId))

  return closeLoansbyUser.map((log) => {
    return {
      ...log,
      txHashClose: closeLogs.find((closeLog) => closeLog.loanId === log.loanId).txHashClose
    }
  })
}

export async function getActiveLoanDetails(address: Address) {
  const loans: loanObj[] = []

  // Filtre des openLogs pour ne garder que ceux dont le loanId n'est pas dans closeLoanIds
  const uniqueOpenLogs = await getActiveLoanLogs(address)

  for (const log of uniqueOpenLogs) {
    const loan = await readContract({
      address: address,
      abi: TermABI,
      functionName: "getLoan",
      args: [log.loanId],
    })

    loans.push({
      ...(loan as loanObjCall),
      id: log.loanId as Address,
      termAddress: address as Address,
    })
  }
  return loans
}
