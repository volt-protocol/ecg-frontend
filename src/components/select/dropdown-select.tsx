import { Fragment, useEffect, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import {
    MdExpandMore,
    MdExpandLess
} from 'react-icons/md'
import clsx from 'clsx'
import Image from 'next/image'

export default function DropdownSelect({data}: {data: any}) {
  const [selected, setSelected] = useState(data[0])

  return (
    <Listbox value={selected} onChange={setSelected}>
      {({ open }) => (
        <>
          <div className="relative mt-2">
            <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-800 shadow-sm ring-1 ring-inset ring-gray-200 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400/80 sm:text-md sm:leading-6">
              <span className="flex items-center">
                <Image 
                    src={selected.avatar} alt="" 
                    className="h-5 w-5 flex-shrink-0 rounded-full" 
                    width={5}
                    height={5}
                />
                <span className="ml-3 block truncate">{selected.name}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
                    { open ? 
                        <MdExpandLess className="h-5 w-5 text-gray-400" aria-hidden="true" /> : 
                        <MdExpandMore className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    }
                </span>
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 p-1 max-h-56 w-full overflow-auto rounded-md bg-white text-base shadow-lg focus:outline-none sm:text-sm">
                {data.map((person) => (
                  <Listbox.Option
                    key={person.id}
                    className={({ active }) =>
                      clsx(
                        active ? 'bg-brand-400/80 rounded-md  text-white hover:cursor-pointer transition-all ease-in-out duration-150' : 'text-gray-900',
                        'relative cursor-default select-none py-2 pl-3 pr-9'
                      )
                    }
                    value={person}
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex items-center">
                          <Image 
                            src={person.avatar} alt="" 
                            className="h-5 w-5 flex-shrink-0 rounded-full" 
                            width={5}
                            height={5}
                        />
                          <span
                            className={clsx(selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate')}
                          >
                            {person.name}
                          </span>
                        </div>
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
