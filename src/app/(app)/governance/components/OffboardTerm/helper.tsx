import moment from 'moment';
import { LendingTerms } from 'types/lending';
import { BLOCK_LENGTH_MILLISECONDS } from 'utils/constants';
import { Address } from 'viem';

export const isActivePoll = (timestamp: number, nbBlock: number): boolean => {
  //poll is active if current block is less than expiry block (timestamp + 12060 * nbBlock)
  if (
    moment
      .unix(timestamp)
      .add(BLOCK_LENGTH_MILLISECONDS * Number(nbBlock), 'milliseconds')
      .diff(moment()) > 0
  ) {
    return true;
  }
  return false;
};
