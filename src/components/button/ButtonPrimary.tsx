import clsx from "clsx"

export default function ButtonPrimary({
  type = "button",
  title,
  onClick,
  variant = "md",
  disabled,
  titleDisabled,
  extra,
}: {
  type?: "submit" | "button"
  title: string
  titleDisabled?: string
  onClick?: () => void
  variant?: "xs" | "sm" | "md" | "lg" | "xl"
  extra?: string
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      type={type}
      onClick={onClick}
      className={clsx(
        variant === "xs" && "px-2 py-1 text-sm",
        variant === "md" && "px-4 py-2",
        variant === "lg" && "px-6 py-3 text-lg",
        extra,
        "flex cursor-pointer items-center justify-center rounded-md bg-brand-500 font-semibold text-white transition-all duration-150 ease-in-out hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-stone-200/80 disabled:text-stone-400 dark:disabled:bg-navy-600/30 dark:disabled:text-navy-400"
      )}
    >
      {disabled && titleDisabled ? titleDisabled : title}
    </button>
  )
}
