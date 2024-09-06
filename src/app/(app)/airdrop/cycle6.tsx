'use client';
import React from 'react';
import Card from 'components/card';

function AirdropCycle6() {
  return (
    <Card title="" extra="w-full mb-2 md:col-span-1 sm:overflow-auto px-3 py-2 sm:px-6 sm:py-4">
      <h3 className="mb-2">
        <span className="text-bold text-xl">Cycle 6 (2024-09-06 → 2024-10-04)</span>
        <span className="ml-2 inline-block rounded-md bg-gray-100 px-1 py-0.5 align-middle align-text-bottom font-mono text-xs text-gray-700 ring-1 ring-inset ring-gray-200 transition-all duration-150 ease-in-out">
          in progress
        </span>
      </h3>

      <p className="mb-1 italic opacity-50">In this epoch, rewards are computed in a similar fashion to Cycle 5.</p>
    </Card>
  );
}

export default AirdropCycle6;
