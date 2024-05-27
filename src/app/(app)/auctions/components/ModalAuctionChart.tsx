'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AuctionChart } from './AuctionChart';
import { Auction, AuctionHouse } from '../../../../store/slices/auctions';
import { secondsToAppropriateUnit } from 'utils/date';
import { useAppStore, useUserPrefsStore } from 'store';
import { formatDecimal } from 'utils/numbers';
import moment from 'moment';
import { MdOpenInNew } from 'react-icons/md';
import { getExplorerBaseUrl } from 'config';

export default function ModalAuctionChart({
  setOpenAuction,
  openAuction,
  auctionHouses
}: {
  setOpenAuction: (arg: Auction | null) => void;
  openAuction: Auction | null;
  auctionHouses: AuctionHouse[];
}) {
  const { coinDetails, contractsList } = useAppStore();
  const { appMarketId, appChainId } = useUserPrefsStore();
  const auctionHouse = auctionHouses.find(
    (item) => item.address.toLowerCase() == openAuction?.auctionHouseAddress.toLowerCase()
  );

  if (!openAuction || !auctionHouse) {
    return null;
  }

  function setOpen(x: boolean) {
    if (x) {
      setOpenAuction(openAuction);
    } else {
      setOpenAuction(null);
    }
  }
  const collateralToken = coinDetails.find(
    (item) => item.address.toLowerCase() === openAuction.collateralTokenAddress.toLowerCase()
  );
  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);

  function bidTxLink() {
    if (openAuction.bidTxHash) {
      const creditMultiplier = Number(openAuction.callCreditMultiplier) / 1e18;
      const bidPrice =
        ((Number(openAuction.debtRecovered) / 1e18) * creditMultiplier) /
        (Number(openAuction.collateralSold) / 10 ** collateralToken.decimals);
      return (
        <a
          className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500"
          target="__blank"
          href={`${getExplorerBaseUrl(appChainId)}/tx/${openAuction.bidTxHash}`}
        >
          Bid: {moment(openAuction.endTime).format('YYYY-MM-DD HH:mm:ss')} @{' '}
          <strong>{formatDecimal(bidPrice, pegTokenDecimalsToDisplay)}</strong> {pegToken.symbol} /{' '}
          {collateralToken.symbol} <MdOpenInNew className="inline" />
        </a>
      );
    }
    return null;
  }

  return (
    <>
      <Transition.Root show={openAuction != null} as={Fragment}>
        <Dialog as="div" className="relative z-[40]" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-navy-900/90" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all dark:bg-navy-800 sm:my-8 sm:w-full sm:max-w-xl sm:p-6">
                  <h3 className="text-xl font-medium text-gray-800 dark:text-white">Auction Profile</h3>

                  {auctionHouse?.duration ? (
                    <div className="w-full">
                      <p className="mt-4 flex items-center justify-center gap-1 text-sm text-gray-700 dark:text-white">
                        Midpoint:{' '}
                        <span className="font-semibold">{secondsToAppropriateUnit(auctionHouse?.midPoint)}</span>
                      </p>
                      <p className="flex items-center justify-center gap-1 text-sm text-gray-700 dark:text-white">
                        Auction Duration:{' '}
                        <span className="font-semibold">{secondsToAppropriateUnit(auctionHouse?.duration)}</span>
                      </p>
                      <p className="flex items-center justify-center gap-1 text-sm text-gray-700 dark:text-white">
                        Auction Start:{' '}
                        <span className="font-semibold">
                          {moment(openAuction.startTime).format('YYYY-MM-DD HH:mm:ss')}
                        </span>
                      </p>
                      <p className="flex items-center justify-center gap-1 text-sm text-gray-700 dark:text-white">
                        Auction End:{' '}
                        <span className="font-semibold">
                          {moment(openAuction.startTime + auctionHouse?.duration * 1000).format('YYYY-MM-DD HH:mm:ss')}
                        </span>
                      </p>
                    </div>
                  ) : null}
                  <AuctionChart auctionHouse={auctionHouse} auction={openAuction} />
                  <div className="mt-3 text-center">{bidTxLink()}</div>
                  <div className="text-italic mt-3 text-center text-xs text-gray-400">
                    Market price: source DefiLlama, using ${formatDecimal(collateralToken.price, 2)} /{' '}
                    {collateralToken.symbol} and ${formatDecimal(pegToken.price, 2)} / {pegToken.symbol}.
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
