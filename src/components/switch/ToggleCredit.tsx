import clsx from "clsx"

export type CurrencyTypes = 'USDC' | 'gUSDC'


export function ToggleCredit({
  selectType,
  type,
  disabled,
}: {
  selectType: (type: CurrencyTypes) => void
  type: CurrencyTypes
  disabled?: boolean
}) {
  return (
    <div className="mx-auto mt-2 w-fit rounded-lg bg-stone-200 p-1 dark:bg-navy-600 xs:mx-0 xs:mt-0 ">
      <div className="relative flex ">
        <div className="z-[2]">
          <button
            disabled={disabled}
            onClick={() => selectType("USDC")}
            id="USDC"
            type="button"
            className={clsx(
              disabled && "cursor-not-allowed",
              type == "USDC"
                ? "text-white dark:text-gray-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-gray-200 dark:hover:text-gray-200",
              "text-md transition-color inline-flex items-center rounded-lg px-3 py-2 font-semibold duration-150 ease-in"
            )}
          >
            USDC
          </button>
          <button
            disabled={disabled}
            onClick={() => selectType("gUSDC")}
            id="gUSDC"
            type="button"
            className={clsx(
              disabled && "cursor-not-allowed",
              type == "gUSDC"
                ? "text-white dark:text-gray-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-gray-200 dark:hover:text-gray-200",
              "text-md transition-color inline-flex items-center rounded-lg px-2 py-2 font-semibold text-white duration-150 ease-in"
            )}
          >
            gUSDC
          </button>
        </div>
        <span
          className={clsx(
            type != "gUSDC" ? "translate-x-0" : "translate-x-[100%]",
            "absolute z-[0] h-[100%] w-1/2 rounded-lg bg-brand-500 transition-all duration-200 ease-in dark:bg-navy-300"
          )}
        ></span>
      </div>
    </div>
  )
}