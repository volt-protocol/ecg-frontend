import Image from "next/image"
import notConnectedImage from "/public/img/not-connected.png"
import { ConnectWeb3Button } from "components/button/ConnectWeb3Button"

export default function Disconnected() {
  return (
    <>
      <main className="flex min-h-full flex-col items-center justify-center rounded-md bg-white px-6 py-24 dark:bg-navy-800 sm:py-32 lg:px-8">
        <Image
          src={notConnectedImage}
          alt="Wallet not connected"
          width={200}
          height={200}
        />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Please, connect your wallet
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-600 dark:text-gray-200">
          Connect your wallet to see your lending terms, borrowings, and open positions.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-5 gap-x-6">
          <div>
            <ConnectWeb3Button />
          </div>
          {/* <a href="#" className="text-sm font-semibold text-gray-900">
            Contact support <span aria-hidden="true">&rarr;</span>
          </a> */}
        </div>
      </main>
    </>
  )
}
