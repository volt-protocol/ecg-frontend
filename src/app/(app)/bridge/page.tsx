'use client';

import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

function SocketBridge() {
  // const [Bridge, setBridge] = useState<any>()
  // const provider = new ethers.BrowserProvider(window.ethereum, "any")

  return null;

  // //prevent issue with window not defined
  // useEffect(() => {
  //   import("@socket.tech/plugin").then((mod) => {
  //     setBridge(() => mod.Bridge)
  //   })
  // }, [])

  // return Bridge && (
  //   <div className="flex w-full justify-center">
  //     <div className="my-20 flex max-w-2xl flex-col items-center justify-center gap-10 text-center text-gray-700 dark:text-gray-50">
  //       <h1 className="text-2xl sm:text-4xl">Seamlessly transfer your assets to Ethereum</h1>
  //       <Bridge
  //         provider={provider}
  //         API_KEY={process.env.NEXT_PUBLIC_SOCKET_API_KEY}
  //         customize={{
  //           width: 400,
  //           responsiveWidth: true,
  //           borderRadius: 1,
  //         }}
  //       />
  //     </div>
  //   </div>
  // )
}

export default SocketBridge;
