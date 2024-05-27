'use client';

import { useRouter } from 'next/navigation';
import { Transition } from '@headlessui/react';
import { useUserPrefsStore } from 'store';
import Link from 'next/link';
import { isAddress } from 'viem';
import { shortenAddress } from 'utils/strings';
import { MdDelete } from 'react-icons/md';

export default function SearchBar() {
  const router = useRouter();
  const { searchFocused, setSearchFocused, addSearchHistory, searchHistory, cleanSearchHistory } = useUserPrefsStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    const search = e.target.search.value;
    if (isAddress(search)) {
      //store search address
      setSearchFocused(false);
      addSearchHistory(search);
      router.push(`/profile?search=${search}`);
    }
  };

  return (
    <div className="relative w-60 lg:w-72 xl:w-80">
      <div className="relative flex items-center">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="search"
            id="searchAddressBar"
            placeholder="Search user address"
            className="sm:text-md duration-400 block w-full rounded-md border-0 px-4 py-2 pr-14 text-gray-700 ring-1 ring-inset ring-gray-100 transition-all ease-in-out placeholder:text-stone-400 focus:ring-2 focus:ring-inset focus:ring-brand-400/80 dark:bg-navy-700 dark:text-gray-200 dark:ring-navy-600 dark:placeholder:text-stone-300 sm:leading-6"
          />
          <div className="absolute inset-y-0 right-0 hidden py-1.5 pr-1.5 sm:flex">
            <kbd className="inline-flex items-center rounded border border-gray-200 px-1 font-sans text-xs text-gray-400 dark:border-gray-300 dark:text-gray-300">
              ⌘K
            </kbd>
          </div>
        </form>
      </div>
      <Transition
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
        show={searchFocused}
      >
        <div className="lg:max-w-98 left-1/2 z-10 mt-1 hidden w-screen max-w-sm -translate-x-1/2 transform px-4 dark:bg-navy-600 sm:absolute sm:block sm:px-0">
          <div className="overflow-hidden rounded-md shadow-lg">
            <div className="flex items-center justify-between bg-stone-100 p-2 text-sm text-stone-500 dark:bg-navy-600 dark:text-stone-200">
              <span>Latest searches</span>
              {searchHistory.length != 0 && (
                <div className="rounded-md p-1 text-base hover:bg-stone-50 dark:hover:bg-navy-400 ">
                  <MdDelete className="cursor-pointer" onClick={() => cleanSearchHistory()} />
                </div>
              )}
            </div>
            <div className="flex flex-col bg-white py-2 dark:bg-navy-50/5">
              {searchHistory.map((item) => (
                <Link
                  key={item}
                  href={`/profile?search=${item}`}
                  className="flex items-center overflow-hidden px-2 py-4 transition-all duration-200 ease-in-out hover:bg-stone-50 dark:hover:bg-navy-100/5"
                >
                  {/* <div className="flex shrink-0 items-center justify-center px-4 py-2 text-white">
                    <item.icon aria-hidden="true" />
                  </div> */}
                  <div>
                    <p className="font-semilight text-sm text-gray-600 dark:text-gray-200">
                      {/* {shortenAddress(item)} */}
                      {item}
                    </p>
                  </div>
                </Link>
              ))}
              {searchHistory.length == 0 && (
                <div className="flex items-center justify-center px-2 py-4 transition-all duration-200 ease-in-out">
                  <p className="font-semilight text-sm text-gray-400 dark:text-gray-300">No recent searches</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Transition>
    </div>
  );
}
