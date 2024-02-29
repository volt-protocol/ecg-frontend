"use client"
// Layout components
import { usePathname } from "next/navigation"
import { useState } from "react"
import routes from "routes"
import { getActiveNavbar, getActiveRoute } from "utils/navigation"
import React from "react"
import Navbar from "components/navbar"
import Sidebar from "components/sidebar"
import { useAccount, useSwitchChain } from "wagmi"
import { ToastContainer } from "react-toastify"
import TermsConditionsModal from "components/modals/TermsConditionsModal"
import { useAppStore } from "store"
import { MdError } from "react-icons/md"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isConnected, chainId } = useAccount()
  const { chains, switchChain } = useSwitchChain()
  const { termsAccepted, appChainId } = useAppStore()
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="flex h-full w-full bg-background-100/70 dark:bg-background-900">
      {!termsAccepted &&
        pathname !== "/terms-conditions" &&
        pathname !== "/risk-statement" && <TermsConditionsModal />}
      <ToastContainer />
      <Sidebar routes={routes} open={open} setOpen={setOpen} variant="admin" />
      {/* Navbar & Main Content */}
      <div className="h-full w-full dark:bg-navy-900">
        {/* Display Switch network banner if user is connected on the wrong network */}
        {isConnected && chainId != appChainId && (
          <div className="flex items-center justify-center gap-2 bg-red-100 py-2 text-sm text-red-500/90 dark:bg-red-100/0 dark:text-red-500 xl:ml-[260px]">
            <MdError className="h-6 w-6" />
            Please switch to {chains.find((chain) => chain.id == appChainId)?.name}{" "}
            network.
            <span
              className="cursor-pointer font-semibold underline"
              onClick={() => switchChain({ chainId: appChainId })}
            >
              Switch network
            </span>
          </div>
        )}
        {/* Main Content */}
        <main className={`mx-2.5 flex-none dark:bg-navy-900 md:pr-2 xl:ml-[280px]`}>
          {/* Routes */}
          <div className="min-h-screen">
            <Navbar
              onOpenSidenav={() => setOpen(!open)}
              pathname={pathname}
              brandText={getActiveRoute(routes, pathname)}
              secondary={getActiveNavbar(routes, pathname)}
            />
            <div className="mx-auto min-h-[100%] p-2 !pt-[10px] md:p-2">{children}</div>
            {/* {!isConnected && (
              <div className={'mt-20 relative'}>
                <Footer />
              </div>
            )} */}
          </div>
        </main>
      </div>
    </div>
  )
}
