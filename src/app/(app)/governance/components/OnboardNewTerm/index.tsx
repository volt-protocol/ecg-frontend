import React, { useEffect, useState } from "react"
import { Tab } from "@headlessui/react"
import clsx from "clsx"
import { onboardNewTermTabs } from "./helper"

function OnboardNewterm({
  creditVotingWeight,
  guildVotingWeight,
}: {
  creditVotingWeight: bigint
  guildVotingWeight: bigint
}) {
  return (
    <>
      <div className="text-gray-700 dark:text-gray-100">
        <div className="mt-4 flex w-full flex-col gap-2">
          <Tab.Group>
            <Tab.List className="flex space-x-1 rounded-md bg-brand-100/50 p-1 dark:bg-navy-700">
              {onboardNewTermTabs.map((item) => (
                <Tab
                  key={item.key}
                  className={({ selected }) =>
                    clsx(
                      "w-full rounded-md px-2 py-1 text-sm leading-5 transition-all duration-150 ease-in-out sm:px-4 sm:py-2 sm:text-base",
                      selected
                        ? "bg-white font-semibold text-brand-500 dark:bg-navy-600/70"
                        : "font-medium text-brand-500/80 hover:bg-white/30 dark:text-gray-200 dark:hover:bg-navy-600/50"
                    )
                  }
                >
                  {item.title}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels className="mt-2">
              {onboardNewTermTabs.map((item) => (
                <Tab.Panel key={item.key} className={"p-3"}>
                  {React.cloneElement(item.content as React.ReactElement<any>, {
                    creditVotingWeight,
                    guildVotingWeight,
                  })}
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
