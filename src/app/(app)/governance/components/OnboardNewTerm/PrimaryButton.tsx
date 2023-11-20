import clsx from "clsx"

export default function PrimaryButton({
    title,
    onClick,
    variant = 'md'
} : {
    title: string,
    onClick: () => void,
    variant?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}) {
    return (
      <button
        onClick={onClick}
        type="button"
        className={clsx(
          variant === 'xs' && 'py-1 px-2 text-sm',
          variant === 'md' && 'py-1.5 px-4',
          "rounded-md  flex items-center font-semibold justify-center cursor-pointer disabled:bg-gray-300 disabled:text-gray-700 disabled:cursor-not-allowed text-white bg-brand-500 hover:bg-brand-400 dark:disabled:bg-navy-900 dark:disabled:text-navy-400 transition-all ease-in-out duration-150"
        )}
      >
        {title}
      </button>
    )
}