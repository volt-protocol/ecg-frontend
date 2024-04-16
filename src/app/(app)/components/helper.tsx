import { ChartTimeline } from 'types/charts';
import clsx from 'clsx';
import moment from 'moment';

export const getTimelineButton = ({
  timeline,
  updateData
}: {
  timeline: ChartTimeline;
  updateData: (timeline: ChartTimeline) => void;
}) => {
  return (
    <div className="toolbar">
      <button
        id="one_week"
        onClick={() => updateData('one_week')}
        className={clsx(
          timeline === 'one_week'
            ? 'active bg-brand-400 font-medium text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          'm-1 rounded-md px-2 py-0.5'
        )}
      >
        1W
      </button>

      <button
        id="one_month"
        onClick={() => updateData('one_month')}
        className={clsx(
          timeline === 'one_month'
            ? 'active bg-brand-400 font-medium text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          'm-1 rounded-md px-2 py-0.5'
        )}
      >
        1M
      </button>

      <button
        id="ytd"
        onClick={() => updateData('ytd')}
        className={clsx(
          timeline === 'ytd'
            ? 'active bg-brand-400 font-medium text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          'm-1 rounded-md px-2 py-0.5'
        )}
      >
        YTD
      </button>

      <button
        id="one_year"
        onClick={() => updateData('one_year')}
        className={clsx(
          timeline === 'one_year'
            ? 'active bg-brand-400 font-medium text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          'm-1 rounded-md px-2 py-0.5'
        )}
      >
        1Y
      </button>

      <button
        id="all"
        onClick={() => updateData('all')}
        className={clsx(
          timeline === 'all'
            ? 'active bg-brand-400 font-medium text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          'm-1 rounded-md px-2 py-0.5'
        )}
      >
        ALL
      </button>
    </div>
  );
};

export const getDateFrom = (timeline: ChartTimeline, chartData: any) => {
  let dateStart: number;

  switch (timeline) {
    case 'one_week':
      dateStart = moment().subtract(1, 'weeks').toDate().getTime();
      break;
    case 'one_month':
      dateStart = moment().subtract(1, 'months').toDate().getTime();
      break;
    case 'one_year':
      dateStart = moment().subtract(1, 'years').toDate().getTime();

      break;
    case 'ytd':
      dateStart = moment().startOf('year').toDate().getTime();
      break;
    case 'all':
      dateStart = moment(chartData.options.xaxis.categories[0]).toDate().getTime();

      break;
    default:
  }

  return dateStart;
};
