const Progress = (props: {
  value: number;
  width?: string;
  useColors: boolean;
}) => {
  const { value, width, useColors } = props;

  const getColor = (value) => {
    if(!useColors) return "bg-green-400 dark:bg-green-400"

    if (value >= 95) return "bg-red-400 dark:bg-red-400";
    if (value >= 70) return "bg-orange-400 dark:bg-orange-400";
    return "bg-green-400 dark:bg-green-400";
  }

  return (
    <div
      className={`h-[10px] ${
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
