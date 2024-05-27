'use client';

import { useCallback, useEffect } from 'react';
import { useUserPrefsStore } from 'store';

export default function KBarWrapper({ children }: { children: React.ReactNode }) {
  const { setSearchFocused } = useUserPrefsStore();

  const handleKeyPress = useCallback((event) => {
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      setSearchFocused(true);
      document.getElementById('searchAddressBar').focus();
    }
    if (event.key === 'Escape') {
      setSearchFocused(false);
      document.getElementById('searchAddressBar').blur();
    }
  }, []);

  useEffect(() => {
    document.getElementById('searchAddressBar').addEventListener('focus', (event) => {
      setSearchFocused(true);
    });
    document.getElementById('searchAddressBar').addEventListener('blur', (event) => {
      setSearchFocused(false);
    });
  }, []);

  useEffect(() => {
    // attach the event listener
    document.addEventListener('keydown', handleKeyPress);

    // remove the event listener
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return <>{children}</>;
}
