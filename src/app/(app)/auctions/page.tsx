"use client"

import React, { useEffect, useState } from "react"
import { useAccount, useReadContracts } from "wagmi"
import Card from "components/card"
import AuctionsTable from "./components/AuctionsTable"
import { MdOpenInNew, MdOutlineBalance } from "react-icons/md"
import Spinner from "components/spinner"
import ModalAuctionChart from "./components/ModalAuctionChart"
import { Auction, AuctionHouse } from "../../../store/slices/auctions"
import { useAppStore } from "store"

const Auctions = () => {
  const { contractsList, coinDetails, auctionHouses, auctions } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [openAuction, setOpenAuction] = useState<Auction | null>(null)
  const [reload, setReload] = useState<boolean>(true)

  useEffect(() => {
    setReload(false)
  }, [reload])

  return (
    <>
      <ModalAuctionChart
        setOpenAuction={setOpenAuction}
        openAuction={openAuction}
        auctionHouses={auctionHouses}
      />
      <div>
        <div className="mt-3">
          <Card
            title="Auctions"
            extra="w-full h-full sm:overflow-auto px-6 py-4"
            rightText={
              <a
                className="inline-flex items-center gap-1 text-center text-sm text-stone-400 transition-all duration-150 ease-in-out hover:text-stone-500 dark:text-gray-300 dark:hover:text-gray-200"
                href="https://credit-guild.gitbook.io/introduction/smart-contracts/auctions"
                target="_blank"
              >
                Learn about auctions <MdOpenInNew />
              </a>
            }
          >
            {loading ? (
              <div className="my-10 flex justify-center">
                <Spinner />
              </div>
            ) : !auctions ? (
              <div className="my-5 flex-col items-center justify-center opacity-40">
                <div className="flex justify-center">
                  <MdOutlineBalance className="h-10 w-10" />
                </div>
                <div className="mt-2 flex justify-center">
                  <p>There are no auctions yet</p>
                </div>
              </div>
            ) : (
              <AuctionsTable
                setOpenAuction={setOpenAuction}
                auctions={auctions}
                auctionHouses={auctionHouses}
                setReload={setReload}
              />
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

export default Auctions
