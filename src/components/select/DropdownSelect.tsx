import { Fragment } from "react"
import { Listbox, Transition } from "@headlessui/react"
import { MdCheck, MdUnfoldMore } from "react-icons/md"
import clsx from "clsx"

export default function DropdownSelect<T>({
  options,
  selectedOption,
  onChange,
  getLabel,
  extra,
  textNoOptionSelected
}: {
  options: T[]
  selectedOption: T
  onChange: React.Dispatch<React.SetStateAction<T>>
  getLabel: (option: T) => string | JSX.Element
  extra?: string
  textNoOptionSelected?: string
}) {
  return (
    <Listbox value={selectedOption} onChange={onChange}>
      {({ open }) => (
        <>
          <div className="relative">
            <Listbox.Button
              className={clsx(
                extra ? extra : "w-[250px]",
                "sm:text-md relative cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-600 shadow-sm ring-1 ring-inset ring-gray-200 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400/80 dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 sm:leading-6"
              )}
            >
              <span className="block truncate">{selectedOption ? getLabel(selectedOption) : textNoOptionSelected ?? '-'}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <MdUnfoldMore className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white p-1  text-base shadow-lg focus:outline-none dark:bg-navy-600 sm:text-sm">
                {options.map((item, key) => (
                  <Listbox.Option
                    key={key}
                    className={({ active }) =>
                      clsx(
                        active
                          ? "rounded-md bg-brand-400/80 text-white transition-all duration-150 ease-in-out hover:cursor-pointer dark:text-gray-200"
                          : "text-gray-900 dark:text-gray-200",
                        "relative cursor-default select-none py-2 pl-3 pr-9"
                      )
                    }
                    value={item}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={clsx(
                            selected ? "font-semibold" : "font-normal",
                            "block truncate"
                          )}
                        >
                          {getLabel(item)}
                        </span>

                        {selected ? (
                          <span
                            className={clsx(
                              active ? "text-white" : "text-brand-500",
                              "absolute inset-y-0 right-0 flex items-center pr-4"
                            )}
                          >
                            <MdCheck className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  )
}
