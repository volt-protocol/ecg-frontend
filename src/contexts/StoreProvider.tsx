'use client';

import Spinner from 'components/spinner';
import { useEffect, useState } from 'react';
import { useAppStore } from 'store';

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const {
    fetchAuctions,
    fetchLendingTerms,
    fetchCoins,
    fetchHistoricalData,
    fetchContractsList,
    appMarketId,
    appChainId,
    contractsList
  } = useAppStore();

  //Note: when several chains will be supported, reload the data when the appChainId changes
  useEffect(() => {
    const asyncFunc = async () => {
      setIsLoading(true);
      console.log('store provider', appChainId);
      await Promise.all([
        fetchCoins(appMarketId, appChainId),
        fetchHistoricalData(appMarketId, appChainId),
        fetchContractsList(appChainId),
        fetchLendingTerms(appMarketId, appChainId),
        fetchAuctions(appMarketId, appChainId)
      ]);
      setIsLoading(false);
    };

    asyncFunc();
  }, [appMarketId, appChainId]);

  //make sure we have the contracts list before rendering the children
  if (isLoading) {
    return (
      <div className="absolute bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2 transform">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
};

export default StoreProvider;
