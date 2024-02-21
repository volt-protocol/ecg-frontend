import { useState } from "react"
import { MdContentCopy } from "react-icons/md"
import { shortenUint } from "utils/strings"

export const ItemIdBadge = ({ id }: { id: string }) => {
  const [isCopied, setIsCopied] = useState<boolean>(false)

  const copyTextToClipboard = async (text: string) => {
    if ("clipboard" in navigator) {
      return await navigator.clipboard.writeText(text)
    } else {
      return document.execCommand("copy", true, text)
    }
  }

  const handleCopyClick = () => {
    // Asynchronously call copyTextToClipboard
    copyTextToClipboard(id)
      .then(() => {
        // If successful, update the isCopied state value
        setIsCopied(true)
        setTimeout(() => {
          setIsCopied(false)
        }, 1500)
      })
      .catch((err) => {
        console.log(err)
      })
  }

  return (
    <div
      className="w-fit rounded-md bg-gray-100 px-2 py-0.5 ring-1 ring-inset ring-gray-200 dark:bg-navy-600 dark:ring-navy-500"
      onClick={handleCopyClick}
    >
      <span className="flex items-center gap-1 font-mono text-sm font-medium text-gray-600 transition-all duration-150 ease-in-out hover:text-brand-500 dark:text-gray-200">
        {isCopied ? "Copied!" : shortenUint(id)}
        <MdContentCopy />
      </span>
    </div>
  )
}
