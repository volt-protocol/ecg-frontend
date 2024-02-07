import clsx from "clsx"
import { MdError, MdInfo, MdWarning } from "react-icons/md"

export const AlertMessage = ({
  message,
  type,
}: {
  message: JSX.Element
  type: "danger" | "warning" | "success" | 'info'
}) => {
  return (
    <div
      className={clsx(
        "my-1 flex items-center justify-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
        type == "danger"
          ? "bg-red-100 text-red-500/90 dark:bg-red-100/0 dark:text-red-500"
          : "",
        type == "warning"
          ? "bg-amber-100 text-amber-500/90 dark:bg-amber-100/0 dark:text-amber-500"
          : "",
        type == "info"
          ? "bg-cyan-100 text-cyan-500/90 dark:bg-cyan-100/0 dark:text-cyan-500"
          : "",
          'w-full'
      )}
    >
      {type == "danger" && <MdError className="h-6 w-6" />}
      {type == "warning" && <MdWarning className="h-6 w-6" />}
      {type == "info" && <MdInfo className="h-6 w-6" />}
      {message}
    </div>
  )
}
