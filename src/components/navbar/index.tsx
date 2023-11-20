import React from "react"
import Dropdown from "components/dropdown"
import { FiAlignJustify } from "react-icons/fi"
import NavLink from "components/link/NavLink"
import navbarimage from "/public/img/layout/Navbar.png"
import { BsArrowBarUp } from "react-icons/bs"
import { FiSearch } from "react-icons/fi"
import { RiMoonFill, RiSunFill } from "react-icons/ri"
// import { RiMoonFill, RiSunFill } from 'react-icons/ri';
// import Configurator from './Configurator';
import {
  IoMdNotificationsOutline,
  IoMdInformationCircleOutline,
} from "react-icons/io"
import avatar from "/public/img/avatars/avatar4.png"
import Image from "next/image"
import { DynamicWidget } from "@dynamic-labs/sdk-react-core"
import { MdArrowBack } from "react-icons/md"
import { useRouter } from "next/navigation"
import Link from "next/link"

const Navbar = (props: {
  onOpenSidenav: () => void
  brandText: string
  secondary?: boolean | string
  pathname: string
  [x: string]: any
}) => {
  const router = useRouter()
  const { onOpenSidenav, brandText, pathname, mini, hovered } = props
  const [darkmode, setDarkmode] = React.useState(
    document.body.classList.contains("dark")
  )
  return (
    <nav className="sticky top-0 z-40 flex flex-row flex-wrap items-center justify-between bg-white/10 p-2 backdrop-blur-xl dark:bg-[#0b14374d]">
      <div className="ml-[6px]">
        <p className=" text-gray-700 dark:text-white">
          {pathname.match(/\//g).length > 1 && (
            <Link href="/lending">
              <button
                type="button"
                className="mr-2 inline-flex items-center gap-x-1.5 rounded-md text-sm dark:bg-navy-700 dark:hover:bg-navy-600 bg-white text-gray-600 hover:text-gray-800 dark:text-gray-300 hover:bg-brand-100/30 px-3 py-2 shadow-sm transition-all duration-150 ease-in-out"
              >
                <MdArrowBack className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:block">Go Back</span>
              </button>
            </Link>
          )}
          <NavLink
            href="#"
            className="font-medium text-2xl hover:text-gray-700 dark:hover:text-white"
          >
            {brandText}
          </NavLink>
        </p>
      </div>

      <div className="relative mt-[3px] flex h-[61px] w-fit flex-grow items-center justify-around gap-2 px-2 py-2  dark:shadow-none md:w-fit md:flex-grow-0 md:gap-1 xl:w-fit xl:gap-2">
        {/* <div className="flex h-full items-center rounded-full bg-lightPrimary text-gray-700 dark:bg-navy-900 dark:text-white xl:w-[225px]">
          <p className="pl-3 pr-2 text-xl">
            <FiSearch className="h-4 w-4 text-gray-400 dark:text-white" />
          </p>
          <input
            type="text"
            placeholder="Search..."
            className="block h-full w-full rounded-full bg-lightPrimary text-sm font-medium text-gray-700 outline-none placeholder:!text-gray-400 dark:bg-navy-900 dark:text-white dark:placeholder:!text-white sm:w-fit"
          />
        </div> */}
        <span
          className="flex cursor-pointer text-xl text-gray-600 dark:text-white xl:hidden"
          onClick={onOpenSidenav}
        >
          <FiAlignJustify className="h-5 w-5" />
        </span>

        <div
          className="cursor-pointer text-gray-600"
          onClick={() => {
            if (darkmode) {
              document.body.classList.remove("dark")
              setDarkmode(false)
            } else {
              document.body.classList.add("dark")
              setDarkmode(true)
            }
          }}
        >
          {darkmode ? (
            <RiSunFill className="h-4 w-4 text-gray-600 dark:text-white" />
          ) : (
            <RiMoonFill className="h-4 w-4 text-gray-600 dark:text-white" />
          )}
        </div>

        <DynamicWidget />
      </div>
    </nav>
  )
}

export default Navbar
