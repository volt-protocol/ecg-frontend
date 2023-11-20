/* eslint-disable */

import { HiX } from 'react-icons/hi';
import Links from './components/Links';
import clsx from 'clsx';

import { IRoute } from 'types/navigation';
import DropdownSelect from 'components/select/dropdown-select';
import ethereumLogo from '/public/img/ethereum-logo.svg'

const markets = [
  {
    id: 1,
    name: 'USDC Market',
    avatar: ethereumLogo
  },
]

function SidebarHorizon(props: { routes: IRoute[]; [x: string]: any }) {
  const { routes, open, setOpen } = props;
  return (
    <div
      className={clsx("sm:none fixed !z-50 flex min-h-full flex-col bg-white pb-10 shadow-2xl shadow-white/5 dark:!bg-navy-800 dark:text-white md:!z-50 lg:!z-50 xl:!z-0",
        open ? 'translate-x-0 transiton-all ease-linear duration-150' : '-translate-x-96 xl:translate-x-0 transiton-all ease-linear duration-150'
      )}
    >
      <span
        className="absolute right-4 top-4 block cursor-pointer xl:hidden"
        onClick={() => setOpen(false)}
      >
        <HiX />
      </span>

      <div className={`mx-10 mt-5 flex flex-col items-center justify-center`}>
        <div className="font-poppins text-[26px] font-bold uppercase text-gray-800 dark:text-white">
          Credit <span className="font-medium">Guild</span>
        </div>
        <div className='w-full mt-2 px-1'>
          <DropdownSelect
              data={markets} 
          />
        </div>
      </div>
      <div className="my-5 h-px bg-gray-200 dark:bg-white/30" />
      {/* Nav item */}

      <ul className="mb-auto pt-1">
        <Links routes={routes} />
      </ul>

      {/* Free Horizon Card */}
      {/* <div className="flex justify-center">
        <SidebarCard />
      </div> */}

      {/* Nav item end */}
    </div>
  );
}

export default SidebarHorizon;
