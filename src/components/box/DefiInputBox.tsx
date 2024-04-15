import clsx from 'clsx';
import ImageWithFallback from 'components/image/ImageWithFallback';
import { Address } from 'viem';

export default function DefiInputBox({
  disabled = false,
  topLabel,
  placeholder,
  inputSize,
  pattern,
  value,
  onChange,
  leftLabel,
  rightLabel,
  currencyLogo,
  currencyLogoStyle,
  currencySymbol,
  ref
}: {
  disabled?: boolean;
  topLabel: string;
  placeholder: string;
  inputSize: string;
  pattern: string;
  value: string | number | Address;
  onChange?: any;
  leftLabel?: JSX.Element;
  rightLabel?: JSX.Element;
  currencyLogo?: string;
  currencyLogoStyle?: any;
  currencySymbol?: string;
  ref?: any;
}) {
  return (
    <div className="relative w-full rounded-xl bg-brand-100/50 dark:bg-navy-700">
      <div className="mb-1 px-5 pt-4 text-sm font-medium text-gray-700 dark:text-gray-300">{topLabel}</div>
      <div className="flex items-center justify-between px-5">
        <input
          ref={ref}
          disabled={disabled}
          onChange={onChange}
          value={value}
          className={clsx(
            inputSize,
            'block max-w-[70%] border-gray-300 bg-brand-100/0 text-gray-800 transition-all duration-150 ease-in-out placeholder:text-gray-400 focus:border-brand-400/80 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-50 sm:leading-6'
          )}
          placeholder={placeholder}
          pattern={pattern}
        />
        {currencyLogo && currencySymbol && (
          <div className="flex items-center gap-2" title={currencySymbol}>
            <ImageWithFallback
              src={currencyLogo}
              fallbackSrc="/img/crypto-logos/unk.png"
              style={currencyLogoStyle || {}}
              width={32}
              height={32}
              alt="logo"
            />
            <span className="hidden font-medium text-gray-800 dark:text-gray-100" style={{ whiteSpace: 'nowrap' }}>
              {currencySymbol}
            </span>
          </div>
        )}
      </div>
      <div className="mt-1 gap-1 overflow-auto px-5 pb-4">
        <span style={{ float: 'left' }}>{leftLabel}</span>
        <span style={{ float: 'right' }}>{rightLabel}</span>
      </div>
    </div>
  );
}
