import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel
} from '@tanstack/react-table';
import CustomTable from 'components/table/CustomTable';
import moment from 'moment';
import { formatDecimal } from 'utils/numbers';
import { MdOpenInNew } from 'react-icons/md';
import clsx from 'clsx';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { useAppStore } from 'store';
import Image from 'next/image';
import ImageWithFallback from 'components/image/ImageWithFallback';
import { getPegTokenLogo, marketsConfig, getExplorerBaseUrl } from 'config';

export default function UserLoan({ userAddress, data }: { userAddress: Address; data: any }) {
  const { address } = useAccount();
  const { appMarketId, coinDetails, contractsList, lendingTerms, appChainId } = useAppStore();

  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId]?.pegTokenAddress.toLowerCase()
  );
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken?.price * 100)), 0);
  const pegTokenLogo = getPegTokenLogo(appChainId, appMarketId);

  /* Create Table */
  const columnHelper = createColumnHelper<>();

  const columns = [
    columnHelper.accessor('collateralAmount', {
      id: 'collateralAmount',
      header: 'Collateral',
      enableSorting: true,
      cell: (info) => {
        const lendingTerm = lendingTerms.find(
          (item) => item.address.toLowerCase() == info.row.original.termAddress.toLowerCase()
        );
        const collateralToken = coinDetails.find(
          (item) => item.address.toLowerCase() === lendingTerm?.collateral.address.toLowerCase()
        );
        const collateralTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(collateralToken?.price * 100)), 0);

        return (
          <>
            <ImageWithFallback
              src={lendingTerm?.collateral.logo}
              fallbackSrc="/img/crypto-logos/unk.png"
              width={20}
              height={20}
              alt=""
              className="inline align-text-bottom"
            />{' '}
            <span className="font-semibold">
              {formatDecimal(Number(info.getValue()), collateralTokenDecimalsToDisplay)}
            </span>{' '}
            <span>{collateralToken?.symbol}</span>
          </>
        );
      }
    }),
    columnHelper.accessor('borrowAmount', {
      id: 'borrowAmount',
      header: 'Debt',
      enableSorting: true,
      cell: (info: any) => {
        return (
          <>
            <Image src={pegTokenLogo} width={20} height={20} alt="" className="inline align-text-bottom" />{' '}
            <span className="font-semibold">
              {formatDecimal(
                (info.getValue() as number) * info.row.original.borrowCreditMultiplier,
                pegTokenDecimalsToDisplay
              )}
            </span>{' '}
            <span>{pegToken?.symbol}</span>
          </>
        );
      }
    }),
    columnHelper.accessor('interestRate', {
      id: 'interestRate',
      header: 'Interest Rate',
      enableSorting: true,
      cell: (info) => {
        return <span className="font-medium">{formatDecimal(Number((info.getValue() as number) * 100), 2)}%</span>;
      }
    }),
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: (info: any) => {
        return (
          <>
            {info.row.original.closeTime == 0 ? (
              <span className="inline-flex items-center gap-x-1.5 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                <svg className="h-1.5 w-1.5 fill-green-500" viewBox="0 0 6 6" aria-hidden="true">
                  <circle cx={3} cy={3} r={3} />
                </svg>
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-x-1.5 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                Closed
              </span>
            )}
          </>
        );
      }
    },
    columnHelper.accessor('borrowTime', {
      id: 'borrowTime',
      header: 'Open Date',
      enableSorting: true,
      cell: (info) => {
        return (
          <div className="flex min-w-[150px] cursor-pointer items-center justify-center text-sm text-brand-500 hover:text-brand-400">
            <a href={getExplorerBaseUrl(appChainId) + '/tx/' + info.row.original.txHashOpen} target="_blank">
              {moment.unix(Number(info.getValue())).format('YYYY-MM-DD HH:mm')}
            </a>
            <MdOpenInNew className="ml-1" />
          </div>
        );
      }
    }),
    columnHelper.accessor('closeTime', {
      id: 'closeTime',
      header: 'Close Date',
      enableSorting: true,
      cell: (info) => {
        return (
          <div
            className={clsx(
              info.getValue() != 0 && 'text-brand-500 hover:text-brand-400',
              'flex min-w-[150px] cursor-pointer items-center justify-center text-sm'
            )}
          >
            <a href={getExplorerBaseUrl(appChainId) + '/tx/' + info.row.original.txHashClose} target="_blank">
              {info.getValue() != 0 ? moment.unix(Number(info.getValue())).format('YYYY-MM-DD HH:mm') : '-'}
            </a>
            {info.getValue() != 0 && <MdOpenInNew className="ml-1" />}
          </div>
        );
      }
    }),
    {
      id: 'action',
      header: '',
      enableSorting: false,
      cell: (info: any) => {
        return (
          <>
            {!info.row.original.txHashClose && userAddress == address && (
              <Link href={`/lending/details?term=${info.row.original.termAddress}`}>
                <button
                  type="button"
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out hover:ring-gray-300 dark:bg-navy-700 dark:ring-navy-600"
                >
                  Manage
                </button>
              </Link>
            )}
          </>
        );
      }
    }
  ];

  const table = useReactTable({
    data: data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: true,
    initialState: {
      pagination: {
        pageSize: 8
      },
      sorting: [
        {
          id: 'borrowTime',
          desc: true
        }
      ]
    }
  });
  /* End Create Table */

  return <CustomTable withNav={true} table={table} />;
}
