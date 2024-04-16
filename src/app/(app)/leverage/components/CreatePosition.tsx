'use client';
import { useState } from 'react';
import DefiInputBox from 'components/box/DefiInputBox';
import ButtonPrimary from 'components/button/ButtonPrimary';
import { MdArrowDownward } from 'react-icons/md';
import { RangeSlider } from 'components/rangeSlider/RangeSlider';

export default function CreatePosition({}: {}) {
  const [payValue, setPayValue] = useState<string>('');
  const [longValue, setLongValue] = useState<string>('');
  const [withLeverage, setWithLeverage] = useState<boolean>(false);
  const [leverageValue, setLeverageValue] = useState<number>(0);
  const [slippageValue, setSlippageValue] = useState<number>(0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <DefiInputBox
          topLabel="Deposit"
          currencyLogo="/img/crypto-logos/btc.png"
          currencySymbol="WBTC"
          placeholder="0"
          pattern="^[0-9a-fA-F]$"
          inputSize="text-2xl sm:text-3xl"
          value={payValue}
          onChange={(e) => setPayValue(e.target.value)}
          // rightLabel={
          //   <button
          //     className="text-sm font-medium text-brand-500 hover:text-brand-400"
          //     onClick={(e) => setAddressValue(e.target.value)}
          //   >
          //     Delegate to myself
          //   </button>
          // }
        />
        <div className="relative z-10">
          <button type="button" className="absolute -top-4 flex w-full justify-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500">
              <MdArrowDownward className="text-white" />
            </span>
          </button>
        </div>
        <DefiInputBox
          topLabel="Receive"
          currencyLogo="/img/crypto-logos/usdc.png"
          currencySymbol="USDC"
          placeholder="0"
          pattern="^[0-9]*[.,]?[0-9]*$"
          inputSize="text-2xl sm:text-3xl"
          value={longValue}
          onChange={(e) => setLongValue(e.target.value)}
          // rightLabel={
          //   <>
          //     <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          //       Available:{" "}
          //       {guildNotUsed ? formatDecimal(Number(formatUnits(guildNotUsed, 18)), 2) : 0}
          //     </p>
          //     <button
          //       className="text-sm font-medium text-brand-500 hover:text-brand-400"
          //       onClick={(e) => setValue(formatUnits(guildNotUsed, 18))}
          //     >
          //       Max
          //     </button>
          //   </>
          // }
        />
      </div>
      <div className="flex flex-col rounded-xl bg-gray-100 py-4 dark:bg-navy-900">
        <div className="w-full px-5 ">
          <RangeSlider
            title="Leverage slider"
            value={leverageValue}
            onChange={(value) => setLeverageValue(value)}
            withSwitch
            max={50}
            show={withLeverage}
            setShow={setWithLeverage}
          />
        </div>
        <div className="my-2 w-full px-5">
          <RangeSlider
            title="Slippage slider"
            max={5}
            value={slippageValue}
            onChange={(value) => setSlippageValue(value)}
          />
        </div>
        <div className="my-4 w-full border-t border-gray-200/80 px-5" />
        <div className="px-5">
          <div className="flex justify-between">
            <dt className="text-sm font-medium leading-6 text-gray-700 dark:text-gray-300">Leverage</dt>
            <dd className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 sm:col-span-2 sm:mt-0">
              {leverageValue}x
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium leading-6 text-gray-700 dark:text-gray-300">Slippage</dt>
            <dd className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 sm:col-span-2 sm:mt-0">
              {slippageValue}%
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium leading-6 text-gray-700 dark:text-gray-300">Entry Price</dt>
            <dd className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 sm:col-span-2 sm:mt-0">
              2800$
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium leading-6 text-gray-700 dark:text-gray-300">Liquidation Price</dt>
            <dd className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 sm:col-span-2 sm:mt-0">
              2600$
            </dd>
          </div>
        </div>
      </div>
      <ButtonPrimary
        variant="lg"
        title="Open Position"
        extra="w-full !rounded-xl"
        onClick={() => {}}
        // disabled={
        //   !guildNotUsed ||
        //   Number(value) > Number(formatUnits(guildNotUsed, 18)) ||
        //   Number(value) <= 0 ||
        //   !value ||
        //   !isAddress(addressValue)
        // }
      />
    </div>
  );
}
