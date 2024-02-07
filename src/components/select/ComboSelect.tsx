import { useState } from "react"
import { MdCheck, MdUnfoldMore } from "react-icons/md"
import { Combobox } from "@headlessui/react"
import clsx from "clsx"

export default function ComboSelect<T>({
  options,
  selectedOption,
  onChangeSelect,
  query,
  onChangeQuery,
  getLabel,
  extra,
  placeholder
}: {
  options: T[]
  selectedOption: T
  onChangeSelect: React.Dispatch<React.SetStateAction<T>>
  query: string
  onChangeQuery: React.Dispatch<React.SetStateAction<string>>
  getLabel: (option: T) => string
  extra?: string
  placeholder?: string
}) {

  const filteredOptions =
    query === ""
      ? options
      : options.filter((item) => {
          return (
            item?.address.toLowerCase().includes(query.toLowerCase()) ||
            item?.symbol.toLowerCase().includes(query.toLowerCase())
          )
        })

  return (
    <Combobox as="div" value={selectedOption} onChange={onChangeSelect}>
      <div className={clsx("relative", extra ? extra : "w-[250px]")}>
        <Combobox.Input
          placeholder={placeholder}
          className="sm:text-md w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-600 shadow-sm ring-1 ring-inset ring-gray-200 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400/80 dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600"
          onChange={(event) => {
            onChangeQuery(event.target.value)
          }}
          displayValue={(option) => option.address}
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
          <MdUnfoldMore className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </Combobox.Button>
        {filteredOptions.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white p-1  text-base shadow-lg focus:outline-none dark:bg-navy-600 sm:text-sm">
            {filteredOptions.map((item, key) => (
              <Combobox.Option
                key={key}
                value={item}
                className={({ active }) =>
                  clsx(
                    active
                      ? "rounded-md bg-brand-400/80 text-white transition-all duration-150 ease-in-out hover:cursor-pointer dark:text-gray-200"
                      : "text-gray-900 dark:text-gray-200",
                    "relative cursor-default select-none py-2 pl-3 pr-9"
                  )
                }
              >
                {({ active, selected }) => (
                  <>
                    <span className={clsx("block truncate", selected && "font-semibold")}>
                      {getLabel(item)}
                    </span>

                    {selected && (
                      <span
                        className={clsx(
                          active ? "text-white" : "text-brand-500",
                          "absolute inset-y-0 right-0 flex items-center pr-4"
                        )}
                      >
                        <MdCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
      </div>
    </Combobox>
  )
}
