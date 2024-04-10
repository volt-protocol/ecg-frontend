import clsx from "clsx"

export type CurrencyTypes = 'pegToken' | 'creditToken'


export function ToggleCredit({
  selectType,
  pegToken,
  marketId,
  type,
  disabled,
}: {
  selectType: (type: CurrencyTypes) => void
  pegToken: any
  marketId: number,
  type: CurrencyTypes
  disabled?: boolean
}) {
  return (
    <div className="mx-auto mt-2 w-fit rounded-lg bg-stone-200 p-1 dark:bg-navy-600 xs:mx-0 xs:mt-0 ">
      <div className="relative flex ">
        <div className="z-[2]">
          <button
            disabled={disabled}
            onClick={() => selectType("pegToken")}
            id="pegToken"
            type="button"
            className={clsx(
              disabled && "cursor-not-allowed",
              type == "pegToken"
                ? "text-white dark:text-gray-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-gray-200 dark:hover:text-gray-200",
              "text-md transition-color inline-flex items-center rounded-lg px-8 py-2 font-semibold duration-150 ease-in"
            )}
          >
            {pegToken.symbol}
          </button>
          <button
            disabled={disabled}
            onClick={() => selectType("creditToken")}
            id="creditToken"
            type="button"
            className={clsx(
              disabled && "cursor-not-allowed",
              type == "creditToken"
                ? "text-white dark:text-gray-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-gray-200 dark:hover:text-gray-200",
              "text-md transition-color inline-flex items-center rounded-lg px-2 py-2 font-semibold text-white duration-150 ease-in"
            )}
          >
            g{pegToken.symbol}-{marketId > 999e6 ? 'test' : marketId}
          </button>
        </div>
        <span
          className={clsx(
            type != "creditToken" ? "translate-x-0" : "translate-x-[100%]",
            "absolute z-[0] h-[100%] w-1/2 rounded-lg bg-brand-500 transition-all duration-200 ease-in dark:bg-navy-300"
          )}
        ></span>
      </div>
    </div>
  )
}