import React, { Dispatch, SetStateAction, useEffect } from "react";
import { Step } from "./stepType";
import { Spinner } from "flowbite-react";

function StepModal({
  steps,
  close,
  initialStep,
  setSteps,
}: {
  steps: Step[];
  close: Dispatch<SetStateAction<boolean>>;
  initialStep: () => Step[];
  setSteps: Dispatch<SetStateAction<Step[]>>;
}) {
  const [showCloseButton, setShowCloseButton] = React.useState(false);

  useEffect(() => {
    const hasError = steps.some((step) =>
      step.status.toLowerCase().includes("error")
    );
    const allSuccess = steps.every((step) => step.status === "Success");
    if (hasError || allSuccess) {
      setShowCloseButton(true);
    }
  }, [steps]);

  const handleClose = () => {
    if (showCloseButton) {
      setSteps(initialStep());
      close(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center text-black">
      <div
        className="fixed inset-0 bg-black opacity-50 backdrop-blur-md"
        onClick={handleClose}
      ></div>
      <div className="z-10 w-100 h-auto rounded-lg bg-white p-6 shadow-lg  dark:bg-navy-800 dark:text-white">
        <h2 className="mb-4 text-lg font-semibold ">Processing</h2>
        <div className="flex flex-col space-y-4">
          {steps.map((step, index) => (
            <div key={step.name} className="flex items-center">
              {step.status === "In Progress" && (
                <Spinner
                  aria-label="Purple spinner example"
                  color="purple"
                  className="relative h-8 w-8"
                />
              )}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full  ${
                  step.status === "In Progress" ? "absolute" : ""
                }  ${
                  step.status.toLowerCase().includes("success")
                    ? "border-purple-500 bg-purple-500"
                    : step.status.toLowerCase().includes("error")
                    ? "border-red-500 bg-red-500"
                    : ""
                }`}
              >
                {index + 1}
              </div>

              <div className="ml-4">
                <h3>{step.name}</h3>
                <p className="text-sm text-gray-500">{step.status}</p>
              </div>
            </div>
          ))}
        </div>

        {showCloseButton && (
          <div className="flex w-full justify-end">
            <button
              onClick={handleClose}
              className="   rounded-md  bg-gradient-to-br from-[#868CFF] via-[#432CF3] to-brand-500 px-4 py-2 text-white"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StepModal;
