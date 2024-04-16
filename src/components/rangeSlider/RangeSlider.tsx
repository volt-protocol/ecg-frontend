import { Switch } from '@headlessui/react';
import clsx from 'clsx';

export const RangeSlider = ({
  title,
  value,
  onChange,
  step,
  min,
  max,
  withSwitch,
  show,
  setShow
}: {
  title: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  withSwitch?: boolean;
  show?: boolean;
  setShow?: (value: boolean) => void;
}) => {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</label>
        {withSwitch && (
          <Switch
            checked={show}
            onChange={setShow}
            className={clsx(
              show ? 'bg-brand-500' : 'bg-gray-200',
              'border-transparent relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out'
            )}
          >
            <span
              aria-hidden="true"
              className={clsx(
                show ? 'translate-x-5' : 'translate-x-0',
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
              )}
            />
          </Switch>
        )}
      </div>
      {/* <div
        className="w-fit rounded-md bg-gray-700 px-2 py-1 text-xs text-gray-200 shadow-sm"
        style={{
          position: "absolute",
          left: `${(value / 50) * 100}%`,
          transform: "translateX(0%)",
          marginTop: "-30px",
        }}
      >
        {value}
      </div> */}
      {withSwitch ? (
        show ? (
          <input
            id="range"
            type="range"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="block w-full rounded-md bg-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          />
        ) : null
      ) : (
        <input
          id="range"
          type="range"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="block w-full rounded-md bg-gray-300 text-gray-700  dark:bg-gray-800 dark:text-gray-300"
        />
      )}
      <style>
        {`
        input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: #14B8A6;
  cursor: pointer;
}
input[type="range"]::-webkit-slider-runnable-track {
  background: #dfdfdf;
  height: 5px;
}
                        /***** Track Styles *****/
/***** Chrome, Safari, Opera, and Edge Chromium *****/
input[type="range"]::-webkit-slider-runnable-track {
  background: #dfdfdf;
  height: 5px;
}

/******** Firefox ********/
input[type="range"]::-moz-range-track {
  background: #dfdfdf;
  height: 5px;
}
input[type="range"]::-webkit-slider-thumb {
   -webkit-appearance: none; /* Override default look */
   appearance: none;
   margin-top: -4px; /* Centers thumb on the track */
   background-color: #14B8A6;
   height: 0.8rem;
   width: 0.5rem;    
}
/***** Firefox *****/
input[type="range"]::-moz-range-thumb {
    border: none; /*Removes extra border that FF applies*/
    border-radius: 0; /*Removes default border-radius that FF applies*/
   background-color: #14B8A6;
   height: 0.8rem;
   width: 0.5rem;  
}
`}
      </style>
    </div>
  );
};
