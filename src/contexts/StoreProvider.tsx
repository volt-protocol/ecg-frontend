'use client';

import Spinner from 'components/spinner';
import { useEffect, useState } from 'react';
import { useAppStore, useUserPrefsStore } from 'store';

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { appMarketId, appChainId } = useUserPrefsStore();

  const {
    fetchAuctions,
    fetchLendingTerms,
    fetchLoans,
    fetchCoins,
    fetchHistoricalData,
    fetchContractsList,
    fetchProtocolData,
    fetchAirdropData,
    fetchProposals
  } = useAppStore();

  //Note: when several chains will be supported, reload the data when the appChainId changes
  useEffect(() => {
    const asyncFunc = async () => {
      setIsLoading(true);
      const contractsList = await fetchContractsList(appChainId);
      await Promise.all([
        fetchCoins(appMarketId, appChainId),
        fetchHistoricalData(appMarketId, appChainId),
        fetchLendingTerms(appMarketId, appChainId),
        fetchLoans(appMarketId, appChainId),
        fetchAuctions(appMarketId, appChainId),
        fetchProposals(appMarketId, appChainId),
        fetchProtocolData(appMarketId, appChainId, contractsList),
        fetchAirdropData(appChainId)
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
