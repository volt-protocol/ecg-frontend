import { ReactJSXElement } from "@emotion/react/types/jsx-namespace"
import Card from "components/card"

const Widget = (props: {
  icon: JSX.Element
  title: string
  subtitle: string | number
  extra?: ReactJSXElement
}) => {
  const { icon, title, subtitle, extra } = props
  return (
    <Card extra="!flex-row flex-grow items-center rounded-[20px] px-3 py-2 gap-2">
      <div className="flex h-[90px] w-auto flex-row items-center">
        <div className="rounded-full bg-lightPrimary p-3 dark:bg-navy-700">
          <span className="flex items-center text-brand-500 ">{icon}</span>
        </div>
      </div>

      <div className="h-50 flex w-auto flex-col justify-center">
        <p className="font-dm font-semilight text-sm text-gray-600 dark:text-gray-200">
          {title}
        </p>
        <div className="flex flex-row items-center space-x-1">
          <h4 className="text-xl font-bold text-gray-700 dark:text-white">{subtitle}</h4>
          {extra}
        </div>
      </div>
    </Card>
  )
}

export default Widget
