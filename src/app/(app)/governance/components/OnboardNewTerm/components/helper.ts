import { Address } from 'viem';
import {
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  keccak256,
  parseAbiParameters,
  stringToHex
} from 'viem';
import { getFunctionSignature } from 'utils/crypto';
import { OnboardTimelockABI } from 'lib/contracts';
import { ContractsList } from 'store/slices/contracts-list';

export const checkVetoVoteValidity = (contractsList: ContractsList, targets: Address[], datas: string[]): boolean => {
  //check if there are 3 calls scheduled

  if (targets.length != 4) {
    return false;
  }

  //check the targets
  if (targets[0].toLowerCase() != contractsList.guildAddress.toLowerCase()) {
    return false;
  }
  if (
    targets[1].toLowerCase() != contractsList.coreAddress.toLowerCase() &&
    targets[2].toLowerCase() != contractsList.coreAddress.toLowerCase()
  ) {
    return false;
  }

  //check the datas
  if (!datas[0].startsWith(getFunctionSignature('addGauge(uint256,address)'))) {
    return false;
  }

  if (
    !datas[1].startsWith(getFunctionSignature('grantRole(bytes32,address)')) &&
    !datas[2].startsWith(getFunctionSignature('grantRole(bytes32,address)'))
  ) {
    return false;
  }

  return true;
};

export const getProposalIdFromActionId = (contractsList: ContractsList, actionId: string) => {
  return BigInt(
    keccak256(
      encodeAbiParameters(parseAbiParameters('address[], uint256[], bytes[], bytes32'), [
        [contractsList.onboardTimelockAddress as Address],
        [BigInt(0)],
        [
          encodeFunctionData({
            abi: OnboardTimelockABI,
            functionName: 'cancel',
            args: [actionId]
          })
        ],
        keccak256(stringToHex('Veto proposal for ') + encodePacked(['bytes32'], [actionId as Address]).slice(2))
      ])
    )
  );
};
