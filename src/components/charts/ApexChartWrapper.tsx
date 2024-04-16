import { useEffect, useState } from 'react';

export const ApexChartWrapper = (props) => {
  const [ReactApexChart, setChart] = useState<any>();

  //prevent issue with window not defined
  useEffect(() => {
    import('react-apexcharts').then((mod) => {
      setChart(() => mod.default);
    });
  }, []);

  return ReactApexChart && <ReactApexChart {...props} />;
};
