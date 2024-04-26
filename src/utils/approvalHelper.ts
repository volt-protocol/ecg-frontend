import { erc20ABI } from 'lib/contracts';
import { Address } from 'viem';
import { readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core';
import { sleep } from './utils';

/// help function to run the approval steps flow
/// first checks is there is already a sufficient allowance
/// then approve if needed
export async function approvalStepsFlow(
  userAddress: string,
  spenderAddress: string,
  erc20Address: string,
  amountToApprove: bigint,
  chainId: number,
  updateStepStatus: (stepName: string, status: string, description?: any[]) => void,
  checkApprovalStepName: string,
  approvalStepName: string,
  wagmiConfig: any
): Promise<boolean> {
  updateStepStatus(checkApprovalStepName, 'In Progress');
  const allowance = (await readContract(wagmiConfig, {
    chainId: chainId as any,
    address: erc20Address as Address,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [userAddress, spenderAddress]
  })) as bigint;

  updateStepStatus(checkApprovalStepName, 'Success');

  if (allowance < amountToApprove) {
    updateStepStatus(approvalStepName, 'In Progress');
    const hash = await writeContract(wagmiConfig, {
      address: erc20Address as Address,
      abi: erc20ABI,
      functionName: 'approve',
      args: [spenderAddress, amountToApprove]
    });
    const checkApprove = await waitForTransactionReceipt(wagmiConfig, {
      hash: hash
    });

    if (checkApprove.status != 'success') {
      return false;
    }
  }

  await sleep(5000);

  updateStepStatus(approvalStepName, 'Success');
  return true;
}
