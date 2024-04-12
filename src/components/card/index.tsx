import clsx from 'clsx';

function Card(props: {
  variant?: string;
  title?: string;
  rightText?: JSX.Element | string;
  extra?: string;
  children?: JSX.Element | any[];
  [x: string]: any;
}) {
  const { variant, title, rightText, extra, children, ...rest } = props;
  return (
    <div
      className={clsx(
        '!z-5 relative flex flex-col rounded-md border border-gray-100/80 bg-white bg-clip-border shadow-3xl dark:border-navy-900',
        props.default ? 'shadow-shadow-500 dark:shadow-none' : 'shadow-shadow-100 dark:shadow-none',
        `dark:!bg-navy-800 dark:text-white  ${extra}`
      )}
      {...rest}
    >
      {(title || rightText) && (
        <div className=" flex flex-wrap items-center justify-between sm:flex-nowrap">
          <h3 className="text-xl font-medium text-gray-800 dark:text-white ">{title}</h3>
          {rightText}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
