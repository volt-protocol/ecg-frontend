import React, { Dispatch, SetStateAction, useEffect } from 'react';
import { Step } from './stepType';
import Spinner from 'components/spinner';
import { camelCasetoString } from 'utils/strings';

function StepModal({
  steps,
  close,
  initialStep,
  setSteps
}: {
  steps: Step[];
  close: Dispatch<SetStateAction<boolean>>;
  initialStep?: () => Step[];
  setSteps: Dispatch<SetStateAction<Step[]>>;
}) {
  const [showCloseButton, setShowCloseButton] = React.useState(false);

  useEffect(() => {
    const hasError = steps.some((step) => step.status.toLowerCase().includes('error'));
    const allSuccess = steps.every((step) => step.status === 'Success');
    if (hasError || allSuccess) {
      setShowCloseButton(true);
    }
  }, [steps]);

  const handleClose = () => {
    if (showCloseButton) {
      initialStep && setSteps(initialStep());
      close(false);
    }
  };

  return (
    <div className="text-black fixed inset-0 z-[100] flex items-center justify-center bg-gray-500 bg-opacity-75 transition-opacity dark:bg-navy-900/90">
      <div className="bg-black fixed inset-0 opacity-50 " onClick={handleClose}></div>
      <div className="z-10 h-auto min-w-[400px] rounded-lg bg-white p-6 shadow-lg dark:bg-navy-800 dark:text-white dark:ring-1 dark:ring-navy-700">
        <h2 className="mb-4 text-lg font-semibold ">Processing</h2>
        <div className="flex flex-col space-y-4">
          {steps.map((step, index) => (
            <div key={step.name} className="flex items-center">
              {step.status === 'In Progress' && <Spinner />}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${
                  step.status === 'In Progress' ? 'absolute' : ''
                }  ${
                  step.status.toLowerCase().includes('success')
                    ? 'border-brand-500 bg-brand-500'
                    : step.status.toLowerCase().includes('error')
                    ? 'border-red-500 bg-red-500'
                    : ''
                }`}
              >
                {index + 1}
              </div>

              <div className="ml-4">
                <h3>{step.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">{step.status}</p>
                <div className="mt-2">
                  <ul>
                    {step.description &&
                      step.description.map((item, index) => (
                        <li key={index} className="list-inside list-disc text-sm text-gray-500 dark:text-gray-300">
                          {item.functionName == 'callExternal'
                            ? camelCasetoString(item.functionName) +
                              ' -> ' +
                              camelCasetoString(item.args[1].functionName)
                            : camelCasetoString(item.functionName)}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showCloseButton && (
          <div className="flex">
            <button
              onClick={handleClose}
              className="mt-4 w-full rounded-md bg-gray-100 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out hover:ring-gray-300 dark:bg-navy-700 dark:ring-navy-600"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StepModal;
