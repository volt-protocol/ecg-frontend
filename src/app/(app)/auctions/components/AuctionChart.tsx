'use client';

import { ApexChartWrapper } from 'components/charts/ApexChartWrapper';
import { Auction, AuctionHouse } from '../../../../store/slices/auctions';
import { useAppStore, useUserPrefsStore } from 'store';
import { formatDecimal } from 'utils/numbers';
import moment from 'moment';

export function AuctionChart({
  auctionHouse,
  auction
}: {
  auctionHouse: AuctionHouse | null;
  auction: Auction | null;
}) {
  const { coinDetails, contractsList } = useAppStore();
  const { appMarketId, appChainId } = useUserPrefsStore();
  if (!auction || !auctionHouse) return null;
  const collateralToken = coinDetails.find(
    (item) => item.address.toLowerCase() === auction.collateralTokenAddress.toLowerCase()
  );
  const collateralTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(collateralToken.price * 100)), 0);
  const pegToken = coinDetails.find(
    (item) => item.address.toLowerCase() === contractsList?.marketContracts[appMarketId].pegTokenAddress.toLowerCase()
  );
  const pegTokenSymbol = pegToken?.symbol;
  const pegTokenDecimalsToDisplay = Math.max(Math.ceil(Math.log10(pegToken.price * 100)), 0);
  const creditMultiplier = Number(auction.callCreditMultiplier) / 1e18;

  const duration = auctionHouse.duration * 1000;
  const midPoint = auctionHouse.midPoint * 1000;
  const startTime = auction.startTime - duration * 0.2;
  const endTime = auction.startTime + duration * 1.2;
  const maxDebt = (creditMultiplier * Number(auction.callDebt)) / 1e18;
  const maxCollateral = Number(auction.collateralAmount) / 10 ** collateralToken.decimals;
  const steps = 200;

  const xData = [];
  const debtData = [];
  const collData = [];
  for (var t = startTime; t <= endTime; t += (endTime - startTime) / steps) {
    xData.push(t);
    if (t <= auction.startTime) {
      debtData.push([t, maxDebt]);
      collData.push([t, 0]);
    } else if (t >= auction.startTime + duration) {
      debtData.push([t, 0]);
      collData.push([t, maxCollateral]);
    } else if (t <= auction.startTime + midPoint) {
      // 1st phase
      const progress = (t - auction.startTime) / midPoint;
      debtData.push([t, maxDebt]);
      collData.push([t, maxCollateral * progress]);
    } else {
      // 2nd phase
      const progress = (t - (auction.startTime + midPoint)) / (duration - midPoint);
      debtData.push([t, maxDebt - maxDebt * progress]);
      collData.push([t, maxCollateral]);
    }
  }

  const annotations = [];
  // annotation for bid
  if (auction.bidTxHash) {
    annotations.push({
      x: auction.endTime,
      borderColor: '#FF5722',
      label: {
        style: {
          color: '#FF5722',
          borderColor: '#FF5722'
        },
        text: 'Bid'
      }
    });
  }
  // annotation for now
  if (startTime < Date.now() && endTime > Date.now()) {
    annotations.push({
      x: Date.now(),
      borderColor: '#673AB7',
      label: {
        style: {
          color: '#673AB7',
          borderColor: '#673AB7'
        },
        orientation: 'horizontal',
        text: 'Now'
      }
    });
  }
  // point annotation for market price
  const collateralValue = (Number(auction.collateralAmount) / 10 ** collateralToken.decimals) * collateralToken.price;
  const debtValue =
    (((Number(auction.callDebt) / 1e18) * Number(auction.callCreditMultiplier)) / 1e18) * pegToken.price;
  let marketPriceX;
  let marketPriceY;
  if (collateralValue > debtValue) {
    // market price during 1st phase
    const percentCollateralToOffer = debtValue / collateralValue;
    marketPriceX = auction.startTime + percentCollateralToOffer * midPoint;
    marketPriceY = percentCollateralToOffer * maxDebt;
  } else {
    const percentDebtToRepay = collateralValue / debtValue;
    marketPriceX = auction.startTime + midPoint + (1 - percentDebtToRepay) * (duration - midPoint);
    marketPriceY = percentDebtToRepay * maxDebt;
  }

  const state = {
    series: [
      {
        name: 'Debt Asked',
        type: 'line',
        data: debtData
      },
      {
        name: 'Collateral Offered',
        type: 'line',
        data: collData
      }
    ],
    options: {
      annotations: {
        xaxis: annotations,
        points: [
          {
            x: marketPriceX,
            y: marketPriceY,
            marker: {
              size: 3
            },
            label: {
              text: 'Market Price'
            }
          }
        ]
      },
      colors: ['#bf1111', '#008FFB'],
      chart: {
        height: 350,
        type: 'line',
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      legend: {
        show: false
      },
      tooltip: {
        // y: {
        //   formatter: (val) => val + "%",
        // },
        custom: function ({ series, seriesIndex, dataPointIndex, w }) {
          const price = debtData[dataPointIndex][1] / collData[dataPointIndex][1];

          return (
            "<div class='custom-apex-tooltip'>" +
            moment(xData[dataPointIndex]).format('YYYY-MM-DD HH:mm') +
            "<hr style='margin:5px 0'/>" +
            '<ul>' +
            '<li><b>Collateral Offered</b>: ' +
            formatDecimal(collData[dataPointIndex][1], collateralTokenDecimalsToDisplay) +
            ' ' +
            collateralToken.symbol +
            '</li>' +
            '<li><b>Debt Asked</b>: ' +
            formatDecimal(debtData[dataPointIndex][1], pegTokenDecimalsToDisplay) +
            ' ' +
            pegTokenSymbol +
            '</li>' +
            '<li><b>Inferred Collateral Price</b>: ' +
            formatDecimal(price, pegTokenDecimalsToDisplay) +
            ' ' +
            pegTokenSymbol +
            '/' +
            collateralToken.symbol +
            '</li>' +
            '</ul>' +
            '</div>'
          );
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight'
      },
      xaxis: {
        type: 'datetime',
        tooltip: {
          enabled: false
        },
        labels: {
          formatter: function (x) {
            return moment(x).format('YYYY-MM-DD HH:mm');
          }
        }
      },
      yaxis: [
        {
          seriesName: 'Debt Asked',
          min: 0,
          max: maxDebt,
          opposite: true,
          title: {
            text: 'Debt Asked',
            style: {
              color: '#bf1111'
            }
          },
          labels: {
            formatter: function (x) {
              return formatDecimal(x, pegTokenDecimalsToDisplay);
            }
          }
        },
        {
          seriesName: 'Collateral Offered',
          min: 0,
          max: maxCollateral,
          title: {
            text: 'Collateral Offered',
            style: {
              color: '#008FFB'
            }
          },
          labels: {
            formatter: function (x) {
              return formatDecimal(x, collateralTokenDecimalsToDisplay);
            }
          }
        }
      ]
    }
  };

  return (
    <div>
      <ApexChartWrapper options={state.options} series={state.series} type="line" height={350} />
    </div>
  );
}
