/* eslint-disable */

import { HiX } from "react-icons/hi"
import Links from "./components/Links"
import clsx from "clsx"

import { IRoute } from "types/navigation"
import DropdownSelect from "components/select/DropdownSelect"
import ethereumLogo from "/public/img/ethereum-logo.svg"
import Link from "next/link"
import DashIcon from "components/icons/DashIcon"
import NavLink from "components/link/NavLink"
import {
  MdInfoOutline,
  MdOpenInBrowser,
  MdOpenInNew,
  MdOutbond,
  MdSwapHoriz,
} from "react-icons/md"
import ButtonPrimary from "components/button/ButtonPrimary"

const markets = [
  {
    id: 1,
    name: "USDC Market",
    avatar: ethereumLogo,
  },
]

function Sidebar(props: { routes: IRoute[]; [x: string]: any }) {
  const { routes, open, setOpen } = props
  return (
    <div
      className={clsx(
        "sm:none fixed !z-50 flex min-h-full flex-col bg-stone-200 pb-5 shadow-2xl shadow-white/5 dark:!bg-navy-800 dark:text-white md:!z-50 lg:!z-50 xl:!z-0",
        open
          ? "transiton-all translate-x-0 duration-150 ease-linear"
          : "transiton-all -translate-x-96 duration-150 ease-linear xl:translate-x-0"
      )}
    >
      <span
        className="absolute right-4 top-4 block cursor-pointer xl:hidden"
        onClick={() => setOpen(false)}
      >
        <HiX />
      </span>

      <div className={`mx-10 mt-5 flex flex-col items-center justify-center`}>
        <div className="font-poppins text-[26px] font-bold uppercase text-gray-800 dark:text-white">
          Credit <span className="font-medium">Guild</span>
        </div>
        <div className="mt-2 px-1">
          <DropdownSelect
            options={markets}
            selectedOption={markets[0]}
            onChange={() => {}}
            getLabel={(option) => option.name}
            extra="w-full"
          />
        </div>
      </div>
      <div className="my-5 h-px bg-gray-200 dark:bg-white/30" />
      {/* Nav item */}

      <div className="mb-auto pt-1">
        <Links routes={routes} />
        <div className="mt-5 flex justify-center">
          <Link href="/bridge">
            <ButtonPrimary
              extra="w-full"
              title={
                <>
                  <MdSwapHoriz className="mr-1 h-6 w-6" />
                  Bridge assets
                </>
              }
            ></ButtonPrimary>
          </Link>
        </div>
      </div>

      {/* Free Horizon Card */}
      {/* <div className="flex justify-center">
        <SidebarCard />
      </div> */}

      {/* Nav item end */}
      <div className="flex flex-col justify-end">
        <a href={process.env.NEXT_PUBLIC_DOCS_URL} target="_blank">
          <div
            className={clsx(
              "relative my-0.5 flex rounded-md py-1 transition-all duration-150 ease-in hover:cursor-pointer",
              "font-semilight text-sm text-stone-500 hover:text-gray-700 dark:text-gray-300"
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
        <NavLink key="risk" href={"/risk-statement"}>
          <div
            className={clsx(
              "relative my-0.5 flex rounded-md py-1 transition-all duration-150 ease-in hover:cursor-pointer",
              "font-semilight text-sm text-stone-500 hover:text-gray-700 dark:text-gray-300"
            )}
          >
            <li className="my-[3px] flex cursor-pointer items-center px-8">
              <p className="leading-1 ml-4 flex">Risk Statement</p>
            </li>
          </div>
        </NavLink>
        <NavLink key="terms" href={"/terms-conditions"}>
          <div
            className={clsx(
              "relative my-0.5 flex rounded-md py-1 transition-all duration-150 ease-in hover:cursor-pointer",
              "font-semilight text-sm text-stone-500 hover:text-gray-700 dark:text-gray-300"
            )}
          >
            <li className="my-[3px] flex cursor-pointer items-center px-8">
              <p className="leading-1 ml-4 flex">Terms & Conditions</p>
            </li>
          </div>
        </NavLink>
      </div>
    </div>
  )
}

export default Sidebar
