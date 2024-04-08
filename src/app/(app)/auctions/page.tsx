"use client"

import React, { useEffect, useState } from "react"
import { useAccount, useReadContracts } from "wagmi"
import Card from "components/card"
import AuctionsTable from "./components/AuctionsTable"
import { MdOpenInNew, MdOutlineBalance } from "react-icons/md"
import { Auction, getAllAuctions } from "lib/logs/auctions"
import Spinner from "components/spinner"
import ModalAuctionChart from "./components/ModalAuctionChart"
import { AuctionHouseABI } from "lib/contracts"
import { useAppStore } from "store"

const Auctions = () => {
  const { contractsList, coinDetails } = useAppStore()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState<boolean>(false)
  const [reload, setReload] = useState<boolean>(true)

  const { data, isError, isLoading } = useReadContracts({
    contracts: [
      {
        address: contractsList?.auctionHouseAddress,
        abi: AuctionHouseABI,
        functionName: "auctionDuration",
      },
      {
        address: contractsList?.auctionHouseAddress,
        abi: AuctionHouseABI,
        functionName: "midPoint",
      },
    ],
    query: {
      select: (data) => {
        return {
          auctionDuration: Number(data[0].result),
          midPoint: Number(data[1].result),
        }
      },
    },
  })

  useEffect(() => {
    const getAuctions = async () => {
      setLoading(true)
      const auctions = await getAllAuctions(contractsList, coinDetails)
      setAuctions(auctions)
      setLoading(false)
      setReload(false)
    }
    reload && contractsList && getAuctions()
  }, [reload, contractsList])

  return (
    <>
      <ModalAuctionChart
        setOpen={setOpen}
        isOpen={open}
        midpoint={data?.midPoint}
        auctionDuration={data?.auctionDuration}
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
                tableData={auctions}
                setOpen={setOpen}
                auctionDuration={data?.auctionDuration}
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