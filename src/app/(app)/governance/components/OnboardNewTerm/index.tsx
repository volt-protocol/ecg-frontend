import React, { useEffect, useState } from "react"
import { Tab } from "@headlessui/react"
import clsx from "clsx"
import { onboardNewTermTabs } from "./helper"

function OnboardNewterm({
  notUsed,
  guildReceived,
  isConnected,
}: {
  notUsed: number
  guildReceived: number
  isConnected: boolean
}) {

  return (
    <>
      <div className="text-gray-700 dark:text-gray-100">
        <div className="mt-4 flex w-full flex-col gap-2">
          <Tab.Group>
            <Tab.List className="flex space-x-1 rounded-md bg-brand-100/50 p-1 dark:bg-brand-300/80">
              {onboardNewTermTabs.map((item) => (
                <Tab
                  key={item.key}
                  className={({ selected }) =>
                    clsx(
                      "w-full rounded-md px-4 py-2 leading-5 transition-all duration-150 ease-in-out",
                      selected
                        ? "bg-white font-semibold text-brand-500"
                        : "font-medium text-brand-500/80 hover:bg-gray-100/30"
                    )
                  }
                >
                  {item.title}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels className="mt-2">
              {onboardNewTermTabs.map((item) => (
                <Tab.Panel
                  key={item.key}
                  className={clsx(
                    "rounded-xl bg-white p-3",
                    "ring-offset-2focus:outline-none ring-white/60 focus:ring-2"
                  )}
                >
                  {item.content}
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </>
  )
}

export default OnboardNewterm
