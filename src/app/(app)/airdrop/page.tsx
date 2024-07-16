'use client';

import React from 'react';
import AirdropCycle1 from './cycle1';
import AirdropCycle2 from './cycle2';
import AirdropCycle3 from './cycle3';
import AirdropCycle4 from './cycle4';

function Airdrop() {
  return (
    <div>
      <AirdropCycle4 />
      <AirdropCycle3 />
      <AirdropCycle2 />
      <AirdropCycle1 />
    </div>
  );
}

export default Airdrop;
