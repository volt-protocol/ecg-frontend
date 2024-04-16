import clsx from 'clsx';
import { MdCancel } from 'react-icons/md';

export const ErrorMessage = ({
  title,
  message,
  variant
}: {
  title: string;
  message?: string;
  variant: 'error' | 'warning' | 'info' | 'success';
}) => {
  if (!title) return null;

  return (
    <div className="rounded-md bg-red-50 px-4 py-2">
      <div className="flex">
        <div className="flex-shrink-0">
          {variant === 'error' && <MdCancel className={clsx('h-5 w-5 text-red-400')} aria-hidden="true" />}
        </div>
        <div className="ml-3">
          <h3 className={clsx('text-sm', variant === 'error' && message ? 'font-medium text-red-800' : 'text-red-700')}>
            {title}
          </h3>
          {message && <div className={clsx('mt-2 text-sm', variant === 'error' && 'text-red-700')}>{message}</div>}
        </div>
      </div>
    </div>
  );
};
