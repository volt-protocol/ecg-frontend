/* eslint-disable */
import Image from 'next/image';
import { HiX } from 'react-icons/hi';
import Links from './components/Links';
import clsx from 'clsx';
import React, { useState } from 'react';
import { IRoute } from 'types/navigation';
import DropdownSelect from 'components/select/DropdownSelect';
import NavLink from 'components/link/NavLink';
import { MdOpenInNew, MdOutlineWarningAmber } from 'react-icons/md';
import { useSwitchChain } from 'wagmi';
import { useUserPrefsStore } from 'store';
import { SelectableChainId, marketsConfig, SupportedMarket } from 'config';
import { Switch } from '@headlessui/react';

function Sidebar(props: { routes: IRoute[]; [x: string]: any }) {
  const { chains } = useSwitchChain();
  const { appChainId, setAppMarket, appMarket, setAppChainId, usePermit, setUsePermit } = useUserPrefsStore();
  const { routes, open, setOpen } = props;
  const [localUsePermit, setLocalUsePermit] = useState(usePermit);

  if (marketsConfig[appChainId] == undefined) {
    console.log(`using default chaindId ${Number(Object.keys(marketsConfig)[0])}`);
    setAppChainId(Number(Object.keys(marketsConfig)[0]));
  }

  if (!marketsConfig[appChainId].some((_) => _.marketId == appMarket.marketId)) {
    console.log(`using default market: ${marketsConfig[appChainId][0].name}`);
    setAppMarket(marketsConfig[appChainId][0]);
  }

  function handleChangeChain(chainId: number) {
    console.log('handleChangeChain', { chainId });
    // if selected chain is not in the config list
    // use the first one
    // this can happen when loading chainId from store
    if (marketsConfig[chainId] == undefined) {
      chainId = Number(Object.keys(marketsConfig)[0]);
    }

    setAppChainId(chainId);
  }

  function handleChangeMarket(market: SupportedMarket) {
    console.log('handleChangeMarket', { market });

    // search if market exists in network
    // if not, use first one
    // this can happen when loading marketId from chain
    if (!marketsConfig[appChainId].some((_) => _.marketId == market.marketId)) {
      market = marketsConfig[appChainId][0];
    }

    setAppMarket(market);
  }

  function handleUsePermitChange(val) {
    setLocalUsePermit(val);
    setUsePermit(val);
  }

  return (
    <div
      className={clsx(
        'sm:none fixed !z-50 flex min-h-full min-w-[260px] flex-col bg-stone-200 pb-5 shadow-2xl shadow-white/5 dark:!bg-navy-800 dark:text-white md:!z-50 lg:!z-50 xl:!z-0',
        open
          ? 'transiton-all translate-x-0 duration-150 ease-linear'
          : 'transiton-all -translate-x-96 duration-150 ease-linear xl:translate-x-0'
      )}
    >
      <span className="absolute right-4 top-4 block cursor-pointer xl:hidden" onClick={() => setOpen(false)}>
        <HiX />
      </span>

      <div className={`mt-5 flex flex-col items-center justify-center px-5`}>
        <div className="font-poppins text-[26px] font-bold uppercase text-gray-800 dark:text-white">
          Credit <span className="font-medium">Guild</span>
        </div>
        <div className="mt-2 px-1">
          <DropdownSelect
            options={chains.filter((_) => SelectableChainId.includes(_.id)).map((chain) => chain.id)}
            selectedOption={appChainId}
            onChange={(option) => handleChangeChain(Number(option))}
            getLabel={(option) => {
              const chainFound = chains.find((chain) => chain.id == option);
              if (chainFound) {
                return (
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Image src={`/img/chain-logos/${chainFound.id}.svg`} width={25} height={25} alt={chainFound.name} />
                    {chainFound.name}
                  </div>
                );
              }
              return 'Wrong network';
            }}
            extra="min-w-[180px]"
          />
        </div>
        <div className="mt-2 px-1">
          <DropdownSelect
            options={marketsConfig[appChainId]}
            selectedOption={marketsConfig[appChainId].find((market) => market.key === appMarket.key)}
            onChange={(option) => handleChangeMarket(option as SupportedMarket)}
            getLabel={(option) => (
              <div className="flex items-center gap-1 text-sm">
                <Image src={option.logo} width={25} height={25} alt={option.name} />
                {option.name}
                {option.name.indexOf('(test)') != -1 ? <MdOutlineWarningAmber style={{ color: '#FFA000' }} /> : null}
              </div>
            )}
            extra="min-w-[180px]"
          />
        </div>
      </div>
      <div className="my-5 h-px bg-gray-200 dark:bg-white/30" />
      {/* Nav item */}

      <div className="mb-auto pt-1">
        <Links routes={routes} />
        {/* <div className="mt-5 flex justify-center">
          <Link href="/bridge">
            <ButtonPrimary
              disabled={true}
              extra="w-full"
              title={
                <>
                  <MdSwapHoriz className="mr-1 h-6 w-6" />
                  Bridge assets
                </>
              }
            ></ButtonPrimary>
          </Link>
        </div> */}
      </div>

      {/* Free Horizon Card */}
      {/* <div className="flex justify-center">
        <SidebarCard />
      </div> */}

      {/* Nav item end */}
      <div className="flex flex-col justify-end">
        <div className="mb-2 text-center text-sm">
          <Switch
            checked={localUsePermit}
            onChange={handleUsePermitChange}
            className={clsx(
              localUsePermit ? 'bg-brand-500' : 'bg-gray-200',
              'border-transparent relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out'
            )}
          >
            <span
              aria-hidden="true"
              className={clsx(
                localUsePermit ? 'translate-x-5' : 'translate-x-0',
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
              )}
            />
          </Switch>
          <span className="ml-2" style={{ display: 'inline-block', height: '24px', verticalAlign: 'bottom' }}>
            Use Permit if available
          </span>
        </div>
        <a href={process.env.NEXT_PUBLIC_DOCS_URL} target="_blank">
          <div
            className={clsx(
              'relative my-0.5 flex rounded-md py-1 transition-all duration-150 ease-in hover:cursor-pointer',
              'font-semilight text-sm text-stone-500 hover:text-gray-700 dark:text-gray-300'
            )}
          >
            <li className="my-[3px] flex cursor-pointer items-center px-8">
              <div className="flex items-center gap-1">
                <p className="leading-1 ml-4 flex">Documentation </p>
                <MdOpenInNew />
              </div>
            </li>
          </div>
        </a>
        <NavLink key="risk" href={'/risk-statement'}>
          <div
            className={clsx(
              'relative my-0.5 flex rounded-md py-1 transition-all duration-150 ease-in hover:cursor-pointer',
              'font-semilight text-sm text-stone-500 hover:text-gray-700 dark:text-gray-300'
            )}
          >
            <li className="my-[3px] flex cursor-pointer items-center px-8">
              <p className="leading-1 ml-4 flex">Risk Statement</p>
            </li>
          </div>
        </NavLink>
        <NavLink key="terms" href={'/terms-conditions'}>
          <div
            className={clsx(
              'relative my-0.5 flex rounded-md py-1 transition-all duration-150 ease-in hover:cursor-pointer',
              'font-semilight text-sm text-stone-500 hover:text-gray-700 dark:text-gray-300'
            )}
          >
            <li className="my-[3px] flex cursor-pointer items-center px-8">
              <p className="leading-1 ml-4 flex">Terms & Conditions</p>
            </li>
          </div>
        </NavLink>
      </div>
    </div>
  );
}

export default Sidebar;
