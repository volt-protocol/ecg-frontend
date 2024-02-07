import { MdOpenInNew, MdOutlineArticle } from "react-icons/md"
import { shortenUint } from "utils/strings"

export const ItemIdBadge = ({ id }: { id: string }) => {
  return (
    <div className="w-fit rounded-md bg-gray-100 px-2 py-0.5 ring-1 ring-inset ring-gray-200 dark:bg-navy-600 dark:ring-navy-500 ">
      <span className="flex items-center font-mono text-sm font-medium text-gray-600 transition-all duration-150 ease-in-out dark:text-gray-200">
        {shortenUint(id)}
      </span>
    </div>
  )
}
