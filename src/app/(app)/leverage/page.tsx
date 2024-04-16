'use client';

import Card from 'components/card';
import CurrentPosition from './components/CurrentPositions';
import CreatePosition from './components/CreatePosition';
import Chart from './components/Chart';

function Leverage() {
  return (
    <div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="order-1 w-full gap-5 md:col-span-2">
          <div className="flex flex-col gap-5">
            <Card extra="h-[500px] px-6 py-4" title="Chart">
              <Chart />
            </Card>
            <Card extra="w-full px-6 py-4" title="Current Positions">
              <CurrentPosition />
            </Card>
          </div>
        </div>
        <div className="order-2 w-full md:col-span-1">
          <Card extra="px-6 py-4 " title="Open New Position">
            <CreatePosition />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Leverage;
