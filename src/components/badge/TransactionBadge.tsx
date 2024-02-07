import { MdOpenInNew, MdOutlineArticle } from "react-icons/md"
import { shortenUint } from "utils/strings"

export const TransactionBadge = ({ txHash }: { txHash: string }) => {
  return (
    <div className="w-fit rounded-md bg-gray-100 px-1 py-0.5 ring-1 ring-inset ring-gray-200 dark:bg-navy-600 dark:ring-navy-500 ">
      <a
        className="flex items-center gap-1 font-mono text-sm text-gray-700 transition-all duration-150 ease-in-out hover:text-brand-500 dark:text-gray-200 dark:hover:text-brand-400"
        href={process.env.NEXT_PUBLIC_ETHERSCAN_BASE_URL_TX + "/" + txHash}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MdOutlineArticle />
        {shortenUint(txHash)}
        <MdOpenInNew />
      </a>
    </div>
  )
}
