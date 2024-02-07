"use client"

import React, { useEffect, useState } from "react"
import { useAccount, useReadContracts } from "wagmi"
import Card from "components/card"
import AuctionsTable from "./components/AuctionsTable"
import { MdOpenInNew } from "react-icons/md"
import { Auction, getAllAuctions } from "lib/logs/auctions"
import Spinner from "components/spinner"
import ModalAuctionChart from "./components/ModalAuctionChart"
import { auctionHouseContract } from "lib/contracts"

const Auctions = () => {
  const { isConnected } = useAccount()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<boolean>(false)

  const { data, isError, isLoading } = useReadContracts({
    contracts: [
      {
        ...auctionHouseContract,
        functionName: "auctionDuration",
      },
      {
        ...auctionHouseContract,
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
      const auctions = await getAllAuctions()
      console.log(auctions)
      setAuctions(auctions)
      setLoading(false)
    }
    getAuctions()
  }, [])

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
            ) : (
              <AuctionsTable
                tableData={auctions}
                setOpen={setOpen}
                auctionDuration={data?.auctionDuration}
              />
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

export default Auctions
