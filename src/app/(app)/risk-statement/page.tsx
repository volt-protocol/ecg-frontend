import React, { useEffect, useState } from "react"

const RiskStatement = () => {
  return (
    <div className="flex flex-col items-center rounded-md bg-white px-8 py-10 text-gray-700">
      <p className="py-3 w-2/3">
        All lending carries risk, as do all novel smart contract systems. By signing, you
        acknowledge that you understand that the Credit Guild is exposed to risks, most
        notably the possibility that hacks or bugs in the smart contracts could result in
        the total loss of user funds, or that market volatility may cause losses in
        collateralized loans.
      </p>
      <p className="py-3 w-2/3">
        While the protocol has been audited, has a{" "}
        <a className="text-brand-500 hover:text-brand-400" href="https://github.com/volt-protocol/ethereum-credit-guild" target="_blank">
          thorough test suite
        </a>{" "}
        augmented by an independent security researcher, and will be covered by an
        Immunefi bug bounty program once live, none of these are a guarantee that there
        will not be losses due to hacks or economic attacks on the protocol.
      </p>
      <p className="py-3 w-2/3">
        GUILD token holders are free to approve and stake on any lending terms of their
        choosing, with the risk of slashing in the case of losses. While the veto power of
        the GUILD token can prevent obviously dangerous lending terms, competitive market
        collateralizations may result in losses when unusual volatility occurs. The Credit
        Guild is designed to be resilient to bad debt by fairly marking down losses,
        unlike most DeFi lenders that are exposed to bank run risk in the event of loss.
      </p>
      <p className="py-3 w-2/3">
        The front end provided by the Electric Development Co may not be accessible in all
        places and times. Users are recommended to maintain a local copy of the frontend
        code, or be prepared to interact with the system contracts through an alternative
        interface, to ensure that they can reliably and correctly control their funds.
      </p>
    </div>
  )
}

export default RiskStatement
