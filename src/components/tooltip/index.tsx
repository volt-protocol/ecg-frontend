import { Tooltip } from "@chakra-ui/tooltip";
import { AiOutlineQuestionCircle } from "react-icons/ai";

export const TooltipHorizon = (props: {
  extra: string;
  trigger: JSX.Element;
  content: JSX.Element;
  placement: "left" | "right" | "top" | "bottom";
}) => {
  const { extra, trigger, content, placement } = props;
  return (
    <Tooltip
      placement={placement}
      label={content}
      className={`w-max rounded-md text-gray-800 bg-white py-3 px-4 text-sm border border-gray-200/80 dark:border-navy-600 shadow-md shadow-shadow-500 dark:!bg-navy-700 dark:shadow-none ${extra}`}
    >
      {trigger}
    </Tooltip>
  );
};

export const QuestionMarkIcon = (): JSX.Element => {
  return <AiOutlineQuestionCircle className="text-gray-500 dark:text-gray-100" />
}
