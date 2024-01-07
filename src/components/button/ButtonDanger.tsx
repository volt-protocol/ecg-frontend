import clsx from "clsx"

export default function ButtonDanger({
  title,
  onClick,
  variant = "md",
}: {
  title: string
  onClick: () => void
  variant?: "xs" | "sm" | "md" | "lg" | "xl"
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={clsx(
        variant === "xs" && "px-2 py-1 text-sm",
        variant === "md" && "px-4 py-1.5",
        "flex cursor-pointer items-center justify-center rounded-md bg-red-400/90 font-semibold text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-red-400/80 disabled:cursor-not-allowed dark:bg-red-900/60 dark:hover:bg-red-900/80 disabled:bg-gray-300 disabled:text-gray-700 dark:disabled:bg-navy-900 dark:disabled:text-navy-400"
      )}
    >
      {title}
    </button>
  )
}
