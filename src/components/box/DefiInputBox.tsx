import clsx from "clsx"
import Image from "next/image"
import { Address } from "viem"

export default function DefiInputBox({
  disabled = false,
  topLabel,
  placeholder,
  inputSize,
  pattern,
  value,
  onChange,
  rightLabel,
  currencyLogo,
  currencySymbol,
  ref,
}: {
  disabled?: boolean
  topLabel: string
  placeholder: string
  inputSize: string
  pattern: string
  value: string | number | Address
  onChange?: any
  rightLabel?: JSX.Element
  currencyLogo?: string
  currencySymbol?: string
  ref?: any
}) {
  return (
    <div className="relative mt-2 rounded-xl bg-brand-100/50 dark:bg-navy-700">
      <div className="mb-1 px-5 pt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
        {topLabel}
      </div>
      <div className="flex items-center justify-between px-5">
        <input
          ref={ref}
          disabled={disabled}
          onChange={onChange}
          value={value}
          className={clsx(
            inputSize,
            "block max-w-[70%] border-gray-300 bg-brand-100/0 text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:border-brand-400/80 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:leading-6"
          )}
          placeholder={placeholder}
          pattern={pattern}
        />
        {currencyLogo && currencySymbol && (
          <div className="flex items-center gap-2">
            <Image src={currencyLogo} width={32} height={32} alt="logo" />
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {currencySymbol}
            </span>
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-end gap-1 px-5 pb-4">{rightLabel}</div>
    </div>
  )
}
