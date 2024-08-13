import clsx from 'clsx';

export default function PrimaryButton({
  title,
  onClick,
  variant = 'md'
}: {
  title: string;
  onClick: () => void;
  variant?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={clsx(
        variant === 'xs' && 'px-2 py-1 text-sm',
        variant === 'md' && 'px-4 py-1.5',
        'flex  cursor-pointer items-center justify-center rounded-md bg-brand-500 font-semibold text-white transition-all duration-150 ease-in-out hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 dark:disabled:bg-navy-900 dark:disabled:text-navy-400'
      )}
    >
      {title}
    </button>
  );
}
