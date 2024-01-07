const Progress = (props: {
  value: number;
  color?:
    | "red"
    | "blue"
    | "green"
    | "yellow"
    | "orange"
    | "teal"
    | "navy"
    | "lime"
    | "cyan"
    | "pink"
    | "purple"
    | "amber"
    | "indigo"
    | "gray";
  width?: string;
}) => {
  const { value, color, width } = props;

  const getColor = (value) => {
    if (value >= 95) return "bg-red-500 dark:bg-red-400";
    if (value >= 70) return "bg-orange-500 dark:bg-orange-400";
    return "bg-green-500 dark:bg-green-400";
  }

  return (
    <div
      className={`h-2 ${
        width ? width : "w-full"
      } rounded-full bg-gray-200 dark:bg-navy-700`}
    >
      <div
        className={`flex h-full items-center justify-center rounded-full ${getColor(value)}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

export default Progress;
