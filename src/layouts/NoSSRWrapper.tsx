import React from 'react';
import dynamic from 'next/dynamic';

const _NoSSR = ({ children }) => <React.Fragment>{children}</React.Fragment>;

const NoSSRWrapper = dynamic(() => Promise.resolve(_NoSSR), {
  ssr: false
});

export default NoSSRWrapper;
