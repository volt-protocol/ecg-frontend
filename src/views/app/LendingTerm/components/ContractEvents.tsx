
import React from 'react'
import { getContract } from '@wagmi/core'
import { termAbi } from 'guildAbi';
import { config } from 'wagmiConfig';
import { Contract, providers } from 'ethers';
import { parseAbiItem } from 'viem'
import { getEthersProvider } from 'utils';


function ContractEvents() {
    async function getLogs() {

        
    const contract = getContract({
        address: '0xD49f72B04B13666C2cd1b605fdA4b7E7E0074191',
        abi: termAbi,
      })
      const logs = await contract.getEvents.LoanBorrow({ fromBlock: BigInt(20), toBlock: 
        BigInt(4514265)
        })


   

    //   const logs3= await config.publicClient.getLogs({
    //     address: '0xD49f72B04B13666C2cd1b605fdA4b7E7E0074191',
    //     event: parseAbiItem('event LoanBorrow(uint256 indexed when, bytes32 indexed loanId, address indexed borrower, uint256 collateralAmount, uint256 borrowAmount)'),
    //     fromBlock: BigInt(20),
    //     toBlock: BigInt(4514265)
    //     })

        const logs4 = await config.webSocketPublicClient.getLogs({
            address: '0xD49f72B04B13666C2cd1b605fdA4b7E7E0074191',
            event: { 
                type: 'event',
                name: 'LoanBorrow', 
                inputs: [
                    { type: 'uint256', indexed: true, name: 'when' },
                    { type: 'bytes32', indexed: true, name: 'loanId' },
                    { type: 'address', indexed: true, name: 'borrower' },
                    { type: 'uint256', indexed: false, name: 'collateralAmount' },
                    { type: 'uint256', indexed: false, name: 'borrowAmount' }
                ]
            },
            fromBlock: BigInt(20),
            toBlock: BigInt(4514265)
          })

       const logs2=await config.getPublicClient().getLogs({
            address: '0xD49f72B04B13666C2cd1b605fdA4b7E7E0074191',
            event: { 
                type: 'event',
                name: 'LoanBorrow', 
                inputs: [
                    { type: 'uint256', indexed: true, name: 'when' },
                    { type: 'bytes32', indexed: true, name: 'loanId' },
                    { type: 'address', indexed: true, name: 'borrower' },
                    { type: 'uint256', indexed: false, name: 'collateralAmount' },
                    { type: 'uint256', indexed: false, name: 'borrowAmount' }
                ]
            },
            fromBlock: BigInt(20),
            toBlock: BigInt(4514265)
          })
         

      console.log(logs,"logs")
      console.log(logs2,"logs2")
        // console.log(logs3,"logs3")
        console.log(logs4,"logs4")
    }

    
    
     const contract2 = new Contract('0xD49f72B04B13666C2cd1b605fdA4b7E7E0074191', termAbi, getEthersProvider());
    console.log(contract2,"contract2")
    async function getPastEvents() {
        const fromBlock = 0; // Par exemple
        const toBlock = 4514265;
    
        // Supposons que votre contrat ait un événement appelé "Borrow"
        const eventName = contract2.filters.LoanBorrow();
        const logs = await contract2.queryFilter(eventName, fromBlock, toBlock);
        console.log(logs,"logs22")
        for (let log of logs) {
            const parsedLog = contract2.interface.parseLog(log);
            console.log(parsedLog,"parsedLog");
        }
    }


 getPastEvents()
    getLogs()
  return (
    <div>ContractEvents</div>
  )
}

export default ContractEvents