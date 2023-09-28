import { Address, signTypedData } from '@wagmi/core';
import Web3, { Bytes } from 'web3';
import { splitSignature } from '@ethersproject/bytes';

function secondsToAppropriateUnit(seconds: number): string {
  // Convertir en minutes, heures, jours, semaines et mois
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;
  const weeks = days / 7;
  const months = days / 30;

  // Déterminer l'unité appropriée pour représenter la durée
  if (months >= 1) return `${Math.round(months)}m`;
  if (weeks >= 1) return `${Math.round(weeks)}w`;
  if (days >= 1) return `${Math.round(days)}d`;
  if (hours >= 1) return `${Math.round(hours)}h`;
  return `${Math.round(minutes)}min`;
}

function formatCurrencyValue(value: number): string {
  if (value === undefined) {
    // Gérez l'erreur ou retournez une valeur par défaut
    console.error("La valeur est undefined");
    return "";
}
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toString();
}

function DecimalToUnit(number:bigint, decimals:number):number {
  const divider = BigInt(Math.pow(10, decimals));
  return Number(number / divider) ;
}

function UnitToDecimal(number: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return number * multiplier;
}

async function signTransferPermit(value :number) {
  const SECOND = 1000;


const fromAddress: ContractAddress = "0xaC7EA9f186f0A2f6C2AE03B89a93d6E086A2f8c4";
const expiry = Math.trunc((Date.now() + 120 * SECOND) / SECOND); // converti en bigint
const nonce  = 0; // directement défini en tant que bigint
const spender: ContractAddress = "0x4489Ec48a7Cf019Aad98934B3dA802146345995A";

type ContractAddress = `0x${string}`;


const domain = {
    // fields    :  "0x0f",
    name   : "Ethereum Credit Guild - CREDIT",
    // version    :  "1",
    chainId    :  11155111,
    verifyingContract  :  "0x91f0ED4A515b1B90eb13974eA05D26605c046A3A",
    // salt  :  "0x0000000000000000000000000000000000000000000000000000000000000000" 
} as const;


// EIP2612_
const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
} as const;

const message = {
  owner: fromAddress,
    spender: spender,
    value:BigInt(UnitToDecimal(value,18)),
    nonce: BigInt(nonce),
    deadline: BigInt(expiry)
} as const;

const signature = await signTypedData({
   account: fromAddress,
    domain:domain,
    types,
    primaryType: 'Permit',
    message,
});



const r = await signature.slice(0, 66);
const s = await '0x' + signature.slice(66, 130);
const v = await Number('0x' + signature.slice(130, 132));

console.log(r,"r",s,"s",v,"v")
console.log(splitSignature(signature),"signature")
console.log(message,"message")
console.log(expiry,"expiry")

return {
  r:r,
  s:s,
  v:v,
  deadline:expiry
};

}


export {
  secondsToAppropriateUnit,
  formatCurrencyValue,
  DecimalToUnit,
  UnitToDecimal,
  signTransferPermit
  
};
