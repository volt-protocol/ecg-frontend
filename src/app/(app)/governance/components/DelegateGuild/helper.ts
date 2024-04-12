import { Address, formatUnits, isAddress } from 'viem';

export const getTitleDisabled = (value: number, addressValue: Address | undefined, guildNotUsed: bigint) => {
  if (!addressValue || !isAddress(addressValue)) {
    return 'Enter Delegatee address';
  }
  if (!value || value <= 0) {
    return 'Enter GUILD amount';
  }
  if (value > Number(formatUnits(guildNotUsed, 18))) {
    return 'Insufficient GUILD balance';
  }
};

export const style = {
  content: `w-full rounded-md text-gray-700 dark:text-white`,
  formHeader: `px-2 flex items-center justify-between  text-lg`,
  transferPropContainer: `bg-transparent my-3 rounded-md p-4 text-lg border dark:border-white hover:border-[#41444F]  flex justify-between items-center`,
  transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none w-full text-lg  `,
  currencySelector: `flex w-2/4 justify-end `,
  currencySelectorContent: ` w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-md text-lg font-medium cursor-pointer p-2 mt-[-0.2rem]`,
  currencySelectorIcon: `flex items-center`,
  currencySelectorTicker: `mx-2`,
  currencySelectorArrow: `text-lg`,
  confirmButton: `mt-4 mb-2 rounded-md py-4 px-8 text-lg font-semibold flex items-center justify-center cursor-pointer w-full disabled:bg-gray-300 disabled:text-gray-700 disabled:cursor-not-allowed text-white bg-brand-500 hover:bg-brand-400 dark:disabled:bg-navy-900 dark:disabled:text-navy-400 transition-all ease-in-out duration-150`
};

// const style = {
// wrapper: `w-screen flex items-center justify-center mt-14 `,
// content: `bg-transparent w-full   rounded-2xl  text-black dark:text-white`,
// formHeader: `px-2 flex items-center justify-between font-semibold text-xl`,
// transferPropContainer: `border-[#41444F] bg-transparent my-3 rounded-2xl p-4 text-xl border dark:border-white hover:border-[#41444F]  flex justify-between items-center`,
// transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none w-full text-2xl  `,
// currencySelector: `flex w-2/4 justify-end `,
// currencySelectorContent: ` w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-2xl text-xl font-medium cursor-pointer p-2 mt-[-0.2rem]`,
// currencySelectorIcon: `flex items-center`,
// currencySelectorTicker: `mx-2`,
// currencySelectorArrow: `text-lg`,
// confirmButton: ` w-full bg-purple my-2 rounded-2xl py-4 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border border-purple hover:border-[#234169]  ${
//     value > notUsed ||
//     value <= 0 ||
//     value == undefined ||
//     isAddress(addressValue) === false
//     ? "bg-gray-400  text-gray-700 !cursor-default"
//     : "bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500  text-white"
// }  `,
// };
