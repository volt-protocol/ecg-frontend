import moment from 'moment';
import { LendingTerms } from 'types/lending';
import { BLOCK_LENGTH_MILLISECONDS } from 'utils/constants';
import { Address } from 'viem';

export const isActivePoll = (snapshotBlock: number, currentBlock: number, pollDurationBlock: number): boolean => {
  const isActive = snapshotBlock + pollDurationBlock > currentBlock;
  return isActive;
};
