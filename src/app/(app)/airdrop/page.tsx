'use client';

import React, { useState } from 'react';
import AirdropCycle1 from './cycle1';
import AirdropCycle2 from './cycle2';
import AirdropCycle3 from './cycle3';
import AirdropCycle4 from './cycle4';
import AirdropCycle5 from './cycle5';

function Airdrop() {
  const [showPastRounds, setShowPastRounds] = useState(false);

  return (
    <div>
      <AirdropCycle5 />
      <AirdropCycle4 />
      {showPastRounds ? (
        <div>
          <AirdropCycle3 />
          <AirdropCycle2 />
          <AirdropCycle1 />
        </div>
      ) : (
        <div
          className="p1 mb-3 mt-3 cursor-pointer text-center dark:text-white"
          onClick={() => setShowPastRounds(true)}
        >
          Display past airdrop rounds
        </div>
      )}
    </div>
  );
}

export default Airdrop;
